/**
 * Shared types for OpenAI-compatible chat (NVIDIA NIM / hosted API).
 */

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type RandomSessionPayload = {
  sessionId: string;
  ko_number: string;
  displayName: string;
  issueSummary: string;
  fmno: string;
};

export type TranscriptRole = "technician" | "customer" | "mentor";

export type TranscriptLine = {
  role: TranscriptRole;
  content: string;
};

export type LlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ChatCompletionOptions = {
  temperature?: number;
  /** Omit from request when `null` (server / model default max output — e.g. Persona B mentor on Ollama). */
  max_tokens?: number | null;
  signal?: AbortSignal;
  /** Gemini: request JSON output (evaluator). */
  jsonMode?: boolean;
};

export type ChatCompletionResult = {
  content: string;
  raw: unknown;
};

export type LlmProvider = "gemini" | "openai";

export type GeminiConfig = {
  apiKey: string;
  model: string;
};
