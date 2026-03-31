import { useCallback, useState } from "react";

export function App() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const kos = await window.app.listCorpusKos();
      setCount(kos.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCount(null);
    }
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: "1.5rem" }}>
      <h1>Sherpa</h1>
      <p style={{ color: "#444" }}>
        Phase 2 shell — corpus loader IPC (40 production KOs expected).
      </p>
      <button type="button" onClick={load}>
        Count corpus KOs
      </button>
      {count !== null && (
        <p>
          <strong>{count}</strong> KO(s) under <code>knowledge-objects/corpus/</code>
        </p>
      )}
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
    </div>
  );
}
