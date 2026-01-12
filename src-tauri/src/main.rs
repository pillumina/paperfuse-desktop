// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Check for --scheduled-fetch flag
    if args.len() > 1 && args[1] == "--scheduled-fetch" {
        // Run as scheduled fetch worker (headless mode)
        if let Err(e) = tauri_app_lib::run_scheduled_fetch() {
            eprintln!("Scheduled fetch failed: {}", e);
            std::process::exit(1);
        }
    } else {
        // Run normal Tauri app
        tauri_app_lib::run();
    }
}
