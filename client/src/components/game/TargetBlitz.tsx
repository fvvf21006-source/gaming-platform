import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  seconds?: number;
  onFinish: (score: number) => void;
  onScore?: (score: number) => void;
}

interface Target { id: number; x: number; y: number; size: number; born: number; hue: number }

const LIFETIME = 1100;
const MAX_SCORE = 5000;

export default function TargetBlitz({ seconds = 20, onFinish, onScore }: Props) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [floaters, setFloaters] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [done, setDone] = useState(false);
  const idRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const spawn = useCallback(() => {
    if (doneRef.current) return;
    const id = ++idRef.current;
    setTarget({
      id,
      x: 8 + Math.random() * 84,
      y: 12 + Math.random() * 76,
      size: 54 + Math.random() * 34,
      born: performance.now(),
      hue: Math.floor(Math.random() * 360),
    });
    if (missTimer.current) clearTimeout(missTimer.current);
    missTimer.current = setTimeout(() => {
      comboRef.current = 0;
      setCombo(0);
      spawn();
    }, LIFETIME);
  }, []);

  useEffect(() => {
    spawn();
    const tick = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tick);
          doneRef.current = true;
          if (missTimer.current) clearTimeout(missTimer.current);
          setTarget(null);
          setDone(true);
          setTimeout(() => onFinish(Math.min(MAX_SCORE, scoreRef.current)), 900);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      clearInterval(tick);
      if (missTimer.current) clearTimeout(missTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hit = (t: Target) => {
    if (doneRef.current) return;
    const speedBonus = Math.round(Math.max(0, 1 - (performance.now() - t.born) / LIFETIME) * 60);
    const nextCombo = comboRef.current + 1;
    comboRef.current = nextCombo;
    const gained = 100 + speedBonus + Math.min(nextCombo - 1, 10) * 10;
    scoreRef.current += gained;
    setScore(scoreRef.current);
    onScore?.(scoreRef.current);
    setCombo(nextCombo);
    const fid = ++idRef.current;
    setFloaters((f) => [...f, { id: fid, x: t.x, y: t.y, text: `+${gained}` }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== fid)), 700);
    spawn();
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stat label="Time" value={`${timeLeft}s`} color={timeLeft <= 5 ? "#FF2D78" : "#FFD166"} />
        <Stat label="Combo" value={combo > 1 ? `x${combo} 🔥` : "—"} color="#00D4FF" />
        <Stat label="Score" value={score.toLocaleString()} color="#3DFF9A" />
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(timeLeft / seconds) * 100}%`, background: "linear-gradient(90deg,#FF2D78,#FFD166)", transition: "width 1s linear" }} />
      </div>
      <div
        style={{
          position: "relative", width: "100%", height: "min(52vh, 380px)", borderRadius: 26, overflow: "hidden", touchAction: "manipulation",
          border: "1px solid rgba(255,255,255,.12)",
          backgroundImage: "radial-gradient(circle at 50% 50%, #2a1748, #10091f), linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 40px 40px, 40px 40px",
        }}
      >
        {target && (
          <button
            key={target.id}
            className="target-pop"
            aria-label="Target"
            onPointerDown={() => hit(target)}
            style={{
              position: "absolute", left: `${target.x}%`, top: `${target.y}%`, width: target.size, height: target.size,
              transform: "translate(-50%,-50%)", borderRadius: "50%", cursor: "crosshair", padding: 0,
              border: "4px solid #fff",
              background: `radial-gradient(circle, #fff 0 18%, hsl(${target.hue} 95% 60%) 20% 55%, #fff 57% 68%, hsl(${target.hue} 95% 55%) 70%)`,
              boxShadow: `0 0 26px hsl(${target.hue} 100% 60% / .8)`,
            }}
          />
        )}
        {floaters.map((f) => (
          <div key={f.id} style={{ position: "absolute", left: `${f.x}%`, top: `${f.y}%`, transform: "translate(-50%,-140%)", color: "#FFD166", fontWeight: 900, fontSize: 22, pointerEvents: "none" }} className="fade-up">
            {f.text}
          </div>
        ))}
        {done && (
          <div className="pop-in" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(7,7,13,.6)", fontSize: 42, fontWeight: 900, color: "#FFD166" }}>
            TIME! ⏱️
          </div>
        )}
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
