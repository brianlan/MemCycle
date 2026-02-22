use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub decks: Vec<super::deck::Deck>,
    pub cards: Vec<super::card::Card>,
    pub review_logs: Vec<super::review::ReviewLog>,
    pub settings: Vec<super::settings::Setting>,
    pub exported_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ImportDataInput {
    pub json_data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub decks_imported: i32,
    pub cards_imported: i32,
    pub review_logs_imported: i32,
}

fn file_path_to_string(file_path: FilePath) -> Result<String, String> {
    match file_path {
        FilePath::Path(path) => Ok(path.to_string_lossy().to_string()),
        FilePath::Url(url) => Ok(url.to_string()),
    }
}

#[tauri::command]
pub fn export_data() -> Result<ExportData, String> {
    // TODO: Implement with DB
    Ok(ExportData {
        decks: vec![],
        cards: vec![],
        review_logs: vec![],
        settings: vec![],
        exported_at: "2026-02-21T00:00:00Z".to_string(),
    })
}

#[tauri::command]
pub fn import_data(input: ImportDataInput) -> Result<ImportResult, String> {
    // TODO: Implement with DB
    let _ = input.json_data;
    Ok(ImportResult {
        decks_imported: 0,
        cards_imported: 0,
        review_logs_imported: 0,
    })
}

#[tauri::command]
pub fn select_export_path(app: AppHandle) -> Result<Option<String>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name("memcycle-export.json")
        .blocking_save_file();

    selected.map(file_path_to_string).transpose()
}

#[tauri::command]
pub fn select_import_path(app: AppHandle) -> Result<Option<String>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    selected.map(file_path_to_string).transpose()
}

#[tauri::command]
pub fn write_export_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|error| format!("Failed to write export file: {error}"))
}

#[tauri::command]
pub fn read_import_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| format!("Failed to read import file: {error}"))
}
