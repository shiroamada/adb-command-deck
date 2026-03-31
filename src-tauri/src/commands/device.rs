use crate::commands::adb::{detect_adb_internal, get_adb_path, set_adb_path, CommandResult};
use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Window};
use tokio::time::{timeout, Duration};

// Global flag to signal command cancellation
static SHOULD_ABORT: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn kill_running_command() {
    SHOULD_ABORT.store(true, Ordering::Relaxed);
}

#[derive(Debug, Serialize, Clone)]
pub struct DeviceMetrics {
    pub latency_ms: Option<f64>,
    pub cpu_percent: Option<f64>,
    pub memory_mb: Option<f64>,
}

#[tauri::command]
pub async fn connect_device(
    ip: String,
    port: u16,
    window: Window,
) -> Result<CommandResult<()>, String> {
    let device_id = format!("{}:{}", ip, port);

    // Emit connecting status
    let _ = window.emit("device-status", "connecting");

    // Ensure ADB path is detected before attempting connection
    let adb_executable = match detect_adb_internal().await {
        Ok(info) => {
            let path = PathBuf::from(&info.path);
            set_adb_path(path.clone());
            path
        }
        Err(_) => get_adb_path(),
    };

    let connect_future = async {
        // Kill ADB server to reset state
        let _ = Command::new(&adb_executable)
            .args(["kill-server"])
            .output();

        // Start fresh ADB server
        let start_output = Command::new(&adb_executable)
            .args(["start-server"])
            .output()
            .map_err(|e| format!("Failed to start ADB server: {}", e))?;

        let _start_stderr = String::from_utf8_lossy(&start_output.stderr);
        let _start_stdout = String::from_utf8_lossy(&start_output.stdout);

        // Disconnect any existing connection on this port
        let _ = Command::new(&adb_executable)
            .args(["disconnect", &device_id])
            .output();

        // Connect to device
        let connect_output = Command::new(&adb_executable)
            .args(["connect", &device_id])
            .output()
            .map_err(|e| format!("Failed to connect: {}", e))?;

        let stdout = String::from_utf8_lossy(&connect_output.stdout);
        let stderr = String::from_utf8_lossy(&connect_output.stderr);

        if stdout.contains("connected") || stdout.contains("already connected") {
            // Verify connection with multiple get-state attempts
            for _ in 0..3 {
                let state_output = Command::new(&adb_executable)
                    .args(["-s", &device_id, "get-state"])
                    .output();

                if let Ok(state_output) = state_output {
                    let state = String::from_utf8_lossy(&state_output.stdout);
                    let state = state.trim();

                    if state == "device" {
                        let _ = window.emit("device-status", "connected");
                        return Ok::<(), String>(());
                    }
                }
                // Small delay between retries
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
        }

        let error_msg = if stderr.contains("refused") || stdout.contains("refused") {
            "Connection refused. Is the device listening on the specified port?"
        } else if stderr.contains("unauthorized") || stdout.contains("unauthorized") {
            "Device unauthorized. Check the device for authorization prompt."
        } else if stderr.contains("timeout") || stdout.contains("timeout") {
            "Connection timed out. Is the device reachable?"
        } else if stderr.contains("No route to host") || stdout.contains("No route to host") {
            "No route to host. Check if the device IP is correct and reachable."
        } else if !stderr.trim().is_empty() {
            stderr.trim()
        } else if !stdout.trim().is_empty() {
            stdout.trim()
        } else {
            "Failed to connect. Ensure the device has ADB debugging enabled."
        };

        let _ = window.emit("device-status", "error");
        Err(error_msg.to_string())
    };

    match timeout(Duration::from_secs(5), connect_future).await {
        Ok(Ok(())) => Ok(CommandResult::ok(())),
        Ok(Err(err_msg)) => Ok(CommandResult::<()>::err(err_msg, "CONNECTION_FAILED")),
        Err(_) => {
            let _ = window.emit("device-status", "error");
            Ok(CommandResult::<()>::err(
                "Connection timed out after 5 seconds",
                "CONNECTION_TIMEOUT",
            ))
        }
    }
}

#[tauri::command]
pub async fn disconnect_device(
    ip: String,
    port: u16,
    window: Window,
) -> Result<CommandResult<()>, String> {
    let device_id = format!("{}:{}", ip, port);

    let _ = window.emit("device-status", "disconnecting");

    // Ensure ADB path is detected
    let adb_executable = match detect_adb_internal().await {
        Ok(info) => {
            let path = PathBuf::from(&info.path);
            set_adb_path(path.clone());
            path
        }
        Err(_) => get_adb_path(),
    };

    let output = Command::new(&adb_executable)
        .args(["disconnect", &device_id])
        .output()
        .map_err(|e| format!("Failed to disconnect: {}", e))?;

    let _ = window.emit("device-status", "disconnected");

    if output.status.success() {
        Ok(CommandResult::ok(()))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(CommandResult::<()>::err(
            format!("Disconnect failed: {}", stderr.trim()),
            "DISCONNECT_FAILED",
        ))
    }
}

#[tauri::command]
pub async fn execute_command(
    _device_id: String,
    command: String,
    window: Window,
) -> Result<CommandResult<String>, String> {
    // Emit that we're executing
    let _ = window.emit("console-output", format!("[CMD] {}\n", command));

    // Commands are executed locally via shell
    // - {{adb}} prefixed commands: frontend replaces {{adb}} with "adb -s <device>" which
    //   runs locally and connects to device (for chaining multiple adb calls with && or ;)
    // - Other commands (ping, lsof, etc.): run locally for network diagnostics

    // Use Command::output() directly - reliable and captures all output
    let output = std::process::Command::new("sh")
        .args(["-c", &command])
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Stream stdout lines to the console
    for line in stdout.lines() {
        let _ = window.emit("console-output", format!("{}\n", line));
    }

    // grep returns exit code 1 when no matches found - this is normal
    let is_grep_no_match = command.contains("grep") && output.status.code() == Some(1);

    if output.status.success() || is_grep_no_match {
        if is_grep_no_match {
            return Ok(CommandResult::ok(String::from("")));
        }
        return Ok(CommandResult::ok(stdout.to_string()));
    } else {
        let error_msg = if stderr.contains("no device") {
            "Device not connected"
        } else if stderr.contains("not found") || stderr.contains("No such file") {
            "Command not found on device"
        } else if stderr.contains("Permission denied") || stderr.contains("must be root") {
            "Permission denied. Root required for this command."
        } else if stderr.contains("closed") || stderr.contains("offline") {
            "Device disconnected"
        } else if stderr.trim().is_empty() && !stdout.trim().is_empty() {
            // Has stdout but non-zero exit - still success if we got output
            return Ok(CommandResult::ok(stdout.to_string()));
        } else if stderr.trim().is_empty() {
            "Command failed with no output"
        } else {
            stderr.trim()
        };
        let _ = window.emit("console-output", format!("[ERROR] {}\n", error_msg));
        Ok(CommandResult::<String>::err(
            error_msg.to_string(),
            "COMMAND_FAILED",
        ))
    }
}

#[tauri::command]
pub async fn get_device_metrics(
    device_id: String,
) -> Result<CommandResult<DeviceMetrics>, String> {
    // Ensure ADB path is detected
    let adb_executable = match detect_adb_internal().await {
        Ok(info) => {
            let path = PathBuf::from(&info.path);
            set_adb_path(path.clone());
            path
        }
        Err(_) => get_adb_path(),
    };

    let mut metrics = DeviceMetrics {
        latency_ms: None,
        cpu_percent: None,
        memory_mb: None,
    };

    // Get latency via ping
    let ping_output = Command::new(&adb_executable)
        .args(["-s", &device_id, "shell", "ping", "-c", "1", "8.8.8.8"])
        .output();

    if let Ok(output) = ping_output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Parse time from ping output like "time=12.3 ms"
            if let Some(time_str) = stdout.split("time=").nth(1) {
                if let Some(ms) = time_str.split(' ').next() {
                    if let Ok(latency) = ms.parse::<f64>() {
                        metrics.latency_ms = Some(latency);
                    }
                }
            }
        }
    }

    // Get CPU and memory for the package if set
    // This would need package name passed in for accurate metrics
    // For now, return basic device stats
    let top_output = Command::new(&adb_executable)
        .args(["-s", &device_id, "shell", "top", "-n", "1"])
        .output();

    if let Ok(output) = top_output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Parse CPU from top output
            // This is simplified - real implementation would need more parsing
            let lines: Vec<&str> = stdout.lines().collect();
            if lines.len() > 2 {
                // Try to get system CPU from header
                if let Some(cpu_line) = lines.first() {
                    if cpu_line.contains("CPU") {
                        // Parse overall CPU usage
                    }
                }
            }
        }
    }

    Ok(CommandResult::ok(metrics))
}

#[tauri::command]
pub async fn check_device_connection(
    device_id: String,
) -> Result<CommandResult<bool>, String> {
    // Ensure ADB path is detected
    let adb_executable = match detect_adb_internal().await {
        Ok(info) => {
            let path = PathBuf::from(&info.path);
            set_adb_path(path.clone());
            path
        }
        Err(_) => get_adb_path(),
    };

    let output = Command::new(&adb_executable)
        .args(["-s", &device_id, "get-state"])
        .output()
        .map_err(|e| format!("Failed to check device: {}", e))?;

    let state = String::from_utf8_lossy(&output.stdout);
    let state = state.trim();
    let is_connected = state == "device";

    Ok(CommandResult::ok(is_connected))
}

#[tauri::command]
pub async fn install_apk(
    device_id: String,
    apk_path: String,
) -> Result<CommandResult<String>, String> {
    // Ensure ADB path is detected
    let adb_executable = match detect_adb_internal().await {
        Ok(info) => {
            let path = PathBuf::from(&info.path);
            set_adb_path(path.clone());
            path
        }
        Err(_) => get_adb_path(),
    };

    let output = Command::new(&adb_executable)
        .args(["-s", &device_id, "install", "-r", &apk_path])
        .output()
        .map_err(|e| format!("Failed to install APK: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() || stdout.contains("Success") {
        Ok(CommandResult::ok(stdout.to_string()))
    } else {
        Ok(CommandResult::<String>::err(
            stderr.trim().to_string(),
            "INSTALL_FAILED",
        ))
    }
}
