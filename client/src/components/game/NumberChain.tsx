import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  size?: number;
  onFinish: (score: number) => void;
  onScore?: (score: number) => void;
}

const MAX_SCORE = 3000;

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function NumberChain({ size = 16, onFinish, onScore }: Props) {
  const order = useMemo(() => shuffled(size), [size]);
  const [next, setNext] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(performance.now());
  const doneRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      if (!doneRef.current) setElapsed(performance.now() - startRef.current);
    }, 100);
    return () => clearInterval(t);
  }, []);

  const scoreFor = (ms: number, misses: number) =>
    Math.max(100, Math.min(MAX_SCORE, MAX_SCORE - Math.round(ms / 10) - misses * 150));

  const tap = (n: number) => {
    if (doneRef.current || n < next) return;
    if (n !== next) {
      setMistakes((m) => m + 1);
      setWrong(n);
      setTimeout(() => setWrong(null), 300);
      return;
    }
    if (n === size) {
      doneRef.current = true;
      const ms = performance.now() - startRef.current;
      setElapsed(ms);
      setNext(n + 1);
      const final = scoreFor(ms, mistakes);
      onScore?.(final);
      setTimeout(() => onFinish(final), 800);
      return;
    }
    setNext(n + 1);
  };

  const cols = Math.round(Math.sqrt(size));

  return (
    <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Stat label="Find" value={next > size ? "✓" : String(next)} color="#00D4FF" />
        <Stat label="Time" value={`${(elapsed / 1000).toFixed(1)}s`} color="#FFD166" />
        <Stat label="Misses" value={String(mistakes)} color={mistakes ? "#FF2D78" : "#3DFF9A"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
        {order.map((n) => {
          const found = n < next;
          return (
            <button
              key={n}
              onClick={() => tap(n)}
              className={`tile-btn ${wrong === n ? "shake" : ""}`}
              style={{
                aspectRatio: "1", borderRadius: 16, fontSize: 28, fontWeight: 900, cursor: found ? "default" : "pointer",
                fontFamily: "'JetBrains Mono',monospace",
                border: `2px solid ${wrong === n ? "#FF2D78" : found ? "rgba(61,255,154,.5)" : "rgba(255,255,255,.18)"}`,
                background: found ? "rgba(61,255,154,.14)" : "linear-gradient(135deg,#221d3a,#171428)",
                color: found ? "rgba(61,255,154,.55)" : "#fff",
                boxShadow: wrong === n ? "0 0 20px rgba(255,45,120,.6)" : "none",
              }}
            >
              {found ? "✓" : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#9A94A8", fontWeight: 700 }}>{label}</div>
      <div className="font-mono-data" style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
