mod commands;

use commands::{
    adb::{check_daemon_status, detect_adb, validate_adb_path},
    device::{check_device_connection, connect_device, disconnect_device, execute_command, get_device_metrics, install_apk},
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            detect_adb,
            validate_adb_path,
            check_daemon_status,
            connect_device,
            disconnect_device,
            execute_command,
            get_device_metrics,
            check_device_connection,
            install_apk,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
