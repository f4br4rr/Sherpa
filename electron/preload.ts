import { contextBridge, ipcRenderer } from "electron";

export type CorpusListItem = { ko_number: string; subject?: string };

contextBridge.exposeInMainWorld("app", {
  listCorpusKos: (): Promise<CorpusListItem[]> =>
    ipcRenderer.invoke("corpus:list"),
});
