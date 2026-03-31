import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

/** Resolved at runtime: repo root when running `electron .` from development. */
function distElectronPath(...segments: string[]) {
  return path.join(process.cwd(), "dist-electron", ...segments);
}

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

ipcMain.handle("corpus:list", async () => {
  const root = path.join(process.cwd(), "knowledge-objects", "corpus");
  const files = await collectCorpusJsonFiles(root);
  const kos: { ko_number: string; subject?: string }[] = [];
  for (const f of files) {
    const raw = await fs.readFile(f, "utf8");
    const j = JSON.parse(raw) as { ko_number?: string; subject?: string };
    if (j.ko_number) kos.push({ ko_number: j.ko_number, subject: j.subject });
  }
  return kos.sort((a, b) => a.ko_number.localeCompare(b.ko_number));
});

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      preload: distElectronPath("preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    win.loadURL("http://127.0.0.1:5173/");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(process.cwd(), "dist/renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
