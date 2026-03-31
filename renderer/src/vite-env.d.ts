/// <reference types="vite/client" />

type CorpusListItem = { ko_number: string; subject?: string };

type RandomSessionPayload = {
  sessionId: string;
  ko_number: string;
  displayName: string;
  issueSummary: string;
  fmno: string;
};

type TranscriptLine = {
  role: "technician" | "customer" | "mentor";
  content: string;
};

type PersonaTurnResult = {
  customerMessage: string;
  mentorNuclearMessage?: string;
};

type DemoExportV1 = {
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

type EvaluationResult = {
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

declare global {
  interface Window {
    app: {
      listCorpusKos: () => Promise<CorpusListItem[]>;
      startRandomSession: () => Promise<RandomSessionPayload>;
      chatPersonaTurn: (payload: {
        session: RandomSessionPayload;
        transcript: TranscriptLine[];
      }) => Promise<PersonaTurnResult>;
      chatMentorStuck: (payload: {
        session: RandomSessionPayload;
        transcript: TranscriptLine[];
      }) => Promise<{ mentorMessage: string }>;
      chatEvaluate: (payload: {
        session: RandomSessionPayload;
        transcript: TranscriptLine[];
      }) => Promise<EvaluationResult>;
    };
  }
}

export {};
