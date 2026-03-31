import { contextBridge, ipcRenderer } from "electron";

export type CorpusListItem = { ko_number: string; subject?: string };

export type RandomSessionPayload = {
  /** Correlates EvidenceEvents in main process until full session export exists. */
  sessionId: string;
  ko_number: string;
  displayName: string;
  issueSummary: string;
  fmno: string;
};

export type TranscriptLine = {
  role: "technician" | "customer" | "mentor";
  content: string;
};

export type PersonaTurnResult = {
  customerMessage: string;
  mentorNuclearMessage?: string;
};

export type DemoExportV1 = {
  exportSchemaVersion: "1.0";
  timestamp: string;
  sessionId: string;
  ticketId: string;
  boundKoNumber: string;
  transcript: { authorRole: string; content: string; timestamp: string }[];
  atsScores: {
    technicalKnowledge: number;
    logicalThinking: number;
    rootCause: number;
  };
  weightedScore: number;
  outcomeLabel: string;
  coachingNotes: Record<string, unknown>;
  learningBehavior: string;
  gradingIntegrity: string;
};

export type EvaluationResult = {
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
  gradingIntegrity: string;
  demoExport: DemoExportV1;
};

/** Persona A / technician surface only — no mentor MCP tools here (closed-book). */
contextBridge.exposeInMainWorld("app", {
  listCorpusKos: (): Promise<CorpusListItem[]> =>
    ipcRenderer.invoke("corpus:list"),
  startRandomSession: (): Promise<RandomSessionPayload> =>
    ipcRenderer.invoke("session:startRandom"),
  chatPersonaTurn: (payload: {
    session: RandomSessionPayload;
    transcript: TranscriptLine[];
  }): Promise<PersonaTurnResult> => ipcRenderer.invoke("chat:personaTurn", payload),
  chatMentorStuck: (payload: {
    session: RandomSessionPayload;
    transcript: TranscriptLine[];
  }): Promise<{ mentorMessage: string }> =>
    ipcRenderer.invoke("chat:mentorStuck", payload),
  chatEvaluate: (payload: {
    session: RandomSessionPayload;
    transcript: TranscriptLine[];
  }): Promise<EvaluationResult> => ipcRenderer.invoke("chat:evaluate", payload),
});
