import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Tray,
} from "electron";
import { randomInt } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveTicketDisplayName } from "../src/pickDisplayName";

/** Resolved at runtime: repo root when running `electron .` from development. */
function distElectronPath(...segments: string[]) {
  return path.join(process.cwd(), "dist-electron", ...segments);
}

function corpusRoot() {
  return path.join(process.cwd(), "knowledge-objects", "corpus");
}

type CorpusKoRecord = {
  ko_number: string;
  subject?: string;
  description?: string;
  persona?: string;
};

async function collectCorpusJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectCorpusJsonFiles(p)));
    else if (e.isFile() && e.name.endsWith(".json")) out.push(p);
  }
  return out;
}

async function loadAllCorpusKos(): Promise<CorpusKoRecord[]> {
  const root = corpusRoot();
  const files = await collectCorpusJsonFiles(root);
  const kos: CorpusKoRecord[] = [];
  for (const f of files) {
    const raw = await fs.readFile(f, "utf8");
    const j = JSON.parse(raw) as CorpusKoRecord;
    if (j.ko_number) kos.push(j);
  }
  return kos;
}

ipcMain.handle("corpus:list", async () => {
  const kos = await loadAllCorpusKos();
  return kos
    .map((k) => ({ ko_number: k.ko_number, subject: k.subject }))
    .sort((a, b) => a.ko_number.localeCompare(b.ko_number));
});

ipcMain.handle("session:startRandom", async () => {
  const kos = await loadAllCorpusKos();
  if (kos.length === 0) {
    throw new Error("No Knowledge Objects found under knowledge-objects/corpus/");
  }
  const pick = kos[randomInt(0, kos.length)];
  const displayName = resolveTicketDisplayName(pick.persona);
  const issueSummary =
    pick.subject?.trim() || pick.description?.trim() || "(No issue summary)";
  const fmno = String(randomInt(0, 100_000)).padStart(5, "0");

  return {
    ko_number: pick.ko_number,
    displayName,
    issueSummary,
    fmno,
  };
});

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
