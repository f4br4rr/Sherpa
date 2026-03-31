/**
 * Mentor-only corpus operations with EvidenceEvent logging (Phase 3).
 * Same logical behavior as the corpus MCP stdio server; invoked from Electron main / IPC, not Persona A.
 */
import { randomUUID } from "node:crypto";
import {
  assertValidKoNumber,
  defaultCorpusRoot,
  loadCorpusIndex,
  type KoJson,
} from "../corpus/loadCorpusIndex.js";
import { getActiveSessionId } from "../evidence/activeSession.js";
import { evidenceStore } from "../evidence/evidenceStore.js";
import type { EvidenceEvent } from "../evidence/types.js";

const SEARCH_LIMIT_DEFAULT = 15;
const SEARCH_LIMIT_MAX = 50;

function nowIso(): string {
  return new Date().toISOString();
}

function sessionIdForEvent(): string {
  return getActiveSessionId() ?? "no-active-session";
}

function appendEvent(event: Omit<EvidenceEvent, "createdAt"> & { createdAt?: string }): void {
  const full: EvidenceEvent = {
    ...event,
    createdAt: event.createdAt ?? nowIso(),
  };
  evidenceStore.append(full);
}

/**
 * Load one KO by id (mentor/evaluator ground truth). Logs EvidenceEvent `get_ko`.
 */
export async function mentorGetKo(ko_number: string): Promise<KoJson> {
  const sessionId = sessionIdForEvent();
  const eventId = randomUUID();
  const toolInput: Record<string, unknown> = { ko_number };

  try {
    assertValidKoNumber(ko_number);
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    appendEvent({
      eventId: randomUUID(),
      sessionId,
      toolName: "get_ko",
      toolInput,
      toolOutput: null,
      error: err,
    });
    throw e;
  }

  const index = await loadCorpusIndex(defaultCorpusRoot());
  const ko = index.get(ko_number);
  if (!ko) {
    const msg = `KO not found: ${ko_number}`;
    appendEvent({
      eventId,
      sessionId,
      toolName: "get_ko",
      toolInput,
      toolOutput: null,
      error: msg,
    });
    throw new Error(msg);
  }

  appendEvent({
    eventId,
    sessionId,
    toolName: "get_ko",
    toolInput,
    toolOutput: { ko: ko as Record<string, unknown> },
    retrievedKoNumber: ko_number,
  });
  return ko;
}

export type SearchKbHit = { ko_number: string; preview: string };

/**
 * Substring search across serialized KOs. Logs EvidenceEvent `search_kb`.
 */
export async function mentorSearchKb(
  query: string,
  limit: number = SEARCH_LIMIT_DEFAULT,
): Promise<{ hits: SearchKbHit[]; query: string; limit: number }> {
  const sessionId = sessionIdForEvent();
  const eventId = randomUUID();
  const cap = Math.min(Math.max(1, limit), SEARCH_LIMIT_MAX);
  const toolInput: Record<string, unknown> = { query, limit: cap };

  const q = query.trim().toLowerCase();
  if (!q) {
    const out = { hits: [] as SearchKbHit[], query, limit: cap };
    appendEvent({
      eventId,
      sessionId,
      toolName: "search_kb",
      toolInput,
      toolOutput: { hits: [], query, limit: cap },
    });
    return out;
  }

  const index = await loadCorpusIndex(defaultCorpusRoot());
  const hits: SearchKbHit[] = [];
  for (const [id, ko] of index) {
    const blob = JSON.stringify(ko).toLowerCase();
    if (!blob.includes(q)) continue;
    const subject = typeof ko.subject === "string" ? ko.subject : "";
    hits.push({ ko_number: id, preview: subject.slice(0, 240) });
    if (hits.length >= cap) break;
  }

  const out = { hits, query, limit: cap };
  appendEvent({
    eventId,
    sessionId,
    toolName: "search_kb",
    toolInput,
    toolOutput: {
      hits: out.hits.map((h) => ({ ko_number: h.ko_number, preview: h.preview })),
      query,
      limit: cap,
    },
  });
  return out;
}
