// Deck management commands
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateDeckInput {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDeckInput {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[tauri::command]
pub fn create_deck(input: CreateDeckInput) -> Result<Deck, String> {
    // TODO: Implement with DB
    Ok(Deck {
        id: "mock-deck-id".to_string(),
        name: input.name,
        description: input.description,
        created_at: "2026-02-21T00:00:00Z".to_string(),
        updated_at: "2026-02-21T00:00:00Z".to_string(),
    })
}

#[tauri::command]
pub fn get_decks() -> Result<Vec<Deck>, String> {
    // TODO: Implement with DB
    Ok(vec![])
}

#[tauri::command]
pub fn update_deck(id: String, input: UpdateDeckInput) -> Result<Deck, String> {
    // TODO: Implement with DB
    Ok(Deck {
        id,
        name: input.name.unwrap_or_default(),
        description: input.description,
        created_at: "2026-02-21T00:00:00Z".to_string(),
        updated_at: "2026-02-21T00:00:00Z".to_string(),
    })
}

#[tauri::command]
pub fn delete_deck(id: String) -> Result<(), String> {
    // TODO: Implement with DB
    let _ = id;
    Ok(())
}
