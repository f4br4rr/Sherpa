import { contextBridge, ipcRenderer } from "electron";

export type CorpusListItem = { ko_number: string; subject?: string };

export type RandomSessionPayload = {
  ko_number: string;
  displayName: string;
  issueSummary: string;
  fmno: string;
};

contextBridge.exposeInMainWorld("app", {
  listCorpusKos: (): Promise<CorpusListItem[]> =>
    ipcRenderer.invoke("corpus:list"),
  startRandomSession: (): Promise<RandomSessionPayload> =>
    ipcRenderer.invoke("session:startRandom"),
});
