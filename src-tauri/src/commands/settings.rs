// Settings commands
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub settings: Vec<Setting>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingInput {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    // TODO: Implement with DB
    Ok(Settings { settings: vec![] })
}

#[tauri::command]
pub fn update_setting(input: UpdateSettingInput) -> Result<Setting, String> {
    // TODO: Implement with DB
    Ok(Setting {
        key: input.key,
        value: input.value,
    })
}
