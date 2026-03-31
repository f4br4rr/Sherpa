import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve("renderer"),
  build: {
    outDir: path.resolve("dist/renderer"),
    emptyOutDir: true,
  },
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [react()],
});
