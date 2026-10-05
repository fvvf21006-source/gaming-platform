import { useState, useEffect, useRef } from "react";
import { formatPoints } from "../../utils/points";

interface Props {
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

export default function CrashGame({ pointCost, onComplete, onCancel }: Props) {
  const [multiplier, setMultiplier] = useState(1.0);
  const [running, setRunning] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutMult, setCashoutMult] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const crashPointRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const startRocket = () => {
    if (running || crashed || cashedOut) return;

    // Random crash point between 1.1x and 25x
    const randomCrash = Number((1.1 + Math.random() * Math.random() * 24).toFixed(2));
    crashPointRef.current = randomCrash;
    setRunning(true);

    const startTime = performance.now();

    const update = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      // Exponential rocket multiplier curve
      const currentMult = Number((1 + Math.pow(elapsedSec, 1.6) * 0.35).toFixed(2));

      if (currentMult >= crashPointRef.current) {
        // Crashed!
        setMultiplier(crashPointRef.current);
        setRunning(false);
        setCrashed(true);
        drawGraph(crashPointRef.current, true);
        setTimeout(() => {
          onComplete(0);
        }, 1800);
      } else {
        setMultiplier(currentMult);
        drawGraph(currentMult, false);
        animationFrameRef.current = requestAnimationFrame(update);
      }
    };

    animationFrameRef.current = requestAnimationFrame(update);
  };

  const handleCashOut = () => {
    if (!running || crashed || cashedOut) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setRunning(false);
    setCashedOut(true);
    setCashoutMult(multiplier);

    const won = Math.round(pointCost * multiplier);
    setTimeout(() => {
      onComplete(won);
    }, 1500);
  };

  const drawGraph = (currentMult: number, isCrashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Rocket Line
    const progress = Math.min((currentMult - 1) / 15, 1);
    const endX = 20 + progress * (w - 40);
    const endY = h - 20 - progress * (h - 40);

    ctx.beginPath();
    ctx.moveTo(20, h - 20);
    ctx.quadraticCurveTo(w / 2, h - 20, endX, endY);
    ctx.strokeStyle = isCrashed ? "#ef4444" : "#38bdf8";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Rocket Icon
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isCrashed ? "💥" : "🚀", endX, endY);
  };

  useEffect(() => {
    drawGraph(1.0, false);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950 text-white rounded-2xl border border-sky-500/30 shadow-2xl max-w-md mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-black text-sky-400 tracking-wide flex items-center justify-center gap-2">
          🚀 CRASH ROCKET
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Cash out before the rocket crashes! (Entry: {formatPoints(pointCost)} pts)
        </p>
      </div>

      <div className="relative my-2 w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
        <canvas ref={canvasRef} width={380} height={220} className="w-full h-auto" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
          <span className={`text-4xl font-black ${crashed ? "text-rose-500" : "text-sky-400"}`}>
            {multiplier.toFixed(2)}x
          </span>
        </div>
      </div>

      {crashed && <p className="text-rose-500 font-bold text-lg my-2 animate-bounce">💥 ROCKET CRASHED!</p>}
      {cashedOut && (
        <p className="text-emerald-400 font-bold text-lg my-2 animate-bounce">
          🎉 Cashed Out @ {cashoutMult.toFixed(2)}x (+{formatPoints(Math.round(pointCost * cashoutMult))} pts)!
        </p>
      )}

      <div className="flex items-center gap-3 mt-4 w-full">
        <button
          onClick={onCancel}
          disabled={running}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors disabled:opacity-50"
        >
          Exit
        </button>
        {!running && !crashed && !cashedOut ? (
          <button
            onClick={startRocket}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-lg shadow-lg shadow-sky-500/20 transition-all"
          >
            LAUNCH 🚀
          </button>
        ) : (
          <button
            onClick={handleCashOut}
            disabled={!running || crashed || cashedOut}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            CASH OUT
          </button>
        )}
      </div>
    </div>
  );
}
