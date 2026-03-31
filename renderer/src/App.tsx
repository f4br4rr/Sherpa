import React, { useCallback, useMemo, useState } from "react";

/** Mirrors main-process `session:startRandom` payload (keep in sync with `electron/preload.ts`). */
type SessionPayload = {
  ko_number: string;
  displayName: string;
  issueSummary: string;
  fmno: string;
};

type Phase = "idle" | "awaiting_tech_intro" | "live";

type TranscriptRole = "technician" | "customer" | "mentor";

type ChatRow = {
  id: string;
  role: TranscriptRole;
  content: string;
};

const STUB_CUSTOMER_OPEN =
  "Okay — I'm listening. What would you like me to try first?";

const font = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [transcript, setTranscript] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sessionActive = session !== null;

  const startRandomScenario = useCallback(async () => {
    setError(null);
    if (sessionActive) {
      const ok = window.confirm(
        "Discard the current session and start a new random scenario? Progress is not saved.",
      );
      if (!ok) return;
    }
    try {
      const next = await window.app.startRandomSession();
      setSession(next);
      setTranscript([]);
      setPhase("awaiting_tech_intro");
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSession(null);
      setPhase("idle");
    }
  }, [sessionActive]);

  const sendTechnicianMessage = useCallback(() => {
    const text = draft.trim();
    if (!text || !session) return;

    const techRow: ChatRow = {
      id: crypto.randomUUID(),
      role: "technician",
      content: text,
    };

    if (phase === "awaiting_tech_intro") {
      const customerRow: ChatRow = {
        id: crypto.randomUUID(),
        role: "customer",
        content: STUB_CUSTOMER_OPEN,
      };
      setTranscript((prev) => [...prev, techRow, customerRow]);
      setPhase("live");
    } else {
      setTranscript((prev) => [...prev, techRow]);
    }
    setDraft("");
  }, [draft, phase, session]);

  const onEndSession = useCallback(() => {
    window.alert(
      "End Session / Grade Me — Phase 4 will run the evaluator here. Session cleared for now.",
    );
    setSession(null);
    setTranscript([]);
    setPhase("idle");
    setDraft("");
  }, []);

  const onStuck = useCallback(() => {
    const hint: ChatRow = {
      id: crypto.randomUUID(),
      role: "mentor",
      content:
        "[Stub] Mentor hint — Phase 4 will call Persona B with full sentinel logic.",
    };
    setTranscript((prev) => [...prev, hint]);
  }, []);

  const stuckDisabled = phase !== "live";

  const header = useMemo(() => {
    if (!session) return null;
    return (
      <header
        style={{
          borderBottom: "1px solid #ddd",
          padding: "0.75rem 1rem",
          background: "#f8f9fa",
        }}
      >
        <div style={{ fontSize: "0.85rem", color: "#555" }}>
          Ticket <strong>{session.ko_number}</strong>
          <span style={{ margin: "0 0.5rem" }}>·</span>
          FMNO <strong>{session.fmno}</strong>
        </div>
        <div style={{ fontWeight: 600, marginTop: "0.35rem" }}>
          {session.displayName}
        </div>
        <div style={{ marginTop: "0.35rem", fontSize: "0.95rem" }}>
          {session.issueSummary}
        </div>
      </header>
    );
  }, [session]);

  return (
    <div style={{ fontFamily: font, height: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "0.5rem 1rem",
          borderBottom: "1px solid #eee",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button type="button" onClick={startRandomScenario}>
          Start Random Scenario
        </button>
        <button type="button" onClick={onEndSession} disabled={!sessionActive}>
          End Session / Grade Me
        </button>
        <button type="button" onClick={onStuck} disabled={stuckDisabled}>
          I’m stuck — mentor hint
        </button>
        {stuckDisabled && sessionActive && (
          <span style={{ fontSize: "0.8rem", color: "#666" }}>
            (Enabled after your first message enters live chat.)
          </span>
        )}
      </div>

      {header}

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "1rem",
          background: "#fff",
        }}
      >
        {!sessionActive && (
          <p style={{ color: "#555" }}>
            Press <strong>Start Random Scenario</strong> to bind a random KO from{" "}
            <code>knowledge-objects/corpus/</code> (examples never used). Close the window to
            hide in the tray; use the tray icon to show again.
          </p>
        )}
        {sessionActive && transcript.length === 0 && (
          <p style={{ color: "#555", textAlign: "center", marginTop: "2rem" }}>
            Chat is empty until you send the opening as the technician (technician-first UX).
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {transcript.map((row) => (
            <Bubble key={row.id} row={row} />
          ))}
        </div>
      </div>

      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #eee" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            style={{ flex: 1, padding: "0.5rem" }}
            placeholder={
              sessionActive
                ? phase === "awaiting_tech_intro"
                  ? "Type your introduction / opener as technician…"
                  : "Message as technician…"
                : "Start a scenario to chat"
            }
            value={draft}
            disabled={!sessionActive}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendTechnicianMessage();
            }}
          />
          <button
            type="button"
            onClick={sendTechnicianMessage}
            disabled={!sessionActive || !draft.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "0.5rem 1rem", color: "#b00020", background: "#fff0f0" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function Bubble({ row }: { row: ChatRow }) {
  const isTech = row.role === "technician";
  const isMentor = row.role === "mentor";
  const align = isTech ? "flex-end" : "flex-start";
  const bg = isTech ? "#e3f2fd" : isMentor ? "#fff8e1" : "#f1f3f4";
  const border = isMentor ? "1px solid #ffb300" : "1px solid #e0e0e0";
  const label = isTech ? "Technician" : isMentor ? "Mentor" : "End-user";

  return (
    <div style={{ display: "flex", justifyContent: align }}>
      <div
        style={{
          maxWidth: "78%",
          padding: "0.55rem 0.75rem",
          borderRadius: 8,
          background: bg,
          border,
          fontSize: "0.95rem",
        }}
      >
        <div style={{ fontSize: "0.7rem", color: "#666", marginBottom: "0.25rem" }}>
          {label}
        </div>
        {row.content}
      </div>
    </div>
  );
}
