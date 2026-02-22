// Card management commands
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub deck_id: String,
    pub front: String,
    pub back: String,
    pub source: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CardSchedulingState {
    pub card_id: String,
    pub algorithm: String,
    pub ease_factor: f64,
    pub interval: i32,
    pub due: String,
    pub repetitions: i32,
    pub lapses: i32,
    pub last_review: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCardInput {
    pub deck_id: String,
    pub front: String,
    pub back: String,
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCardInput {
    pub front: Option<String>,
    pub back: Option<String>,
}

#[tauri::command]
pub fn create_card(input: CreateCardInput) -> Result<Card, String> {
    // TODO: Implement with DB
    Ok(Card {
        id: "mock-card-id".to_string(),
        deck_id: input.deck_id,
        front: input.front,
        back: input.back,
        source: input.source.unwrap_or_else(|| "default".to_string()),
        created_at: "2026-02-21T00:00:00Z".to_string(),
        updated_at: "2026-02-21T00:00:00Z".to_string(),
    })
}

#[tauri::command]
pub fn get_cards(deck_id: String) -> Result<Vec<Card>, String> {
    // TODO: Implement with DB
    let _ = deck_id;
    Ok(vec![])
}

#[tauri::command]
pub fn update_card(id: String, input: UpdateCardInput) -> Result<Card, String> {
    // TODO: Implement with DB
    Ok(Card {
        id,
        deck_id: "mock-deck-id".to_string(),
        front: input.front.unwrap_or_default(),
        back: input.back.unwrap_or_default(),
        source: "default".to_string(),
        created_at: "2026-02-21T00:00:00Z".to_string(),
        updated_at: "2026-02-21T00:00:00Z".to_string(),
    })
}

#[tauri::command]
pub fn delete_card(id: String) -> Result<(), String> {
    // TODO: Implement with DB
    let _ = id;
    Ok(())
}
