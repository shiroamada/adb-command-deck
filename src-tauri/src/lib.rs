mod commands;

use commands::device::kill_running_command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::adb::detect_adb,
            commands::adb::validate_adb_path,
            commands::adb::check_daemon_status,
            commands::device::connect_device,
            commands::device::disconnect_device,
            commands::device::execute_command,
            commands::device::get_device_metrics,
            commands::device::check_device_connection,
            commands::device::install_apk,
            kill_running_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
