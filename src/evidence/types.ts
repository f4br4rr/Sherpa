/**
 * Canonical EvidenceEvent shape — project-architecture-and-plan.md §3 (Tool outputs and retrieved KOs).
 */
export type EvidenceEvent = {
  eventId: string;
  sessionId: string;
  turnIndex?: number;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  error?: string;
  retrievedKoNumber?: string;
  flaggedForKoEnrichment?: boolean;
  proposedStepText?: string;
  smeReviewNote?: string;
  flaggedDebug?: boolean;
  createdAt: string;
};
