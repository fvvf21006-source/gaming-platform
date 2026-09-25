import { useEffect, useRef, useState } from "react";

interface Props {
  rounds?: number;
  onFinish: (score: number) => void;
  onScore?: (score: number) => void;
}

type Phase = "waiting" | "ready" | "clicked" | "tooSoon";

const MAX_MS = 1000;

export default function ReflexGame({ rounds = 5, onFinish, onScore }: Props) {
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const armRound = () => {
    setPhase("waiting");
    timerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setPhase("ready");
    }, 700 + Math.random() * 1800);
  };

  useEffect(() => {
    armRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const handleClick = () => {
    if (phase === "tooSoon") return armRound();
    if (phase === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("tooSoon");
      return;
    }
    if (phase !== "ready") return;

    const elapsed = performance.now() - startTimeRef.current;
    const points = Math.max(0, Math.round(MAX_MS - Math.min(elapsed, MAX_MS)));
    setLastMs(Math.round(elapsed));
    setPhase("clicked");

    const nextScores = [...roundScores, points];
    setRoundScores(nextScores);
    const total = nextScores.reduce((a, b) => a + b, 0);
    onScore?.(total);

    timerRef.current = setTimeout(() => {
      if (round >= rounds) onFinish(total);
      else setRound((r) => r + 1);
    }, 900);
  };

  const cfg = {
    waiting: { bg: "linear-gradient(135deg,#2a2440,#171426)", icon: "✋", title: "Get ready…", sub: "Wait for green" },
    ready: { bg: "linear-gradient(135deg,#1FBF6B,#3DFF9A)", icon: "⚡", title: "TAP!", sub: "NOW NOW NOW" },
    tooSoon: { bg: "linear-gradient(135deg,#B0224E,#FF2D78)", icon: "💥", title: "Too early!", sub: "Tap to try this round again" },
    clicked: { bg: "linear-gradient(135deg,#0090B8,#00D4FF)", icon: "🎯", title: `${lastMs} ms`, sub: `+${roundScores[roundScores.length - 1] ?? 0} pts` },
  }[phase];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: rounds }, (_, i) => (
          <div key={i} style={{ width: 34, height: 8, borderRadius: 6, background: i < roundScores.length ? "#3DFF9A" : i === round - 1 ? "#FFD166" : "rgba(255,255,255,.14)", transition: "background .2s" }} />
        ))}
      </div>
      <button
        onClick={handleClick}
        className={phase === "ready" ? "glow-pulse" : ""}
        style={{
          width: "100%", height: "min(46vh, 340px)", borderRadius: 26, border: "1px solid rgba(255,255,255,.15)", background: cfg.bg,
          color: phase === "waiting" ? "#B9B2CC" : "#07070D", cursor: "pointer", transition: "background .12s",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Outfit',sans-serif",
        }}
      >
        <span style={{ fontSize: 64 }}>{cfg.icon}</span>
        <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: ".02em" }}>{cfg.title}</span>
        <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.8 }}>{cfg.sub}</span>
      </button>
      <div style={{ fontSize: 13, color: "#9A94A8" }}>Round {round} of {rounds}</div>
    </div>
  );
}
