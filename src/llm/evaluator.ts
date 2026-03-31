import type { KoJson } from "../corpus/loadCorpusIndex.js";
import type { RandomSessionPayload, TranscriptLine } from "./types.js";
import { chatCompletion, type ChatCompletionOptions } from "./client.js";
import { getLlmProvider } from "./env.js";
import {
  systemPromptEvaluator,
  userPromptEvaluator,
} from "./prompts.js";

export const ALLOWED_ATS_SCORES = new Set([
  1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
]);

export type ParsedEvaluation = {
  atsScores: {
    technicalKnowledge: number;
    logicalThinking: number;
    rootCause: number;
  };
  weightedScore: number;
  outcomeLabel: "Pass" | "Needs Improvement";
  coachingNotes: {
    overall: string;
    perFactor?: {
      technicalKnowledge?: string;
      logicalThinking?: string;
      rootCause?: string;
    };
  };
  learningBehavior: string;
  gradingIntegrity: "complete" | "incomplete_ko_unavailable" | "incomplete_ko_partial";
};

export function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

export function isAllowedAtsScore(n: number): boolean {
  return ALLOWED_ATS_SCORES.has(roundToOneDecimal(n));
}

export function computeWeightedScore(ats: ParsedEvaluation["atsScores"]): number {
  const w =
    ats.technicalKnowledge * 0.4 +
    ats.logicalThinking * 0.35 +
    ats.rootCause * 0.25;
  return Math.round(w * 100) / 100;
}

export function outcomeFromWeighted(weighted: number): "Pass" | "Needs Improvement" {
  return weighted >= 4.0 ? "Pass" : "Needs Improvement";
}

function inferGradingIntegrity(
  ko: KoJson | null,
  getKoFailed: boolean,
): "complete" | "incomplete_ko_unavailable" | "incomplete_ko_partial" {
  if (getKoFailed) return "incomplete_ko_unavailable";
  if (!ko) return "incomplete_ko_unavailable";
  const steps = ko["ts_steps"];
  const internal = ko["internal_information"];
  const missingSteps = !Array.isArray(steps) || steps.length === 0;
  const missingInternal =
    internal === null ||
    internal === undefined ||
    (typeof internal === "string" && internal.trim() === "");
  if (missingSteps || missingInternal) return "incomplete_ko_partial";
  return "complete";
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const inner = tryParse(fence[1].trim());
    if (inner !== undefined) return inner;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    const parsed = tryParse(slice);
    if (parsed !== undefined) return parsed;
  }
  throw new Error("Evaluator returned no parseable JSON object.");
}

function tryParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return undefined;
  }
}

function parseEvaluationPayload(raw: unknown): Omit<ParsedEvaluation, "weightedScore" | "outcomeLabel"> {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Evaluator JSON must be an object.");
  }
  const o = raw as Record<string, unknown>;
  const ats = o.atsScores;
  if (typeof ats !== "object" || ats === null) {
    throw new Error("Missing atsScores.");
  }
  const a = ats as Record<string, unknown>;
  const tk = a.technicalKnowledge;
  const lt = a.logicalThinking;
  const rc = a.rootCause;
  for (const [label, v] of [
    ["technicalKnowledge", tk],
    ["logicalThinking", lt],
    ["rootCause", rc],
  ] as const) {
    if (typeof v !== "number" || !Number.isFinite(v) || !isAllowedAtsScore(v)) {
      throw new Error(`Invalid or missing ATS factor: ${label}`);
    }
  }

  const coaching = o.coachingNotes;
  if (typeof coaching !== "object" || coaching === null) {
    throw new Error("Missing coachingNotes.");
  }
  const c = coaching as Record<string, unknown>;
  if (typeof c.overall !== "string" || !c.overall.trim()) {
    throw new Error("Missing coachingNotes.overall.");
  }

  const learningBehavior = o.learningBehavior;
  if (typeof learningBehavior !== "string" || !learningBehavior.trim()) {
    throw new Error("Missing learningBehavior.");
  }

  const gi = o.gradingIntegrity;
  if (
    gi !== "complete" &&
    gi !== "incomplete_ko_unavailable" &&
    gi !== "incomplete_ko_partial"
  ) {
    throw new Error("Invalid gradingIntegrity.");
  }

  return {
    atsScores: {
      technicalKnowledge: roundToOneDecimal(tk as number),
      logicalThinking: roundToOneDecimal(lt as number),
      rootCause: roundToOneDecimal(rc as number),
    },
    coachingNotes: {
      overall: c.overall as string,
      perFactor:
        typeof c.perFactor === "object" && c.perFactor !== null
          ? (c.perFactor as ParsedEvaluation["coachingNotes"]["perFactor"])
          : undefined,
    },
    learningBehavior: learningBehavior as string,
    gradingIntegrity: gi,
  };
}

export async function runEvaluation(params: {
  session: RandomSessionPayload;
  transcript: TranscriptLine[];
  ko: KoJson | null;
  getKoFailed: boolean;
  options?: ChatCompletionOptions;
}): Promise<ParsedEvaluation> {
  const integrity = inferGradingIntegrity(params.ko, params.getKoFailed);
  const koJson =
    params.ko !== null ? JSON.stringify(params.ko, null, 2) : null;

  const messages = [
    {
      role: "system" as const,
      content: systemPromptEvaluator(integrity),
    },
    {
      role: "user" as const,
      content: userPromptEvaluator({
        session: params.session,
        transcript: params.transcript,
        koJson,
      }),
    },
  ];

  const { content } = await chatCompletion(messages, {
    temperature: 0.2,
    max_tokens: 4096,
    signal: params.options?.signal,
    jsonMode: getLlmProvider() === "gemini",
  });

  const json = extractJsonObject(content);
  const parsed = parseEvaluationPayload(json);

  const weightedScore = computeWeightedScore(parsed.atsScores);
  const outcomeLabel = outcomeFromWeighted(weightedScore);

  return {
    ...parsed,
    weightedScore,
    outcomeLabel,
  };
}
