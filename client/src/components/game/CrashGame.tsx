import { useState, useEffect, useRef, useCallback } from "react";
import { formatPoints } from "../../utils/points";
import { randomFloat } from "../../utils/random";
import { MAX_MULTIPLIER, TARGET_RTP, payoutFor } from "./casinoConfig";
import { useForcedOutcome } from "./useForcedOutcome";
import { useSettle } from "./useSettle";

interface Props {
  sessionId?: string;
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

// Multiplier grows exponentially: 2x after ~5.8s, 10x after ~19s.
const GROWTH_PER_SEC = 0.12;

/**
 * Standard crash distribution: P(crash point >= m) = TARGET_RTP / m, so
 * cashing out at any fixed target returns ~96% on average. Anything that
 * rounds below 1.00x is an instant crash.
 */
function rollCrashPoint(): number {
  const raw = TARGET_RTP / (1 - randomFloat());
  return Math.min(Math.max(1, Math.floor(raw * 100) / 100), MAX_MULTIPLIER.crash);
}

type Phase = "ready" | "running" | "crashed" | "cashed";

export default function CrashGame({ sessionId, pointCost, onComplete, onCancel }: Props) {
  const [multiplier, setMultiplier] = useState(1);
  const [phase, setPhase] = useState<Phase>("ready");
  const [payout, setPayout] = useState(0);
  const [launching, setLaunching] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const crashPointRef = useRef(1);
  // Set when a supervisor preset a win: the multiplier the round must end on.
  const presetCashRef = useRef<{ multiplier: number; points: number } | null>(null);
  const liveMultRef = useRef(1);
  const elapsedRef = useRef(0);
  const trailRef = useRef<{ t: number; m: number }[]>([]);
  const settle = useSettle(onComplete);
  const fetchForced = useForcedOutcome(sessionId);

  const drawGraph = useCallback((elapsed: number, mult: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { width: w, height: h } = canvas;
    const pad = 24;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = pad; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = h - pad; y > 0; y -= 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Axes rescale as the rocket climbs so the curve always fits.
    const maxT = Math.max(6, elapsed * 1.15);
    const maxM = Math.max(2, mult * 1.2);
    const px = (t: number) => pad + (t / maxT) * (w - pad * 2);
    const py = (m: number) => h - pad - ((m - 1) / (maxM - 1)) * (h - pad * 2);

    const trail = trailRef.current;
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(px(trail[0].t), py(trail[0].m));
      trail.forEach((p) => ctx.lineTo(px(p.t), py(p.m)));
      ctx.strokeStyle = crashed ? "#ef4444" : "#38bdf8";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    ctx.font = "26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(crashed ? "💥" : "🚀", px(elapsed), py(mult));
  }, []);

  useEffect(() => {
    drawGraph(0, 1, false);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [drawGraph]);

  const endCashedOut = (atMultiplier: number, points: number) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    liveMultRef.current = atMultiplier;
    trailRef.current.push({ t: elapsedRef.current, m: atMultiplier });
    setMultiplier(atMultiplier);
    setPayout(points);
    setPhase("cashed");
    drawGraph(elapsedRef.current, atMultiplier, false);
    settle(points);
  };

  const launch = async () => {
    if (phase !== "ready" || launching) return;
    setLaunching(true);

    // A supervisor can preset the result: 0 crashes the rocket straight away,
    // anything else flies to that multiplier and cashes out there.
    const forced = await fetchForced();
    presetCashRef.current = null;
    if (forced === null) {
      crashPointRef.current = rollCrashPoint();
    } else if (forced === 0) {
      crashPointRef.current = 1;
    } else {
      const target = Math.max(1, forced / pointCost);
      presetCashRef.current = { multiplier: Number(target.toFixed(2)), points: forced };
      crashPointRef.current = target + 1;
    }

    trailRef.current = [{ t: 0, m: 1 }];
    setLaunching(false);
    setPhase("running");

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      elapsedRef.current = elapsed;
      const mult = Math.exp(GROWTH_PER_SEC * elapsed);
      const crashAt = crashPointRef.current;
      const preset = presetCashRef.current;

      if (preset && mult >= preset.multiplier) {
        endCashedOut(preset.multiplier, preset.points);
        return;
      }

      if (mult >= crashAt) {
        liveMultRef.current = crashAt;
        trailRef.current.push({ t: elapsed, m: crashAt });
        setMultiplier(crashAt);
        setPhase("crashed");
        drawGraph(elapsed, crashAt, true);
        settle(0);
        return;
      }

      const shown = Math.floor(mult * 100) / 100;
      liveMultRef.current = shown;
      trailRef.current.push({ t: elapsed, m: mult });
      setMultiplier(shown);
      drawGraph(elapsed, mult, false);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const cashOut = () => {
    if (phase !== "running") return;
    // Read the ref, not state: state can lag a frame behind what the player saw.
    const preset = presetCashRef.current;
    if (preset) endCashedOut(preset.multiplier, preset.points);
    else endCashedOut(liveMultRef.current, payoutFor(pointCost, liveMultRef.current));
  };

  const crashed = phase === "crashed";

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950 text-white rounded-2xl border border-sky-500/30 shadow-2xl w-full max-w-md mx-auto">
      <div className="text-center mb-3">
        <h2 className="text-2xl font-black text-sky-400 tracking-wide">🚀 CRASH ROCKET</h2>
        <p className="text-xs text-slate-400 mt-1">
          Cash out before the rocket crashes! (buy-in {formatPoints(pointCost)} pts)
        </p>
      </div>

      <div className="relative w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
        <canvas ref={canvasRef} width={380} height={220} className="w-full h-auto" />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <span className={`text-4xl font-black tabular-nums ${crashed ? "text-rose-500" : phase === "cashed" ? "text-emerald-400" : "text-sky-400"}`}>
            {multiplier.toFixed(2)}x
          </span>
          {phase === "running" && (
            <div className="text-xs text-emerald-300 font-semibold">
              Cash out now: {formatPoints(payoutFor(pointCost, multiplier))} pts
            </div>
          )}
        </div>
      </div>

      <div className="h-10 mt-2 text-center" aria-live="polite">
        {crashed && <p className="text-rose-500 font-bold text-lg">💥 Crashed at {multiplier.toFixed(2)}x</p>}
        {phase === "cashed" && (
          <p className="text-emerald-400 font-bold text-lg">
            🎉 Cashed out @ {multiplier.toFixed(2)}x (+{formatPoints(payout)} pts)
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2 w-full">
        <button
          onClick={onCancel}
          disabled={phase !== "ready" || launching}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors disabled:opacity-50"
        >
          Exit
        </button>
        {phase === "ready" ? (
          <button
            onClick={launch}
            disabled={launching}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-lg shadow-lg shadow-sky-500/20 transition-all disabled:opacity-60"
          >
            {launching ? "LAUNCHING…" : "LAUNCH 🚀"}
          </button>
        ) : (
          <button
            onClick={cashOut}
            disabled={phase !== "running"}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            CASH OUT
          </button>
        )}
      </div>
    </div>
  );
}
