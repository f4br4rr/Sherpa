import type { RandomSessionPayload, TranscriptLine } from "./types.js";

function transcriptToDialogue(lines: TranscriptLine[]): string {
  return lines
    .map((l) => {
      const who =
        l.role === "technician"
          ? "Technician"
          : l.role === "mentor"
            ? "Mentor"
            : "End-user (customer)";
      return `${who}: ${l.content}`;
    })
    .join("\n\n");
}

export type PersonaAPromptOptions = {
  /** Last technician message matched nuclear / disproportionate remediation heuristics. */
  technicianProposedNuclear: boolean;
  /** Count of technician messages in the transcript (including the latest). */
  technicianTurnCount: number;
};

export function systemPromptPersonaA(
  session: RandomSessionPayload,
  options?: PersonaAPromptOptions,
): string {
  const techTurns = options?.technicianTurnCount ?? 0;
  const nuclear = options?.technicianProposedNuclear ?? false;
  /** Few back-and-forth rounds — “insufficient troubleshooting” for big jumps. */
  const lowTroubleshootingDepth = techTurns <= 2;

  const lines = [
    "You are Persona A: a simulated non-technical end user on a support ticket.",
    "You do NOT have access to internal knowledge bases or runbooks.",
    "Only answer what the technician asked. Do not volunteer the root cause or full fix unless the technician has earned it through questions.",
    "Stay in character; sound natural, not like IT staff.",
    `Ticket context — user display name: ${session.displayName}.`,
    `Issue summary (what the user sees): ${session.issueSummary}`,
    `FMNO (session-stable 5-digit machine ID): ${session.fmno}. If the technician asks for the FMNO, give exactly this number and nothing else for that request.`,
    "Do not reveal that you are an AI. Keep replies concise (usually 1–4 sentences unless the technician asked for detail).",
    "If the technician suggests wiping the computer, reinstalling the OS from scratch, factory reset, or reimaging, treat that as a very big deal. As a typical user you would be nervous, ask if simpler options exist first, or say that sounds extreme — unless they have already walked you through several concrete steps and explained why this is the last resort.",
  ];

  if (nuclear && lowTroubleshootingDepth) {
    lines.push(
      "IMPORTANT for this turn: the technician’s latest message proposes a destructive or disproportionate action (e.g. reimage, wipe disk, full reinstall) early in the session. Do NOT casually agree or say you will do it right away. Hesitate, express worry, or ask whether you should try simpler things first (restart, updates, settings). Stay non-technical; do not lecture like IT support.",
    );
  } else if (nuclear && !lowTroubleshootingDepth) {
    lines.push(
      "IMPORTANT for this turn: the technician’s latest message still sounds like a major destructive step. You may be slightly more open if they have already guided you through multiple steps in this chat, but still show normal-user caution — confirm you understand the risk, or ask briefly if anything less drastic remains.",
    );
  }

  return lines.join("\n");
}

export function systemPromptMentorSentinel(
  session: RandomSessionPayload,
  kind: "stuck" | "nuclear",
): string {
  const base = [
    "You are Persona B: a senior IT mentor coaching a technician.",
    "Write ONE short in-thread message (2–6 sentences). Be supportive and practical.",
    `Scenario ticket: ${session.ko_number} — ${session.issueSummary}`,
  ];
  if (kind === "stuck") {
    base.push(
      "The technician clicked I'm stuck — mentor hint. Offer a nudge toward the next diagnostic or question to ask, without solving the whole case.",
    );
  } else {
    base.push(
      "The technician proposed a destructive or disproportionate action (e.g. reimage, wipe disk, full OS reinstall) for what sounds like a simpler issue. Gently course-correct: acknowledge risk/time, steer toward smaller safer steps. Do not shame.",
    );
  }
  return base.join("\n");
}

export function userPromptForTranscript(transcript: TranscriptLine[]): string {
  return `Conversation so far:\n\n${transcriptToDialogue(transcript)}\n\nWrite the next End-user (customer) reply only — no prefix labels, just the customer's words.`;
}

export function userPromptMentor(transcript: TranscriptLine[]): string {
  return `Conversation so far:\n\n${transcriptToDialogue(transcript)}\n\nWrite your mentor message only — no prefix labels.`;
}

const EVALUATOR_JSON_INSTRUCTION = `You must respond with a single JSON object only (no markdown fences), matching this TypeScript shape:
{
  "atsScores": {
    "technicalKnowledge": number,
    "logicalThinking": number,
    "rootCause": number
  },
  "coachingNotes": {
    "overall": string,
    "perFactor": {
      "technicalKnowledge"?: string,
      "logicalThinking"?: string,
      "rootCause"?: string
    }
  },
  "learningBehavior": string,
  "gradingIntegrity": "complete" | "incomplete_ko_unavailable" | "incomplete_ko_partial"
}

Each ATS factor score must be one of: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5.
Use the bound KO as ground truth when present; if KO data is incomplete, set gradingIntegrity to incomplete_ko_partial and note gaps in coaching.
If KO was unavailable, set gradingIntegrity to incomplete_ko_unavailable and grade only from the transcript with explicit uncertainty in coaching.`;

export function systemPromptEvaluator(
  gradingIntegrityHint: "complete" | "incomplete_ko_unavailable" | "incomplete_ko_partial",
): string {
  return [
    "You are an expert evaluator for IT support simulations.",
    "Score the technician using the ATS three-factor rubric (1–5, half-steps allowed as listed).",
    "Do not apply rigid step-by-step matching to the KO; reward sound reasoning and judgment.",
    "Ground rationales in specific turns in the transcript.",
    EVALUATOR_JSON_INSTRUCTION,
    `For this run, the expected gradingIntegrity value is: ${gradingIntegrityHint} (you must still emit gradingIntegrity in JSON).`,
  ].join("\n");
}

export function userPromptEvaluator(params: {
  transcript: TranscriptLine[];
  koJson: string | null;
  session: RandomSessionPayload;
}): string {
  const parts = [
    `Session / ticket: ${params.session.ko_number}`,
    `Technician-facing issue summary: ${params.session.issueSummary}`,
    "",
    "Transcript:",
    transcriptToDialogue(params.transcript),
    "",
  ];
  if (params.koJson !== null) {
    parts.push("Bound KO (ground truth JSON):", params.koJson);
  } else {
    parts.push("Bound KO was not available for this evaluation.");
  }
  parts.push("", "Produce the JSON evaluation object.");
  return parts.join("\n");
}
