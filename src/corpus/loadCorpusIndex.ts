/**
 * Shared corpus index for Electron (random scenarios) and the corpus MCP server.
 * Recursively loads JSON files under `knowledge-objects/corpus/` (or SHERPA_CORPUS_ROOT).
 */
import fs from "node:fs/promises";
import path from "node:path";

export type KoJson = Record<string, unknown>;

const KO_NUMBER_PATTERN = /^KO[0-9]+$/;

/** Validates `ko_number` for get_ko / IPC — no path characters. */
export function assertValidKoNumber(ko_number: string): void {
  if (typeof ko_number !== "string" || !KO_NUMBER_PATTERN.test(ko_number)) {
    throw new Error(
      `Invalid ko_number: expected pattern KO + digits (e.g. KO40001), got ${JSON.stringify(ko_number)}`,
    );
  }
}

/**
 * Default corpus directory: `knowledge-objects/corpus` under cwd, or `SHERPA_CORPUS_ROOT` if set.
 */
export function defaultCorpusRoot(): string {
  const env = process.env.SHERPA_CORPUS_ROOT?.trim();
  if (env) return path.resolve(env);
  return path.join(process.cwd(), "knowledge-objects", "corpus");
}

async function collectJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectJsonFiles(p)));
    else if (e.isFile() && e.name.endsWith(".json")) out.push(p);
  }
  return out;
}

/**
 * Load all KOs from disk; index by `ko_number`. Fails on duplicate ids or invalid JSON.
 */
export async function loadCorpusIndex(corpusRoot: string): Promise<Map<string, KoJson>> {
  const files = await collectJsonFiles(corpusRoot);
  const map = new Map<string, KoJson>();
  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new Error(`Invalid JSON in corpus file: ${filePath}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Corpus file must be a JSON object: ${filePath}`);
    }
    const ko = parsed as KoJson;
    const id = ko.ko_number;
    if (typeof id !== "string" || !KO_NUMBER_PATTERN.test(id)) {
      throw new Error(`Missing or invalid ko_number in ${filePath}`);
    }
    if (map.has(id)) {
      throw new Error(`Duplicate ko_number ${id} in corpus`);
    }
    map.set(id, ko);
  }
  return map;
}

export type CorpusListItem = { ko_number: string; subject?: string };

/** Lightweight list for IPC / debugging (sorted by ko_number). */
export function corpusIndexToList(index: Map<string, KoJson>): CorpusListItem[] {
  return [...index.entries()]
    .map(([ko_number, ko]) => ({
      ko_number,
      subject: typeof ko.subject === "string" ? ko.subject : undefined,
    }))
    .sort((a, b) => a.ko_number.localeCompare(b.ko_number));
}
