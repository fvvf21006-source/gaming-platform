import { useState } from "react";
import { formatPoints } from "../../utils/points";

interface Props {
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const SYMBOLS = [
  { char: "💎", name: "Diamond", multiplier: 20 },
  { char: "7️⃣", name: "Seven", multiplier: 10 },
  { char: "🔔", name: "Bell", multiplier: 5 },
  { char: "🍒", name: "Cherry", multiplier: 3 },
  { char: "🍋", name: "Lemon", multiplier: 2 },
  { char: "⭐", name: "Star", multiplier: 8 },
];

export default function SlotMachine({ pointCost, onComplete, onCancel }: Props) {
  const [reels, setReels] = useState(["💎", "7️⃣", "🍒"]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ multiplier: number; won: number } | null>(null);

  const spin = () => {
    if (spinning || result) return;
    setSpinning(true);

    let counter = 0;
    const interval = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char,
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].char,
      ]);
      counter++;
      if (counter > 20) {
        clearInterval(interval);
        // Final reel calculation
        const finalReels = [
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        ];
        setReels(finalReels.map((r) => r.char));
        setSpinning(false);

        let multiplier = 0;
        if (finalReels[0].char === finalReels[1].char && finalReels[1].char === finalReels[2].char) {
          // 3 of a kind
          multiplier = finalReels[0].multiplier;
        } else if (
          finalReels[0].char === finalReels[1].char ||
          finalReels[1].char === finalReels[2].char ||
          finalReels[0].char === finalReels[2].char
        ) {
          // 2 of a kind
          multiplier = 1.5;
        }

        const won = Math.round(pointCost * multiplier);
        setResult({ multiplier, won });
        setTimeout(() => {
          onComplete(won);
        }, 1500);
      }
    }, 80);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950 text-white rounded-2xl border border-amber-500/30 shadow-2xl max-w-md mx-auto">
      <h2 className="text-2xl font-black text-amber-400 tracking-wider flex items-center gap-2">
        🎰 VEGAS SLOTS
      </h2>
      <p className="text-xs text-slate-400 mt-1 mb-6">
        Match 3 symbols for Mega Jackpot! (Entry: {formatPoints(pointCost)} pts)
      </p>

      {/* Reel Box */}
      <div className="flex items-center justify-center gap-3 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border-4 border-amber-500/50 shadow-inner w-full">
        {reels.map((symbol, idx) => (
          <div
            key={idx}
            className={`w-24 h-28 bg-slate-950 rounded-xl border-2 border-amber-400/40 flex items-center justify-center text-5xl shadow-2xl transition-all ${
              spinning ? "animate-pulse scale-95" : "scale-100"
            }`}
          >
            {symbol}
          </div>
        ))}
      </div>

      {result && (
        <div className="mt-6 text-center animate-bounce">
          <p className="text-sm font-semibold text-slate-300">
            {result.multiplier > 0 ? `${result.multiplier}x Multiplier Hit!` : "No Match"}
          </p>
          <p className={`text-2xl font-black ${result.won > 0 ? "text-emerald-400" : "text-slate-400"}`}>
            {result.won > 0 ? `+${formatPoints(result.won)} Points Won!` : "0 Points"}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-4 mt-8 w-full">
        <button
          onClick={onCancel}
          disabled={spinning}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors disabled:opacity-50"
        >
          Exit
        </button>
        <button
          onClick={spin}
          disabled={spinning || Boolean(result)}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
        >
          {spinning ? "SPINNING..." : "PULL LEVER"}
        </button>
      </div>
    </div>
  );
}
