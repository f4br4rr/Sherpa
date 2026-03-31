/**
 * Sherpa corpus MCP — stdio server exposing get_ko + search_kb over local JSON corpus.
 * EvidenceEvents are logged by the Electron host (Phase 3+), not here — see PHASE3_DOCUMENTATION.md.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  assertValidKoNumber,
  defaultCorpusRoot,
  loadCorpusIndex,
  type KoJson,
} from "../corpus/loadCorpusIndex.js";

const SEARCH_LIMIT_DEFAULT = 15;
const SEARCH_LIMIT_MAX = 50;

function toolText(obj: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2),
      },
    ],
  };
}

function toolError(message: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function main(): Promise<void> {
  const corpusRoot = defaultCorpusRoot();
  let index: Map<string, KoJson>;
  try {
    index = await loadCorpusIndex(corpusRoot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[sherpa-corpus-mcp] Failed to load corpus from ${corpusRoot}: ${msg}`);
    process.exit(1);
  }

  const server = new McpServer({
    name: "sherpa-corpus-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "get_ko",
    {
      description:
        "Load the bound knowledge object (KO) by stable id from the local corpus (e.g. KO40001). Read-only; mentor/orchestrator use.",
      inputSchema: {
        ko_number: z
          .string()
          .describe("Stable KO id matching ^KO[0-9]+$ (e.g. KO40001)"),
      },
    },
    async (args) => {
      try {
        assertValidKoNumber(args.ko_number);
      } catch (e) {
        return toolError(e instanceof Error ? e.message : String(e));
      }
      const ko = index.get(args.ko_number);
      if (!ko) {
        return toolError(`KO not found: ${args.ko_number}`);
      }
      return toolText(ko);
    },
  );

  server.registerTool(
    "search_kb",
    {
      description:
        "Search knowledge objects by substring over subject, description, and steps (mentor-only cross-check).",
      inputSchema: {
        query: z.string().describe("Search text (matched case-insensitively)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(SEARCH_LIMIT_MAX)
          .optional()
          .describe(`Max hits (default ${SEARCH_LIMIT_DEFAULT}, max ${SEARCH_LIMIT_MAX})`),
      },
    },
    async (args) => {
      const q = args.query.trim().toLowerCase();
      if (!q) {
        return toolText({ hits: [], message: "Empty query; provide search text." });
      }
      const limit = args.limit ?? SEARCH_LIMIT_DEFAULT;
      const hits: { ko_number: string; preview: string }[] = [];
      for (const [id, ko] of index) {
        const blob = JSON.stringify(ko).toLowerCase();
        if (!blob.includes(q)) continue;
        const subject = typeof ko.subject === "string" ? ko.subject : "";
        hits.push({ ko_number: id, preview: subject.slice(0, 240) });
        if (hits.length >= limit) break;
      }
      return toolText({ hits, query: args.query, limit });
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
