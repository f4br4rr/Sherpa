/// <reference types="vite/client" />

declare global {
  interface Window {
    app: {
      listCorpusKos: () => Promise<{ ko_number: string; subject?: string }[]>;
    };
  }
}

export {};
