/**
 * Google Gemini `generateContent` REST API (v1beta).
 */
import type {
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatMessage,
  GeminiConfig,
} from "./types.js";

function buildGeminiPayload(
  messages: ChatMessage[],
  options: ChatCompletionOptions,
): Record<string, unknown> {
  const systemChunks: string[] = [];
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemChunks.push(m.content);
    } else if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      contents.push({ role: "model", parts: [{ text: m.content }] });
    }
  }

  const gen: Record<string, unknown> = {
    temperature: options.temperature ?? 0.4,
  };
  if (options.max_tokens !== null) {
    gen.maxOutputTokens = options.max_tokens ?? 2048;
  } else {
    gen.maxOutputTokens = 8192;
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: gen,
  };

  if (systemChunks.length > 0) {
    body.systemInstruction = {
      parts: [{ text: systemChunks.join("\n\n") }],
    };
  }

  if (options.jsonMode) {
    (body.generationConfig as Record<string, unknown>).responseMimeType =
      "application/json";
  }

  return body;
}

function extractGeminiText(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const cands = (raw as { candidates?: unknown }).candidates;
  if (!Array.isArray(cands) || cands.length === 0) return null;
  const parts = (cands[0] as { content?: { parts?: unknown } })?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const texts: string[] = [];
  for (const p of parts) {
    if (typeof p === "object" && p !== null && "text" in p && typeof (p as { text: unknown }).text === "string") {
      texts.push((p as { text: string }).text);
    }
  }
  const joined = texts.join("").trim();
  return joined || null;
}

export async function geminiGenerate(
  config: GeminiConfig,
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<ChatCompletionResult> {
  const model = encodeURIComponent(config.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  const body = buildGeminiPayload(messages, options);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const raw = (await res.json()) as unknown;
  if (!res.ok) {
    const detail =
      typeof raw === "object" && raw !== null && "error" in raw
        ? JSON.stringify((raw as { error: unknown }).error)
        : JSON.stringify(raw);
    throw new Error(`Gemini request failed (${res.status}): ${detail}`);
  }

  const content = extractGeminiText(raw);
  if (content === null) {
    const block =
      typeof raw === "object" && raw !== null && "promptFeedback" in raw
        ? JSON.stringify((raw as { promptFeedback: unknown }).promptFeedback)
        : "";
    throw new Error(
      `Unexpected Gemini response shape: ${JSON.stringify(raw).slice(0, 800)}${block ? ` promptFeedback: ${block}` : ""}`,
    );
  }
  return { content, raw };
}
