import { geminiGenerate } from "./geminiClient.js";
import {
  assertLlmConfigured,
  getGeminiConfig,
  getLlmProvider,
  getOpenAiLlmConfig,
} from "./env.js";
import type {
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatMessage,
  LlmConfig,
} from "./types.js";

export type { ChatCompletionOptions, ChatCompletionResult } from "./types.js";

/**
 * Routes to Gemini or OpenAI-compatible (NVIDIA) inference per `SHERPA_LLM_PROVIDER` / keys.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult> {
  assertLlmConfigured();
  const provider = getLlmProvider();
  if (provider === "gemini") {
    return geminiGenerate(getGeminiConfig(), messages, options);
  }
  return openAiChatCompletion(getOpenAiLlmConfig(), messages, options);
}

/**
 * OpenAI-compatible `POST /v1/chat/completions` (NVIDIA hosted NIM uses the same shape).
 */
async function openAiChatCompletion(
  config: LlmConfig,
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult> {
  const url = `${config.baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.4,
  };
  if (options.max_tokens === null) {
    /* no max_tokens — OpenAI-compatible servers (e.g. Ollama) use model/server default */
  } else {
    body.max_tokens = options.max_tokens ?? 2048;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const raw = (await res.json()) as unknown;
  if (!res.ok) {
    const detail =
      typeof raw === "object" && raw !== null && "error" in raw
        ? JSON.stringify((raw as { error: unknown }).error)
        : JSON.stringify(raw);
    throw new Error(`LLM request failed (${res.status}): ${detail}`);
  }

  const content = extractAssistantText(raw);
  if (content === null) {
    throw new Error(`Unexpected chat completion shape: ${JSON.stringify(raw).slice(0, 500)}`);
  }
  return { content, raw };
}

/**
 * Reads assistant text from OpenAI-shaped completions.
 * Ollama + Qwen3 may leave `content` empty and put chain-of-thought in `reasoning`.
 */
export function extractAssistantText(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const choices = (raw as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const msg = (choices[0] as {
    message?: {
      content?: unknown;
      reasoning?: unknown;
      reasoning_content?: unknown;
    };
  })?.message;
  if (!msg) return null;

  const fromContent = normalizeMessageText(msg.content);
  if (fromContent) return fromContent;

  const fromReasoning = normalizeMessageText(msg.reasoning);
  if (fromReasoning) return fromReasoning;

  const fromReasoningContent = normalizeMessageText(msg.reasoning_content);
  if (fromReasoningContent) return fromReasoningContent;

  return null;
}

function normalizeMessageText(part: unknown): string | null {
  if (typeof part === "string") {
    const t = part.trim();
    return t || null;
  }
  if (Array.isArray(part)) {
    const joined = part
      .map((p) => {
        if (typeof p === "object" && p !== null && "text" in p) {
          return String((p as { text: unknown }).text ?? "");
        }
        return typeof p === "string" ? p : "";
      })
      .join("");
    const t = joined.trim();
    return t || null;
  }
  return null;
}
