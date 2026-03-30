#!/usr/bin/env node
/**
 * Phase 1 production KOs: all .json under knowledge-objects/corpus/ (recursive).
 * - JSON Schema, duplicate ko_number (within corpus only), contiguous ts_steps
 *   (A max step count per KO may be documented for authors — not enforced by this script.)
 *
 * Examples: all .json under knowledge-objects/examples/ (recursive).
 * - Schema + ts_steps only (illustrative ids; not part of corpus uniqueness)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const koRoot = join(root, "knowledge-objects");
const corpusDir = join(koRoot, "corpus");
const examplesDir = join(koRoot, "examples");
const schemaPath = join(root, "schemas", "knowledge-object.schema.json");

function walkJsonFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkJsonFiles(p, acc);
    else if (ent.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

function validateTsSteps(tsSteps, fileLabel) {
  if (!Array.isArray(tsSteps) || tsSteps.length === 0) {
    return ["ts_steps must be a non-empty array"];
  }
  const steps = tsSteps.map((s) => s.step);
  const sorted = [...steps].sort((a, b) => a - b);
  const errors = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      errors.push(
        `${fileLabel}: ts_steps.step must be contiguous starting at 1 (expected ${i + 1}, got ${sorted[i]})`,
      );
      break;
    }
  }
  const seen = new Set();
  for (const s of steps) {
    if (seen.has(s)) errors.push(`${fileLabel}: duplicate ts_steps.step ${s}`);
    seen.add(s);
  }
  return errors;
}

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

let failed = false;

const exampleFiles = walkJsonFiles(examplesDir);
for (const file of exampleFiles) {
  const rel = file.slice(root.length + 1);
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`${rel}: invalid JSON — ${e.message}`);
    failed = true;
    continue;
  }
  if (!validate(data)) {
    console.error(`${rel}: schema errors`);
    for (const err of validate.errors ?? []) {
      console.error(`  ${err.instancePath || "/"} ${err.message}`);
    }
    failed = true;
    continue;
  }
  const stepErrors = validateTsSteps(data.ts_steps, rel);
  if (stepErrors.length) {
    stepErrors.forEach((m) => console.error(m));
    failed = true;
  }
}

const corpusFiles = walkJsonFiles(corpusDir);
const byNumber = new Map();

for (const file of corpusFiles) {
  const rel = file.slice(root.length + 1);
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`${rel}: invalid JSON — ${e.message}`);
    failed = true;
    continue;
  }

  if (!validate(data)) {
    console.error(`${rel}: schema errors`);
    for (const err of validate.errors ?? []) {
      console.error(`  ${err.instancePath || "/"} ${err.message}`);
    }
    failed = true;
    continue;
  }

  const ko = data.ko_number;
  if (byNumber.has(ko)) {
    console.error(
      `Duplicate ko_number ${ko}:\n  ${byNumber.get(ko)}\n  ${rel}`,
    );
    failed = true;
  } else {
    byNumber.set(ko, rel);
  }

  const stepErrors = validateTsSteps(data.ts_steps, rel);
  if (stepErrors.length) {
    stepErrors.forEach((m) => console.error(m));
    failed = true;
  }
}

if (failed) process.exit(1);

if (corpusFiles.length === 0) {
  console.log(
    "validate-ko-corpus: OK — corpus/ has no JSON yet (add Phase 1 KOs under knowledge-objects/corpus/).",
  );
} else {
  console.log(
    `validate-ko-corpus: OK — ${corpusFiles.length} production file(s) under corpus/.`,
  );
}
if (exampleFiles.length > 0) {
  console.log(
    `  (+ ${exampleFiles.length} example file(s) under examples/ — schema checked)`,
  );
}
process.exit(0);
