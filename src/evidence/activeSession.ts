/**
 * Bound session id for EvidenceEvents until a full session model exists (Phase 4+).
 */
let activeSessionId: string | null = null;

export function setActiveSessionId(id: string): void {
  activeSessionId = id;
}

export function getActiveSessionId(): string | null {
  return activeSessionId;
}

export function clearActiveSession(): void {
  activeSessionId = null;
}
