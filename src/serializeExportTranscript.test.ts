import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildScoredExportSlice,
  serializeExportTranscript,
} from "./serializeExportTranscript.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function loadJson(pathFromRoot: string): unknown {
  const raw = readFileSync(join(repoRoot, pathFromRoot), "utf8");
  return JSON.parse(raw) as unknown;
}

function stripFixtureKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripFixtureKeys);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === "_fixtureNote" || k === "_comment") continue;
    out[k] = stripFixtureKeys(v);
  }
  return out;
}

describe("serializeExportTranscript (§5 fixtures)", () => {
  it("Path 1: invalid intro + Persona A recovery → debug; valid intro scored at 0", () => {
    const input = loadJson("fixtures/path1-invalid-intro/input-raw.json") as {
      messages: unknown[];
    };
    const expectedScored = stripFixtureKeys(
      loadJson("fixtures/path1-invalid-intro/scored-output.json"),
    );
    const expectedDebug = stripFixtureKeys(
      loadJson("fixtures/path1-invalid-intro/debug-buffer.json"),
    );

    const result = serializeExportTranscript(
      input.messages as Parameters<typeof serializeExportTranscript>[0],
    );

    expect(stripFixtureKeys(buildScoredExportSlice(result))).toEqual(
      expectedScored,
    );
    expect(stripFixtureKeys({ debugBuffer: result.debugBuffer })).toEqual(
      expectedDebug,
    );

    for (const row of result.transcript) {
      expect(row).not.toHaveProperty("appendedDuringIntro");
    }
  });

  it("Removal 1 + gibberish: all post-intro technician rows stay in scored; turnIndex 0..3", () => {
    const input = loadJson("fixtures/post-intro-gibberish/input-raw.json") as {
      messages: unknown[];
    };
    const expectedScored = stripFixtureKeys(
      loadJson("fixtures/post-intro-gibberish/scored-output.json"),
    );

    const result = serializeExportTranscript(
      input.messages as Parameters<typeof serializeExportTranscript>[0],
    );

    expect(stripFixtureKeys(buildScoredExportSlice(result))).toEqual(
      expectedScored,
    );
    expect(result.debugBuffer).toEqual([]);
  });
});
