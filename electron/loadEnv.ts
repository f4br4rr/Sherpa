/**
 * Load repo-root `.env` before any LLM or corpus paths read `process.env`.
 * Must be imported first from `main.ts` (bundled order).
 */
import { config } from "dotenv";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
config({ path: envPath });
