import React, { useCallback, useMemo, useState } from "react";

/** Mirrors main-process `session:startRandom` payload (keep in sync with `electron/preload.ts`). */
type SessionPayload = {
  sessionId: string;
  ko_number: string;
  displayName: string;
  issueSummary: string;
  fmno: string;
};

type Phase = "idle" | "awaiting_tech_intro" | "live" | "scorecard";

type TranscriptRole = "technician" | "customer" | "mentor";

type ChatRow = {
  id: string;
  role: TranscriptRole;
  content: string;
};

type EvaluationResult = {
  atsScores: {
    technicalKnowledge: number;
    logicalThinking: number;
    rootCause: number;
  };
  weightedScore: number;
  outcomeLabel: "Pass" | "Needs Improvement";
  coachingNotes: {
    overall: string;
    perFactor?: {
      technicalKnowledge?: string;
      logicalThinking?: string;
      rootCause?: string;
    };
  };
  learningBehavior: string;
  gradingIntegrity: string;
  demoExport: Record<string, unknown>;
};

const font = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function toTranscriptLines(rows: ChatRow[]): { role: TranscriptRole; content: string }[] {
  return rows.map((r) => ({ role: r.role, content: r.content }));
}

export function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [transcript, setTranscript] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scorecard, setScorecard] = useState<EvaluationResult | null>(null);

  const sessionActive = session !== null;

  const startRandomScenario = useCallback(async () => {
    setError(null);
    setScorecard(null);
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

  const sendTechnicianMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || !session || busy) return;

    const techRow: ChatRow = {
      id: crypto.randomUUID(),
      role: "technician",
      content: text,
    };

    const nextTranscript = [...transcript, techRow];
    setTranscript(nextTranscript);
    setDraft("");
    setBusy(true);
    setError(null);

    try {
      const { customerMessage, mentorNuclearMessage } = await window.app.chatPersonaTurn({
        session,
        transcript: toTranscriptLines(nextTranscript),
      });

      const customerRow: ChatRow = {
        id: crypto.randomUUID(),
        role: "customer",
        content: customerMessage,
      };
      let withCustomer = [...nextTranscript, customerRow];

      if (mentorNuclearMessage?.trim()) {
        withCustomer = [
          ...withCustomer,
          {
            id: crypto.randomUUID(),
            role: "mentor",
            content: mentorNuclearMessage.trim(),
          },
        ];
      }

      setTranscript(withCustomer);
      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTranscript(transcript);
    } finally {
      setBusy(false);
    }
  }, [draft, session, transcript, busy]);

  const onEndSession = useCallback(async () => {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.app.chatEvaluate({
        session,
        transcript: toTranscriptLines(transcript),
      });
      setScorecard(result);
      setPhase("scorecard");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      window.alert(
        "Evaluation could not be completed. Check Ollama is running, or API keys in .env — see console logs.",
      );
      setSession(null);
      setTranscript([]);
      setPhase("idle");
      setScorecard(null);
    } finally {
      setBusy(false);
    }
  }, [session, transcript, busy]);

  const onStuck = useCallback(async () => {
    if (!session || phase !== "live" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { mentorMessage } = await window.app.chatMentorStuck({
        session,
        transcript: toTranscriptLines(transcript),
      });
      const hint: ChatRow = {
        id: crypto.randomUUID(),
        role: "mentor",
        content: mentorMessage,
      };
      setTranscript((prev) => [...prev, hint]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [session, phase, transcript, busy]);

  const dismissScorecard = useCallback(() => {
    setSession(null);
    setTranscript([]);
    setPhase("idle");
    setScorecard(null);
    setDraft("");
  }, []);

  const stuckDisabled = phase !== "live" || busy;
  const sendDisabled = !sessionActive || !draft.trim() || busy;

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
        <div style={{ fontWeight: 600, marginTop: "0.35rem" }}>{session.displayName}</div>
        <div style={{ marginTop: "0.35rem", fontSize: "0.95rem" }}>{session.issueSummary}</div>
      </header>
    );
  }, [session]);

  if (phase === "scorecard" && scorecard && session) {
    return (
      <div style={{ fontFamily: font, height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem", flex: 1, overflow: "auto", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ marginTop: 0 }}>Session results</h2>
          <p style={{ fontSize: "1.25rem" }}>
            <strong>{scorecard.outcomeLabel}</strong>
            <span style={{ marginLeft: "1rem", color: "#444" }}>
              Weighted score: <strong>{scorecard.weightedScore.toFixed(2)}</strong> (Pass ≥ 4.0)
            </span>
          </p>
          <p style={{ color: "#555" }}>
            ATS — Technical: {scorecard.atsScores.technicalKnowledge} · Logical:{" "}
            {scorecard.atsScores.logicalThinking} · Root cause: {scorecard.atsScores.rootCause}
          </p>
          <p style={{ fontSize: "0.85rem", color: "#666" }}>
            Grading integrity: {scorecard.gradingIntegrity}
          </p>
          <h3>Coaching</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{scorecard.coachingNotes.overall}</p>
          <h3>Learning behavior</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{scorecard.learningBehavior}</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  JSON.stringify(scorecard.demoExport, null, 2),
                );
                window.alert("Demo export JSON copied to clipboard.");
              } catch {
                window.alert("Could not copy to clipboard.");
              }
            }}
          >
            Copy demo export JSON
          </button>
          <button type="button" onClick={dismissScorecard}>
            Done
          </button>
        </div>
        </div>
      </div>
    );
  }

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
        <button type="button" onClick={startRandomScenario} disabled={busy}>
          Start Random Scenario
        </button>
        <button type="button" onClick={onEndSession} disabled={!sessionActive || busy}>
          End Session / Grade Me
        </button>
        <button type="button" onClick={onStuck} disabled={stuckDisabled}>
          I’m stuck — mentor hint
        </button>
        {stuckDisabled && sessionActive && phase === "awaiting_tech_intro" && (
          <span style={{ fontSize: "0.8rem", color: "#666" }}>
            (Mentor hint unlocks after the first exchange.)
          </span>
        )}
        {busy && <span style={{ fontSize: "0.85rem", color: "#666" }}>Working…</span>}
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
            <code>knowledge-objects/corpus/</code>. For local Ollama use{" "}
            <code>SHERPA_LLM_PROVIDER=ollama</code> — see <code>.env.example</code>.
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
            disabled={!sessionActive || busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendTechnicianMessage();
            }}
          />
          <button type="button" onClick={() => void sendTechnicianMessage()} disabled={sendDisabled}>
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
        <div style={{ fontSize: "0.7rem", color: "#666", marginBottom: "0.25rem" }}>{label}</div>
        {row.content}
      </div>
    </div>
  );
}
