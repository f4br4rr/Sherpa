#!/usr/bin/env node
/**
 * Spawn the Electron binary with ELECTRON_RUN_AS_NODE unset.
 * If ELECTRON_RUN_AS_NODE=1 (e.g. from some dev shells or tools), the Electron
 * executable behaves like plain Node and require("electron") resolves to the
 * npm stub (path string) instead of the real API — ipcMain is then undefined.
 */
import { spawn } from "node:child_process";
import electronPath from "electron";

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const child = spawn(electronPath, args, { env, stdio: "inherit" });
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
