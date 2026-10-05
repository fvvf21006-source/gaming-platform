import { useState, useEffect, useRef } from "react";
import { formatPoints } from "../../utils/points";
import { randomInt } from "../../utils/random";
import { useSettle } from "./useSettle";

interface Props {
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

interface Symbol {
  char: string;
  name: string;
  multiplier: number;
}

// Three reels, six equally likely symbols (216 combinations).
// Triple payouts: (20+10+5+3+2+8)/216 = 0.222; any pair pays 1.5x with
// probability 90/216 = 0.417 → 0.625. RTP ≈ 0.847.
const SYMBOLS: Symbol[] = [
  { char: "💎", name: "Diamond", multiplier: 20 },
  { char: "7️⃣", name: "Seven", multiplier: 10 },
  { char: "🔔", name: "Bell", multiplier: 5 },
  { char: "🍒", name: "Cherry", multiplier: 3 },
  { char: "🍋", name: "Lemon", multiplier: 2 },
  { char: "⭐", name: "Star", multiplier: 8 },
];
const PAIR_MULTIPLIER = 1.5;
const REEL_STOP_MS = [900, 1500, 2100];
const TICK_MS = 80;

const randomSymbol = () => SYMBOLS[randomInt(SYMBOLS.length)];

function payoutFor([a, b, c]: Symbol[]): { multiplier: number; label: string } {
  if (a.char === b.char && b.char === c.char) return { multiplier: a.multiplier, label: `Triple ${a.name}!` };
  if (a.char === b.char || b.char === c.char || a.char === c.char) return { multiplier: PAIR_MULTIPLIER, label: "Pair" };
  return { multiplier: 0, label: "No match" };
}

export default function SlotMachine({ pointCost, onComplete, onCancel }: Props) {
  const [reels, setReels] = useState(["💎", "7️⃣", "🍒"]);
  const [stopped, setStopped] = useState([true, true, true]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ multiplier: number; won: number; label: string } | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const settle = useSettle(onComplete);

  useEffect(
    () => () => {
      timeouts.current.forEach(clearTimeout);
      if (ticker.current) clearInterval(ticker.current);
    },
    []
  );

  const spin = () => {
    if (spinning || result) return;
    setSpinning(true);
    setStopped([false, false, false]);

    // The outcome is decided up front; the animation only reveals it.
    const final = [randomSymbol(), randomSymbol(), randomSymbol()];
    const live = [true, true, true];

    ticker.current = setInterval(() => {
      setReels((prev) => prev.map((ch, i) => (live[i] ? randomSymbol().char : ch)));
    }, TICK_MS);

    REEL_STOP_MS.forEach((ms, i) => {
      timeouts.current.push(
        setTimeout(() => {
          live[i] = false;
          setReels((prev) => prev.map((ch, j) => (j === i ? final[i].char : ch)));
          setStopped((prev) => prev.map((s, j) => (j === i ? true : s)));

          if (i === REEL_STOP_MS.length - 1) {
            if (ticker.current) clearInterval(ticker.current);
            const { multiplier, label } = payoutFor(final);
            const won = Math.round(pointCost * multiplier);
            setSpinning(false);
            setResult({ multiplier, won, label });
            settle(won);
          }
        }, ms)
      );
    });
  };

  const winning = Boolean(result && result.multiplier > 0);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950 text-white rounded-2xl border border-amber-500/30 shadow-2xl w-full max-w-md mx-auto">
      <h2 className="text-2xl font-black text-amber-400 tracking-wider">🎰 VEGAS SLOTS</h2>
      <p className="text-xs text-slate-400 mt-1 mb-5">
        Match 3 for the jackpot — pairs pay {PAIR_MULTIPLIER}x (buy-in {formatPoints(pointCost)} pts)
      </p>

      <div className="flex items-center justify-center gap-3 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl border-4 border-amber-500/50 shadow-inner w-full">
        {reels.map((symbol, idx) => (
          <div
            key={idx}
            className={`w-24 h-28 bg-slate-950 rounded-xl border-2 flex items-center justify-center text-5xl shadow-2xl transition-all ${
              winning
                ? "border-emerald-400 scale-105"
                : stopped[idx]
                  ? "border-amber-400/60 scale-100"
                  : "border-slate-600 scale-95 blur-[1px]"
            }`}
          >
            {symbol}
          </div>
        ))}
      </div>

      <div className="h-16 mt-4 flex flex-col items-center justify-center text-center" aria-live="polite">
        {result && (
          <>
            <p className="text-sm font-semibold text-slate-300">
              {result.label}
              {result.multiplier > 0 ? ` · ${result.multiplier}x` : ""}
            </p>
            <p className={`text-2xl font-black ${result.won > 0 ? "text-emerald-400" : "text-slate-400"}`}>
              {result.won > 0 ? `+${formatPoints(result.won)} pts` : "0 pts"}
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 w-full">
        <button
          onClick={onCancel}
          disabled={spinning || Boolean(result)}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors disabled:opacity-50"
        >
          Exit
        </button>
        <button
          onClick={spin}
          disabled={spinning || Boolean(result)}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
        >
          {spinning ? "SPINNING…" : "PULL LEVER"}
        </button>
      </div>
    </div>
  );
}
