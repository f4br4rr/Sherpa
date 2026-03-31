import type { GeminiConfig, LlmConfig, LlmProvider } from "./types.js";

const DEFAULT_OPENAI_BASE = "https://integrate.api.nvidia.com/v1";
const DEFAULT_OPENAI_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const DEFAULT_OLLAMA_BASE = "http://localhost:11434/v1";
const DEFAULT_OLLAMA_MODEL = "qwen3";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

/**
 * True when the OpenAI-compatible base URL points at local Ollama (`ollama serve`, port 11434).
 */
export function isLocalOllamaBaseUrl(baseUrl: string): boolean {
  try {
    const normalized = baseUrl.includes("://") ? baseUrl : `http://${baseUrl}`;
    const u = new URL(normalized);
    const hostOk = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    const portOk = port === "11434";
    return hostOk && portOk;
  } catch {
    return false;
  }
}

/**
 * Which backend to use. When unset: prefer NVIDIA (OpenAI-compatible) if
 * `SHERPA_NVIDIA_API_KEY` / `SHERPA_LLM_API_KEY` is set; else Gemini if
 * `GEMINI_API_KEY` / `GOOGLE_API_KEY` is set; else OpenAI path (missing key → assert error).
 */
export function getLlmProvider(): LlmProvider {
  const explicit = process.env.SHERPA_LLM_PROVIDER?.trim().toLowerCase();
  if (explicit === "gemini" || explicit === "google") return "gemini";
  if (explicit === "ollama") return "openai";
  if (
    explicit === "nvidia" ||
    explicit === "openai" ||
    explicit === "integrate"
  ) {
    return "openai";
  }
  const nvidiaKey =
    process.env.SHERPA_NVIDIA_API_KEY?.trim() ||
    process.env.SHERPA_LLM_API_KEY?.trim();
  if (nvidiaKey) return "openai";
  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (geminiKey) return "gemini";
  return "openai";
}

/** OpenAI-compatible (NVIDIA integrate, Ollama, etc.) */
export function getOpenAiLlmConfig(): LlmConfig {
  const explicit = process.env.SHERPA_LLM_PROVIDER?.trim().toLowerCase();
  const apiKey =
    process.env.SHERPA_NVIDIA_API_KEY?.trim() ||
    process.env.SHERPA_LLM_API_KEY?.trim() ||
    "";

  const baseFromEnv =
    process.env.SHERPA_NVIDIA_BASE_URL?.trim() ||
    process.env.SHERPA_LLM_BASE_URL?.trim();

  let baseUrl: string;
  if (baseFromEnv) {
    baseUrl = baseFromEnv.replace(/\/$/, "");
  } else if (explicit === "ollama") {
    baseUrl = DEFAULT_OLLAMA_BASE;
  } else {
    baseUrl = DEFAULT_OPENAI_BASE;
  }

  const modelFromEnv =
    process.env.SHERPA_NVIDIA_MODEL?.trim() ||
    process.env.SHERPA_LLM_MODEL?.trim() ||
    process.env.OLLAMA_MODEL?.trim() ||
    "";

  let model: string;
  if (modelFromEnv) {
    model = modelFromEnv;
  } else if (explicit === "ollama" || isLocalOllamaBaseUrl(baseUrl)) {
    model = DEFAULT_OLLAMA_MODEL;
  } else {
    model = DEFAULT_OPENAI_MODEL;
  }

  return { baseUrl, apiKey, model };
}

export function getGeminiConfig(): GeminiConfig {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    "";
  const model =
    process.env.GEMINI_MODEL?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL;
  return { apiKey, model };
}

export function assertLlmConfigured(): void {
  if (getLlmProvider() === "gemini") {
    if (!getGeminiConfig().apiKey) {
      throw new Error(
        "Missing Gemini API key: set GEMINI_API_KEY or GOOGLE_API_KEY (or SHERPA_LLM_PROVIDER=openai for NVIDIA).",
      );
    }
    return;
  }
  const open = getOpenAiLlmConfig();
  if (open.apiKey) return;
  if (isLocalOllamaBaseUrl(open.baseUrl)) return;
  throw new Error(
    "Missing API key: set SHERPA_NVIDIA_API_KEY (or SHERPA_LLM_API_KEY) for hosted inference, use SHERPA_LLM_PROVIDER=ollama with local Ollama, or set GEMINI_API_KEY for Gemini.",
  );
}

/** @deprecated use getOpenAiLlmConfig */
export function getLlmConfig(): LlmConfig {
  return getOpenAiLlmConfig();
}
