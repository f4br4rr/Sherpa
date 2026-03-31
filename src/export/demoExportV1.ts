/**
 * Minimum Chat Practice demo export shape — project-architecture-and-plan.md §6.
 */
import type { ParsedEvaluation } from "../llm/evaluator.js";

export type DemoTranscriptRow = {
  authorRole: "technician" | "end_user" | "mentor";
  content: string;
  timestamp: string;
};

export type DemoExportV1 = {
  exportSchemaVersion: "1.0";
  timestamp: string;
  sessionId: string;
  ticketId: string;
  boundKoNumber: string;
  transcript: DemoTranscriptRow[];
  atsScores: ParsedEvaluation["atsScores"];
  weightedScore: number;
  outcomeLabel: ParsedEvaluation["outcomeLabel"];
  coachingNotes: ParsedEvaluation["coachingNotes"];
  learningBehavior: string;
  gradingIntegrity: string;
};

export function buildDemoExportV1(params: {
  sessionId: string;
  ko_number: string;
  transcript: { role: "technician" | "customer" | "mentor"; content: string }[];
  evaluation: ParsedEvaluation;
}): DemoExportV1 {
  const ticketId = params.sessionId;
  const transcript: DemoTranscriptRow[] = params.transcript.map((m) => ({
    authorRole: m.role === "customer" ? "end_user" : m.role,
    content: m.content,
    timestamp: new Date().toISOString(),
  }));

  return {
    exportSchemaVersion: "1.0",
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    ticketId,
    boundKoNumber: params.ko_number,
    transcript,
    atsScores: params.evaluation.atsScores,
    weightedScore: params.evaluation.weightedScore,
    outcomeLabel: params.evaluation.outcomeLabel,
    coachingNotes: params.evaluation.coachingNotes,
    learningBehavior: params.evaluation.learningBehavior,
    gradingIntegrity: params.evaluation.gradingIntegrity,
  };
}
