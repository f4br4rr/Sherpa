import type { EvidenceEvent } from "./types.js";

const events: EvidenceEvent[] = [];

export const evidenceStore = {
  append(event: EvidenceEvent): void {
    events.push(event);
  },

  /** Internal audit / tests — not exposed to technician UI. */
  getAll(): readonly EvidenceEvent[] {
    return events;
  },

  clear(): void {
    events.length = 0;
  },
};
