// Review session commands
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DueCard {
    pub card: super::card::Card,
    pub scheduling: super::card::CardSchedulingState,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReviewLog {
    pub id: String,
    pub card_id: String,
    pub rating: i32,
    pub elapsed_ms: i64,
    pub reviewed_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SubmitReviewInput {
    pub card_id: String,
    pub rating: i32,
    pub elapsed_ms: i64,
}

#[tauri::command]
pub fn get_due_cards(deck_id: String) -> Result<Vec<DueCard>, String> {
    // TODO: Implement with DB
    let _ = deck_id;
    Ok(vec![])
}

#[tauri::command]
pub fn submit_review(input: SubmitReviewInput) -> Result<ReviewLog, String> {
    // TODO: Implement with DB
    Ok(ReviewLog {
        id: "mock-review-id".to_string(),
        card_id: input.card_id,
        rating: input.rating,
        elapsed_ms: input.elapsed_ms,
        reviewed_at: "2026-02-21T00:00:00Z".to_string(),
    })
}

#[tauri::command]
pub fn record_no_response(card_id: String) -> Result<ReviewLog, String> {
    // TODO: Implement with DB
    Ok(ReviewLog {
        id: "mock-review-id".to_string(),
        card_id,
        rating: 0,
        elapsed_ms: 0,
        reviewed_at: "2026-02-21T00:00:00Z".to_string(),
    })
}
