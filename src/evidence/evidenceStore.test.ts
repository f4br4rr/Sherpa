import { evidenceStore } from "./evidenceStore.js";
import type { EvidenceEvent } from "./types.js";

describe("evidenceStore", () => {
  beforeEach(() => {
    evidenceStore.clear();
  });

  it("appends and returns events", () => {
    const e: EvidenceEvent = {
      eventId: "e1",
      sessionId: "s1",
      toolName: "get_ko",
      toolInput: { ko_number: "KO40001" },
      toolOutput: { ok: true },
      createdAt: new Date().toISOString(),
    };
    evidenceStore.append(e);
    expect(evidenceStore.getAll()).toHaveLength(1);
    expect(evidenceStore.getAll()[0].toolName).toBe("get_ko");
  });
});
