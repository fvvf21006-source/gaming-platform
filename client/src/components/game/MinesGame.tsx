import { useState } from "react";
import { formatPoints } from "../../utils/points";

interface Props {
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const GRID_SIZE = 25; // 5x5 grid
const MINE_COUNT = 4; // 4 mines

export default function MinesGame({ pointCost, onComplete, onCancel }: Props) {
  const [mines] = useState<Set<number>>(() => {
    const set = new Set<number>();
    while (set.size < MINE_COUNT) {
      set.add(Math.floor(Math.random() * GRID_SIZE));
    }
    return set;
  });

  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [hitMine, setHitMine] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);

  // Multiplier formula based on safe tiles revealed
  const currentMultiplier = Number(
    (1 + (revealed.size * 0.45)).toFixed(2)
  );
  const currentPayout = Math.round(pointCost * currentMultiplier);

  const revealTile = (index: number) => {
    if (gameOver || revealed.has(index)) return;

    if (mines.has(index)) {
      // Hit mine - Lost!
      setHitMine(true);
      setGameOver(true);
      // Reveal all mines
      setRevealed(new Set(Array.from({ length: GRID_SIZE }, (_, i) => i)));
      setTimeout(() => {
        onComplete(0);
      }, 1800);
    } else {
      const nextRevealed = new Set(revealed);
      nextRevealed.add(index);
      setRevealed(nextRevealed);

      // If all safe tiles revealed
      if (nextRevealed.size === GRID_SIZE - MINE_COUNT) {
        setGameOver(true);
        setCashedOut(true);
        const finalPayout = Math.round(pointCost * 5.0);
        setTimeout(() => {
          onComplete(finalPayout);
        }, 1500);
      }
    }
  };

  const cashOut = () => {
    if (gameOver || revealed.size === 0) return;
    setGameOver(true);
    setCashedOut(true);
    // Reveal all mines
    setRevealed(new Set(Array.from({ length: GRID_SIZE }, (_, i) => i)));
    setTimeout(() => {
      onComplete(currentPayout);
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl max-w-md mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-black text-amber-400 tracking-wide flex items-center justify-center gap-2">
          💣 MINES FIELD
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Uncover safe tiles & cash out before hitting a mine! (Entry: {formatPoints(pointCost)} pts)
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2 my-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        {Array.from({ length: GRID_SIZE }).map((_, idx) => {
          const isRevealed = revealed.has(idx);
          const isMine = mines.has(idx);

          return (
            <button
              key={idx}
              disabled={gameOver || isRevealed}
              onClick={() => revealTile(idx)}
              className={`w-12 h-12 rounded-lg font-black text-lg flex items-center justify-center transition-all ${
                isRevealed
                  ? isMine
                    ? "bg-rose-600 text-white animate-bounce"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 shadow"
              }`}
            >
              {isRevealed ? (isMine ? "💣" : "💎") : "?"}
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between w-full my-3 px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-sm">
        <span className="text-slate-400">Current Multiplier: <strong className="text-amber-400">{currentMultiplier}x</strong></span>
        <span className="text-slate-400">Payout: <strong className="text-emerald-400">{formatPoints(currentPayout)} pts</strong></span>
      </div>

      {hitMine && (
        <p className="text-rose-400 font-bold text-lg my-2 animate-bounce">💥 KABOOM! You hit a mine!</p>
      )}

      {cashedOut && (
        <p className="text-emerald-400 font-bold text-lg my-2 animate-bounce">🎉 Cashed out +{formatPoints(currentPayout)} points!</p>
      )}

      <div className="flex items-center gap-3 mt-4 w-full">
        <button
          onClick={onCancel}
          disabled={gameOver}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors disabled:opacity-50"
        >
          Exit
        </button>
        <button
          onClick={cashOut}
          disabled={gameOver || revealed.size === 0}
          className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          CASH OUT
        </button>
      </div>
    </div>
  );
}
