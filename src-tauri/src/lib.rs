// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_sql::{Migration, MigrationKind};

mod commands;
mod popup;
mod timer;
mod tray;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_schema",
        sql: include_str!("../migrations/0001_init.up.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(popup::PopupState::default())
        .manage(timer::TimerState::default())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:app.db", get_migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::AppleScript,
            None,
        ))
        .setup(|app| {
            // Configure app to NOT appear in Dock (macOS only)
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            tray::setup_tray(&app.handle())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::deck::create_deck,
            commands::deck::get_decks,
            commands::deck::update_deck,
            commands::deck::delete_deck,
            commands::card::create_card,
            commands::card::get_cards,
            commands::card::update_card,
            commands::card::delete_card,
            commands::review::get_due_cards,
            commands::review::submit_review,
            commands::review::record_no_response,
            commands::settings::get_settings,
            commands::settings::update_setting,
            commands::export::export_data,
            commands::export::import_data,
            commands::export::select_export_path,
            commands::export::select_import_path,
            commands::export::write_export_file,
            commands::export::read_import_file,
            commands::llm::generate_definition,
            popup::show_popup,
            popup::hide_popup,
            popup::is_popup_visible,
            timer::start_timer,
            timer::stop_timer,
            timer::reset_timer,
            timer::get_time_until_next,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
