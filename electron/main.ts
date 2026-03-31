import "./loadEnv.js";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
} from "electron";
import { randomInt, randomUUID } from "node:crypto";
import path from "node:path";
import {
  corpusIndexToList,
  defaultCorpusRoot,
  loadCorpusIndex,
  type KoJson,
} from "../src/corpus/loadCorpusIndex";
import { setActiveSessionId } from "../src/evidence/activeSession";
import { runMentorSentinel, runPersonaAReply } from "../src/llm/chatOrchestration";
import { buildDemoExportV1 } from "../src/export/demoExportV1";
import { runEvaluation } from "../src/llm/evaluator";
import { isNuclearProposal } from "../src/llm/nuclear";
import type { RandomSessionPayload, TranscriptLine } from "../src/llm/types.js";
import { mentorGetKo, mentorSearchKb } from "../src/mentor/corpusMentorTools";
import { resolveTicketDisplayName } from "../src/pickDisplayName";

const sessionAbortControllers = new Map<string, AbortController>();

function abortSessionOps(sessionId: string): void {
  const prev = sessionAbortControllers.get(sessionId);
  prev?.abort();
  sessionAbortControllers.delete(sessionId);
}

function signalForSession(sessionId: string): AbortSignal {
  abortSessionOps(sessionId);
  const ac = new AbortController();
  sessionAbortControllers.set(sessionId, ac);
  return ac.signal;
}

/** Resolved at runtime: repo root when running `electron .` from development. */
function distElectronPath(...segments: string[]) {
  return path.join(process.cwd(), "dist-electron", ...segments);
}

ipcMain.handle("corpus:list", async () => {
  const index = await loadCorpusIndex(defaultCorpusRoot());
  return corpusIndexToList(index);
});

ipcMain.handle("session:startRandom", async () => {
  const sessionId = randomUUID();
  for (const id of sessionAbortControllers.keys()) {
    abortSessionOps(id);
  }
  setActiveSessionId(sessionId);

  const index = await loadCorpusIndex(defaultCorpusRoot());
  const kos = [...index.values()];
  if (kos.length === 0) {
    throw new Error("No Knowledge Objects found under knowledge-objects/corpus/");
  }
  const pick = kos[randomInt(0, kos.length)] as KoJson;
  const persona =
    typeof pick.persona === "string" ? pick.persona : undefined;
  const displayName = resolveTicketDisplayName(persona);
  const subject = typeof pick.subject === "string" ? pick.subject : "";
  const description = typeof pick.description === "string" ? pick.description : "";
  const issueSummary =
    subject.trim() || description.trim() || "(No issue summary)";
  const koNum = typeof pick.ko_number === "string" ? pick.ko_number : "";
  const fmno = String(randomInt(0, 100_000)).padStart(5, "0");

  return {
    sessionId,
    ko_number: koNum,
    displayName,
    issueSummary,
    fmno,
  };
});

/** Mentor/orchestrator only — not exposed on `window.app` (Persona A has no MCP). */
ipcMain.handle("mentor:getKo", async (_event, ko_number: unknown) => {
  if (typeof ko_number !== "string") {
    throw new Error("mentor:getKo requires a string ko_number");
  }
  return mentorGetKo(ko_number);
});

ipcMain.handle(
  "mentor:searchKb",
  async (_event, query: unknown, limit?: unknown) => {
    if (typeof query !== "string") {
      throw new Error("mentor:searchKb requires a string query");
    }
    const lim =
      typeof limit === "number" && Number.isFinite(limit)
        ? limit
        : undefined;
    return mentorSearchKb(query, lim);
  },
);

ipcMain.handle(
  "chat:personaTurn",
  async (
    _event,
    payload: { session: RandomSessionPayload; transcript: TranscriptLine[] },
  ) => {
    const { session, transcript } = payload;
    if (!session?.sessionId || typeof session.sessionId !== "string") {
      throw new Error("chat:personaTurn: invalid session");
    }
    setActiveSessionId(session.sessionId);
    const signal = signalForSession(session.sessionId);

    try {
      const lastTech = [...transcript].reverse().find((l) => l.role === "technician");
      if (!lastTech) {
        throw new Error("chat:personaTurn: transcript must include a technician message");
      }

      const technicianTurnCount = transcript.filter((l) => l.role === "technician").length;
      const nuclearThisTurn = isNuclearProposal(lastTech.content);

      const customerMessage = await runPersonaAReply({
        session,
        transcript,
        personaAOptions: {
          technicianProposedNuclear: nuclearThisTurn,
          technicianTurnCount,
        },
        options: { signal },
      });

      let mentorNuclearMessage: string | undefined;
      if (nuclearThisTurn) {
        const afterCustomer: TranscriptLine[] = [
          ...transcript,
          { role: "customer", content: customerMessage },
        ];
        mentorNuclearMessage = await runMentorSentinel({
          session,
          transcript: afterCustomer,
          kind: "nuclear",
          options: { signal },
        });
      }

      return { customerMessage, mentorNuclearMessage };
    } finally {
      sessionAbortControllers.delete(session.sessionId);
    }
  },
);

ipcMain.handle(
  "chat:mentorStuck",
  async (
    _event,
    payload: { session: RandomSessionPayload; transcript: TranscriptLine[] },
  ) => {
    const { session, transcript } = payload;
    if (!session?.sessionId) throw new Error("chat:mentorStuck: invalid session");
    setActiveSessionId(session.sessionId);
    const signal = signalForSession(session.sessionId);
    try {
      const mentorMessage = await runMentorSentinel({
        session,
        transcript,
        kind: "stuck",
        options: { signal },
      });
      return { mentorMessage };
    } finally {
      sessionAbortControllers.delete(session.sessionId);
    }
  },
);

ipcMain.handle(
  "chat:evaluate",
  async (
    _event,
    payload: { session: RandomSessionPayload; transcript: TranscriptLine[] },
  ) => {
    const { session, transcript } = payload;
    if (!session?.sessionId) throw new Error("chat:evaluate: invalid session");
    setActiveSessionId(session.sessionId);
    const signal = signalForSession(session.sessionId);

    let ko: KoJson | null = null;
    let getKoFailed = false;
    try {
      ko = (await mentorGetKo(session.ko_number)) as KoJson;
    } catch {
      getKoFailed = true;
    }

    try {
      const evaluation = await runEvaluation({
        session,
        transcript,
        ko,
        getKoFailed,
        options: { signal },
      });
      const demoExport = buildDemoExportV1({
        sessionId: session.sessionId,
        ko_number: session.ko_number,
        transcript,
        evaluation,
      });
      return { ...evaluation, demoExport };
    } finally {
      sessionAbortControllers.delete(session.sessionId);
    }
  },
);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function trayIcon() {
  const iconPath = path.join(process.cwd(), "assets", "tray.png");
  const img = nativeImage.createFromPath(iconPath);
  return img.isEmpty() ? nativeImage.createEmpty() : img;
}

function toggleMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip("Sherpa");
  tray.on("click", () => {
    toggleMainWindow();
  });
  const menu = Menu.buildFromTemplate([
    {
      label: "Show Sherpa",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    show: false,
    webPreferences: {
      preload: distElectronPath("preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL("http://127.0.0.1:5173/");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(process.cwd(), "dist/renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  /* Keep running in tray; quit from tray menu or Cmd+Q after before-quit */
});
