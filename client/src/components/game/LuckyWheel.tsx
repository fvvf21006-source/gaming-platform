import { useState, useEffect, useRef } from "react";
import { formatPoints } from "../../utils/points";

interface Props {
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const SEGMENTS = [
  { label: "0.5x", multiplier: 0.5, color: "#ef4444" },
  { label: "1.2x", multiplier: 1.2, color: "#3b82f6" },
  { label: "2.0x", multiplier: 2.0, color: "#10b981" },
  { label: "0x", multiplier: 0, color: "#6b7280" },
  { label: "3.0x", multiplier: 3.0, color: "#8b5cf6" },
  { label: "1.5x", multiplier: 1.5, color: "#f59e0b" },
  { label: "5.0x", multiplier: 5.0, color: "#ec4899" },
  { label: "100x JACKPOT", multiplier: 100.0, color: "#f59e0b" },
];

export default function LuckyWheel({ pointCost, onComplete, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ multiplier: number; won: number } | null>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, []);

  const drawWheel = (rotationDeg: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const numSegments = SEGMENTS.length;
    const arcSize = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, width, height);

    // Draw Wheel background glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#38bdf8";
    ctx.stroke();
    ctx.restore();

    // Draw Segments
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotationDeg * Math.PI) / 180);

    for (let i = 0; i < numSegments; i++) {
      const angle = i * arcSize;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + arcSize);
      ctx.fillStyle = SEGMENTS[i].color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0f172a";
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.rotate(angle + arcSize / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(SEGMENTS[i].label, radius - 15, 5);
      ctx.restore();
    }
    ctx.restore();

    // Center hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fbbf24";
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", centerX, centerY);
    ctx.restore();

    // Top Pointer Arrow
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX - 12, 10);
    ctx.lineTo(centerX + 12, 10);
    ctx.lineTo(centerX, 32);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();
  };

  const spin = () => {
    if (spinning || result) return;
    setSpinning(true);

    // Pick random segment
    const selectedIdx = Math.floor(Math.random() * SEGMENTS.length);
    const selectedSeg = SEGMENTS[selectedIdx];

    const numSegments = SEGMENTS.length;
    const segmentDegree = 360 / numSegments;

    // Angle that puts selectedIdx at the top (270deg in standard canvas coords)
    const targetAngleOnWheel = selectedIdx * segmentDegree + segmentDegree / 2;
    const finalDegree = 360 * 5 + (270 - targetAngleOnWheel);

    const duration = 4000;
    const startTime = performance.now();
    const startRotation = rotationRef.current % 360;
    const totalRotation = finalDegree - startRotation;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRotation + totalRotation * easeOut;

      rotationRef.current = currentRot;
      drawWheel(currentRot);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const wonPoints = Math.round(pointCost * selectedSeg.multiplier);
        setResult({ multiplier: selectedSeg.multiplier, won: wonPoints });
        setTimeout(() => {
          onComplete(wonPoints);
        }, 1500);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl max-w-lg mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-black tracking-wide text-amber-400 flex items-center justify-center gap-2">
          🎡 LUCKY WHEEL OF FORTUNE
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Spin to win up to <span className="text-amber-400 font-bold">100x</span> your wager ({formatPoints(pointCost)} pts)
        </p>
      </div>

      <div className="relative my-4">
        <canvas ref={canvasRef} width={340} height={340} className="drop-shadow-lg" />
      </div>

      {result && (
        <div className="my-3 text-center animate-bounce">
          <p className="text-lg font-bold text-slate-300">Result: {result.multiplier}x</p>
          <p className={`text-2xl font-black ${result.won > 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {result.won > 0 ? `+${formatPoints(result.won)} Points Won!` : "Better Luck Next Time!"}
          </p>
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 w-full">
        <button
          onClick={onCancel}
          disabled={spinning}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 transition-colors disabled:opacity-50"
        >
          Exit Game
        </button>
        <button
          onClick={spin}
          disabled={spinning || Boolean(result)}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
        >
          {spinning ? "SPINNING..." : "SPIN NOW"}
        </button>
      </div>
    </div>
  );
}
