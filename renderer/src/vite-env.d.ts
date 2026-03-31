/// <reference types="vite/client" />

type CorpusListItem = { ko_number: string; subject?: string };

type RandomSessionPayload = {
  ko_number: string;
  displayName: string;
  issueSummary: string;
  fmno: string;
};

declare global {
  interface Window {
    app: {
      listCorpusKos: () => Promise<CorpusListItem[]>;
      startRandomSession: () => Promise<RandomSessionPayload>;
    };
  }
}

export {};
