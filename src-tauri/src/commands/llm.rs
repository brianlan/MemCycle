// LLM commands
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedDefinition {
    pub front: String,
    pub back: String,
    pub source: String,
}

#[derive(Debug, Deserialize)]
pub struct GenerateDefinitionInput {
    pub term: String,
    pub context: Option<String>,
}

#[tauri::command]
pub fn generate_definition(input: GenerateDefinitionInput) -> Result<GeneratedDefinition, String> {
    // TODO: Implement with LLM API
    let _ = input.context;
    Ok(GeneratedDefinition {
        front: input.term,
        back: "Mock definition from LLM".to_string(),
        source: "llm".to_string(),
    })
}
