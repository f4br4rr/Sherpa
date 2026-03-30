import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  sourcemap: true,
  logLevel: "info",
};

async function run() {
  const ctx = await esbuild.context({
    ...common,
    entryPoints: [
      path.join(root, "electron/main.ts"),
      path.join(root, "electron/preload.ts"),
    ],
    outdir: path.join(root, "dist-electron"),
    entryNames: "[name]",
    outExtension: { ".js": ".cjs" },
  });

  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
