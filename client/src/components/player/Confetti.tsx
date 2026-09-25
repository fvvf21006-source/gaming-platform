import { useMemo } from "react";

const COLORS = ["#FFD166", "#FF2D78", "#00D4FF", "#3DFF9A", "#8B5CF6", "#FF9F45"];

export default function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        dur: 2.2 + Math.random() * 2,
        dx: (Math.random() - 0.5) * 240,
        rot: 360 + Math.random() * 720,
        delay: Math.random() * 0.6,
        round: Math.random() > 0.5,
      })),
    [count]
  );
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${p.left}%`, background: p.color, borderRadius: p.round ? "50%" : 2, animationDelay: `${p.delay}s`,
            ["--dur" as string]: `${p.dur}s`, ["--dx" as string]: `${p.dx}px`, ["--rot" as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </>
  );
}
