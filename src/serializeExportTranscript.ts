/**
 * Scored vs debug transcript split per project-architecture-and-plan.md §5 Export Rules.
 * Demo JSON field name for messages is `transcript` (§6).
 */

export type AuthorRole = "technician" | "end_user" | "mentor" | "system";

export type RawMessage = {
  messageId?: string;
  authorRole: AuthorRole;
  content: string;
  timestamp: string;
  turnIndex?: number | null;
  appendedDuringIntro?: boolean;
  [key: string]: unknown;
};

export type SerializedScoredMessage = {
  messageId?: string;
  authorRole: AuthorRole;
  content: string;
  timestamp: string;
  turnIndex: number;
};

export type DebugPath1Reason = "invalid_intro_attempt" | "persona_a_intro_recovery";

export type DebugBufferMessage = {
  messageId?: string;
  authorRole: AuthorRole;
  content: string;
  timestamp: string;
  turnIndex: null;
  debugOnly: true;
  reason: DebugPath1Reason | string;
  appendedDuringIntro?: boolean;
};

export type SerializeExportResult = {
  transcript: SerializedScoredMessage[];
  debugBuffer: DebugBufferMessage[];
};

export type SerializeExportOptions = {
  /** If omitted, uses {@link defaultIsValidTechnicianIntro} (heuristic; override in prod). */
  isValidTechnicianIntro?: (message: RawMessage) => boolean;
};

/**
 * Default intro gate: good-faith help-desk opener (aligned with doc “valid introduction” intent).
 * Override with product rules / LLM gate when wired.
 */
export function defaultIsValidTechnicianIntro(message: RawMessage): boolean {
  const t = message.content.trim();
  if (t.length < 15) return false;
  const l = t.toLowerCase();
  const soundsLikeAgent =
    l.includes("technician") ||
    l.includes("help desk") ||
    l.includes("ghd") ||
    (l.includes("i'm") && (l.includes(" it ") || l.startsWith("i'm ")));
  const offersHelp = l.includes("help") || l.includes("assist");
  return soundsLikeAgent && offersHelp;
}

function toScoredRow(message: RawMessage, turnIndex: number): SerializedScoredMessage {
  const row: SerializedScoredMessage = {
    authorRole: message.authorRole,
    content: message.content,
    timestamp: message.timestamp,
    turnIndex,
  };
  if (message.messageId !== undefined) row.messageId = message.messageId;
  return row;
}

function toDebugPath1Row(
  message: RawMessage,
  reason: DebugPath1Reason | string,
): DebugBufferMessage {
  const row: DebugBufferMessage = {
    authorRole: message.authorRole,
    content: message.content,
    timestamp: message.timestamp,
    turnIndex: null,
    debugOnly: true,
    reason,
  };
  if (message.messageId !== undefined) row.messageId = message.messageId;
  if (message.appendedDuringIntro === true) row.appendedDuringIntro = true;
  return row;
}

/**
 * Builds canonical scored `transcript` and Path 1 `debugBuffer` from raw session messages.
 * - Path 1: awaiting first valid technician intro; invalid technician → debug; Persona A recovery → debug.
 * - After first valid technician intro: messages append to scored with contiguous turnIndex (Removal 1).
 * - FIX 2: scored rows never include `appendedDuringIntro`.
 */
export function serializeExportTranscript(
  messages: RawMessage[],
  options: SerializeExportOptions = {},
): SerializeExportResult {
  const isValidTechnicianIntro =
    options.isValidTechnicianIntro ?? defaultIsValidTechnicianIntro;

  const transcript: SerializedScoredMessage[] = [];
  const debugBuffer: DebugBufferMessage[] = [];
  let awaitingIntro = true;

  for (const message of messages) {
    if (awaitingIntro) {
      if (message.authorRole === "technician") {
        if (isValidTechnicianIntro(message)) {
          transcript.push(toScoredRow(message, transcript.length));
          awaitingIntro = false;
        } else {
          debugBuffer.push(toDebugPath1Row(message, "invalid_intro_attempt"));
        }
        continue;
      }

      if (message.authorRole === "end_user" && message.appendedDuringIntro === true) {
        debugBuffer.push(toDebugPath1Row(message, "persona_a_intro_recovery"));
        continue;
      }

      debugBuffer.push(
        toDebugPath1Row(message, "unexpected_pre_intro_message"),
      );
      continue;
    }

    if (message.appendedDuringIntro === true) {
      debugBuffer.push(
        toDebugPath1Row(message, "appendedDuringIntro_in_live_phase"),
      );
      continue;
    }

    transcript.push(toScoredRow(message, transcript.length));
  }

  return { transcript, debugBuffer };
}

/** Partial demo document slice (§6): semver + scored transcript only. */
export function buildScoredExportSlice(result: SerializeExportResult): {
  exportSchemaVersion: "1.0";
  transcript: SerializedScoredMessage[];
} {
  return {
    exportSchemaVersion: "1.0",
    transcript: result.transcript,
  };
}
