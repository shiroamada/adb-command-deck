use serde::Serialize;
use std::env;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;

static ADB_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn get_adb_path() -> PathBuf {
    ADB_PATH.lock().unwrap().clone().unwrap_or_else(|| PathBuf::from("adb"))
}

pub fn set_adb_path(path: PathBuf) {
    *ADB_PATH.lock().unwrap() = Some(path);
}

#[derive(Debug, Serialize, Clone)]
pub struct AdbInfo {
    pub path: String,
    pub version: String,
    pub is_valid: bool,
}

#[derive(Debug, Serialize)]
pub struct CommandResult<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
}

impl<T> CommandResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            error_code: None,
        }
    }

    pub fn err(message: impl Into<String>, code: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.into()),
            error_code: Some(code.into()),
        }
    }
}

fn get_default_adb_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let home = env::var("HOME").unwrap_or_default();

    #[cfg(target_os = "macos")]
    {
        paths.push(PathBuf::from("/usr/local/bin/adb"));
        paths.push(PathBuf::from("/opt/homebrew/bin/adb"));
        if !home.is_empty() {
            paths.push(PathBuf::from(format!(
                "{}/Library/Android/sdk/platform-tools/adb",
                home
            )));
        }
    }

    #[cfg(target_os = "linux")]
    {
        paths.push(PathBuf::from("/usr/bin/adb"));
        paths.push(PathBuf::from("/usr/local/bin/adb"));
        if !home.is_empty() {
            paths.push(PathBuf::from(format!(
                "{}/Android/Sdk/platform-tools/adb",
                home
            )));
            paths.push(PathBuf::from(format!(
                "{}/android-sdk/platform-tools/adb",
                home
            )));
        }
    }

    #[cfg(target_os = "windows")]
    {
        let userprofile = env::var("USERPROFILE").unwrap_or_default();
        paths.push(PathBuf::from(
            "C:\\Users\\Public\\Android\\sdk\\platform-tools\\adb.exe",
        ));
        paths.push(PathBuf::from("C:\\Android\\sdk\\platform-tools\\adb.exe"));
        if !userprofile.is_empty() {
            paths.push(PathBuf::from(format!(
                "{}\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe",
                userprofile
            )));
        }
    }

    paths
}

fn find_adb_in_path() -> Option<PathBuf> {
    which::which("adb").ok()
}

fn check_android_sdk_env() -> Option<PathBuf> {
    let sdk_paths = ["ANDROID_HOME", "ANDROID_SDK_ROOT", "ANDROID_SDK"];
    for var in sdk_paths {
        if let Ok(sdk) = env::var(var) {
            let adb_path = PathBuf::from(sdk).join("platform-tools").join("adb");
            if adb_path.exists() {
                return Some(adb_path);
            }
            // Try without extension on Windows
            #[cfg(target_os = "windows")]
            {
                let adb_path_no_ext = PathBuf::from(sdk).join("platform-tools").join("adb.exe");
                if adb_path_no_ext.exists() {
                    return Some(adb_path_no_ext);
                }
            }
        }
    }
    None
}

fn validate_adb_binary(path: &PathBuf) -> Result<AdbInfo, String> {
    let output = Command::new(path)
        .arg("version")
        .output()
        .map_err(|e| format!("Failed to execute ADB: {}", e))?;

    if !output.status.success() {
        return Err("ADB version check failed".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let version = stdout
        .lines()
        .find(|line| line.contains("Version"))
        .map(|line| line.split_whitespace().last().unwrap_or("unknown").to_string())
        .unwrap_or_else(|| "unknown".to_string());

    Ok(AdbInfo {
        path: path.to_string_lossy().to_string(),
        version,
        is_valid: true,
    })
}

// Internal function that returns AdbInfo directly (not wrapped in CommandResult)
// Used by other Rust functions that need the adb path
pub async fn detect_adb_internal() -> Result<AdbInfo, String> {
    // Try environment variable first
    if let Some(path) = check_android_sdk_env() {
        if let Ok(info) = validate_adb_binary(&path) {
            return Ok(info);
        }
    }

    // Try PATH
    if let Some(path) = find_adb_in_path() {
        if let Ok(info) = validate_adb_binary(&path) {
            return Ok(info);
        }
    }

    // Try default locations
    for path in get_default_adb_paths() {
        if path.exists() {
            if let Ok(info) = validate_adb_binary(&path) {
                return Ok(info);
            }
        }
    }

    Err("ADB not found".to_string())
}

#[tauri::command]
pub async fn detect_adb() -> Result<CommandResult<AdbInfo>, String> {
    match detect_adb_internal().await {
        Ok(info) => {
            set_adb_path(PathBuf::from(&info.path));
            Ok(CommandResult::ok(info))
        }
        Err(e) => Ok(CommandResult::err(
            e,
            "ADB_NOT_FOUND",
        )),
    }
}

#[tauri::command]
pub async fn validate_adb_path(path: String) -> Result<CommandResult<AdbInfo>, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Ok(CommandResult::<AdbInfo>::err(
            "The specified path does not exist.",
            "PATH_NOT_FOUND",
        ));
    }

    match validate_adb_binary(&path_buf) {
        Ok(info) => {
            set_adb_path(path_buf);
            Ok(CommandResult::ok(info))
        }
        Err(e) => Ok(CommandResult::<AdbInfo>::err(
            format!("Invalid ADB binary: {}", e),
            "INVALID_BINARY",
        )),
    }
}

#[derive(Debug, Serialize)]
pub enum DaemonStatus {
    Running,
    Stopped,
    Starting,
    Error,
}

impl DaemonStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            DaemonStatus::Running => "Running",
            DaemonStatus::Stopped => "Stopped",
            DaemonStatus::Starting => "Starting",
            DaemonStatus::Error => "Error",
        }
    }
}

#[tauri::command]
pub async fn check_daemon_status() -> Result<CommandResult<DaemonStatus>, String> {
    // First check if adb is available
    let adb_result = detect_adb_internal().await;

    if adb_result.is_err() {
        return Ok(CommandResult::err(
            "ADB not available",
            "ADB_NOT_AVAILABLE",
        ));
    }

    // Use the full path from detected adb and store it globally
    let adb_info = adb_result.unwrap();
    let adb_executable = PathBuf::from(&adb_info.path);
    set_adb_path(adb_executable.clone());

    // Run adb get-state to check daemon status
    let output = Command::new(&adb_executable)
        .args(["get-state"])
        .output()
        .map_err(|e| format!("Failed to check daemon: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let state = stdout.trim();

    match state {
        "device" => Ok(CommandResult::ok(DaemonStatus::Running)),
        "offline" => Ok(CommandResult::ok(DaemonStatus::Stopped)),
        "no device" => Ok(CommandResult::ok(DaemonStatus::Stopped)),
        _ => {
            if stderr.contains("daemon not running") {
                Ok(CommandResult::ok(DaemonStatus::Stopped))
            } else if stderr.contains("starting") {
                Ok(CommandResult::ok(DaemonStatus::Starting))
            } else {
                Ok(CommandResult::ok(DaemonStatus::Error))
            }
        }
    }
}
