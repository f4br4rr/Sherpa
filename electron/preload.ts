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

/** Persona A / technician surface only — no mentor MCP tools here (closed-book). */
contextBridge.exposeInMainWorld("app", {
  listCorpusKos: (): Promise<CorpusListItem[]> =>
    ipcRenderer.invoke("corpus:list"),
  startRandomSession: (): Promise<RandomSessionPayload> =>
    ipcRenderer.invoke("session:startRandom"),
});
