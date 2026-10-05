import { useState, useEffect, useRef, useCallback } from "react";
import { formatPoints } from "../../utils/points";
import { randomInt, weightedIndex } from "../../utils/random";
import { useSettle } from "./useSettle";
import { useForcedOutcome } from "./useForcedOutcome";
import { payoutFor } from "./casinoConfig";

interface Props {
  sessionId?: string;
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

// 16 wedges on the wheel. Outcomes are drawn from PAYOUTS by weight (out of
// 1000) and then a matching wedge is chosen, so the odds are explicit:
// RTP = Σ(multiplier × weight) / 1000 = 0.935.
const PAYOUTS = [
  { multiplier: 100, weight: 2 },
  { multiplier: 10, weight: 8 },
  { multiplier: 5, weight: 20 },
  { multiplier: 3, weight: 40 },
  { multiplier: 2, weight: 70 },
  { multiplier: 1.5, weight: 80 },
  { multiplier: 1, weight: 100 },
  { multiplier: 0.5, weight: 150 },
  { multiplier: 0, weight: 530 },
];

const COLORS: Record<number, string> = {
  100: "#f59e0b", 10: "#ec4899", 5: "#8b5cf6", 3: "#3b82f6", 2: "#10b981",
  1.5: "#14b8a6", 1: "#64748b", 0.5: "#ef4444", 0: "#334155",
};

// Wedge layout: high and low payouts alternate so neighbours never match.
const WEDGE_ORDER = [0, 1, 0.5, 3, 0, 2, 1.5, 100, 0, 1, 0.5, 5, 0, 2, 1.5, 10];
const SEGMENTS = WEDGE_ORDER.map((m) => ({
  multiplier: m,
  label: `${m}x`,
  color: COLORS[m],
}));

const SPIN_MS = 4200;

export default function LuckyWheel({ sessionId, pointCost, onComplete, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ multiplier: number; won: number } | null>(null);
  const settle = useSettle(onComplete);
  const fetchForced = useForcedOutcome(sessionId);

  const drawWheel = useCallback((rotationDeg: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 15;
    const arc = (2 * Math.PI) / SEGMENTS.length;

    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#38bdf8";
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    SEGMENTS.forEach((seg, i) => {
      const a = i * arc;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, a, a + arc);
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0f172a";
      ctx.stroke();

      ctx.save();
      ctx.rotate(a + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(seg.label, radius - 12, 5);
      ctx.restore();
    });
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fbbf24";
    ctx.stroke();
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", cx, cy);

    ctx.beginPath();
    ctx.moveTo(cx - 12, 6);
    ctx.lineTo(cx + 12, 6);
    ctx.lineTo(cx, 30);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }, []);

  useEffect(() => {
    drawWheel(0);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [drawWheel]);

  const spin = async () => {
    if (spinning || result) return;
    setSpinning(true);

    // A supervisor can preset the result; otherwise the odds table decides.
    const forced = await fetchForced();
    const forcedSegments =
      forced === null ? [] : SEGMENTS.flatMap((s, i) => (payoutFor(pointCost, s.multiplier) === forced ? [i] : []));
    const outcome =
      forcedSegments.length > 0
        ? { multiplier: SEGMENTS[forcedSegments[0]].multiplier }
        : PAYOUTS[weightedIndex(PAYOUTS.map((p) => p.weight))];
    const candidates =
      forcedSegments.length > 0
        ? forcedSegments
        : SEGMENTS.flatMap((s, i) => (s.multiplier === outcome.multiplier ? [i] : []));
    const idx = candidates[randomInt(candidates.length)];

    // Land anywhere inside the wedge, not always dead centre.
    const wedgeDeg = 360 / SEGMENTS.length;
    const landing = idx * wedgeDeg + wedgeDeg * (0.15 + 0.7 * (randomInt(1000) / 1000));
    const startRotation = rotationRef.current % 360;
    // The pointer sits at 270° in canvas coordinates.
    const target = 360 * 6 + ((((270 - landing) % 360) + 360) % 360);
    const total = target - startRotation;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / SPIN_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      rotationRef.current = startRotation + total * eased;
      drawWheel(rotationRef.current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      const won = payoutFor(pointCost, outcome.multiplier);
      setSpinning(false);
      setResult({ multiplier: outcome.multiplier, won });
      settle(won);
    };
    frameRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl w-full max-w-lg mx-auto">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-black tracking-wide text-amber-400">🎡 LUCKY WHEEL</h2>
        <p className="text-xs text-slate-400 mt-1">
          Spin for up to <span className="text-amber-400 font-bold">100x</span> your {formatPoints(pointCost)} pt buy-in
        </p>
      </div>

      <canvas ref={canvasRef} width={340} height={340} className="drop-shadow-lg my-3 max-w-full h-auto" />

      <div className="h-16 flex flex-col items-center justify-center text-center" aria-live="polite">
        {result && (
          <>
            <p className="text-sm font-semibold text-slate-300">Landed on {result.multiplier}x</p>
            <p className={`text-2xl font-black ${result.won > 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {result.won > 0 ? `+${formatPoints(result.won)} pts` : "No win this time"}
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 w-full">
        <button
          onClick={onCancel}
          disabled={spinning || Boolean(result)}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 transition-colors disabled:opacity-50"
        >
          Exit
        </button>
        <button
          onClick={spin}
          disabled={spinning || Boolean(result)}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
        >
          {spinning ? "SPINNING…" : "SPIN NOW"}
        </button>
      </div>
    </div>
  );
}
