import { getSetting } from "./settingsService";

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMError";
  }
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  error?: {
    message: string;
  };
}

export async function generateDefinition(word: string): Promise<string> {
  const [endpoint, apiKey, template, modelName] = await Promise.all([
    getSetting("llmEndpoint"),
    getSetting("llmApiKey"),
    getSetting("llmPromptTemplate"),
    getSetting("llmModelName"),
  ]);

  if (!apiKey) {
    throw new LLMError("API Key is missing. Please configure it in Settings.");
  }

  if (!endpoint) {
    throw new LLMError("LLM Endpoint is missing. Please configure it in Settings.");
  }

  const prompt = template.replace("{{word}}", word);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as OpenAIResponse;
      throw new LLMError(
        errorData.error?.message || `API request failed with status ${response.status}`
      );
    }

    const data = (await response.json()) as OpenAIResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new LLMError("API returned an empty response.");
    }

    return content;
  } catch (error) {
    if (error instanceof LLMError) {
      throw error;
    }
    throw new LLMError(
      error instanceof Error ? error.message : "An unknown error occurred while calling the LLM API."
    );
  }
}
