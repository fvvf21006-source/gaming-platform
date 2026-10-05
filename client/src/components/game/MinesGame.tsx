import { useState } from "react";
import { formatPoints } from "../../utils/points";
import { randomInt } from "../../utils/random";
import { MAX_MULTIPLIER, TARGET_RTP } from "./casinoConfig";
import { useSettle } from "./useSettle";

interface Props {
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const GRID_SIZE = 25; // 5x5
const MINE_COUNT = 4;
const SAFE_TILES = GRID_SIZE - MINE_COUNT;

/**
 * Fair multiplier after `safeRevealed` safe tiles: the inverse of the
 * probability of surviving that many picks, scaled by the target RTP, so
 * cashing out at any point has the same expected return (~96%).
 */
function multiplierFor(safeRevealed: number): number {
  if (safeRevealed === 0) return 1;
  let survive = 1;
  for (let i = 0; i < safeRevealed; i++) survive *= (SAFE_TILES - i) / (GRID_SIZE - i);
  return Math.min(Number((TARGET_RTP / survive).toFixed(2)), MAX_MULTIPLIER.mines);
}

function placeMines(): Set<number> {
  const set = new Set<number>();
  while (set.size < MINE_COUNT) set.add(randomInt(GRID_SIZE));
  return set;
}

type Phase = "playing" | "lost" | "cashed";

export default function MinesGame({ pointCost, onComplete, onCancel }: Props) {
  const [mines] = useState(placeMines);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("playing");
  const [payout, setPayout] = useState(0);
  const settle = useSettle(onComplete);

  const safeCount = revealed.size - (phase === "lost" ? 1 : 0);
  const multiplier = multiplierFor(phase === "lost" ? 0 : revealed.size);
  const currentPayout = Math.round(pointCost * multiplier);
  const nextMultiplier = multiplierFor(revealed.size + 1);
  const over = phase !== "playing";

  const finish = (next: Phase, won: number) => {
    setPhase(next);
    setPayout(won);
    settle(won);
  };

  const revealTile = (index: number) => {
    if (over || revealed.has(index)) return;
    const next = new Set(revealed).add(index);
    setRevealed(next);

    if (mines.has(index)) {
      finish("lost", 0);
    } else if (next.size === SAFE_TILES) {
      finish("cashed", Math.round(pointCost * multiplierFor(next.size)));
    }
  };

  const cashOut = () => {
    if (over || revealed.size === 0) return;
    finish("cashed", currentPayout);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl w-full max-w-md mx-auto">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-black text-amber-400 tracking-wide">💣 MINES FIELD</h2>
        <p className="text-xs text-slate-400 mt-1">
          {MINE_COUNT} mines hidden in {GRID_SIZE} tiles. Cash out before you hit one! (buy-in {formatPoints(pointCost)} pts)
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 my-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        {Array.from({ length: GRID_SIZE }).map((_, idx) => {
          const picked = revealed.has(idx);
          const showMine = mines.has(idx) && (picked || over);
          const showGem = !mines.has(idx) && (picked || over);
          return (
            <button
              key={idx}
              disabled={over || picked}
              onClick={() => revealTile(idx)}
              aria-label={picked ? (mines.has(idx) ? "Mine" : "Safe tile") : `Tile ${idx + 1}`}
              className={`w-12 h-12 rounded-lg font-black text-lg flex items-center justify-center transition-all ${
                showMine
                  ? `bg-rose-600 text-white ${picked ? "animate-bounce" : "opacity-60"}`
                  : showGem
                    ? `bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 ${picked ? "" : "opacity-40"}`
                    : "bg-slate-800 hover:bg-slate-700 hover:-translate-y-0.5 text-slate-400 border border-slate-700 shadow"
              }`}
            >
              {showMine ? "💣" : showGem ? "💎" : "?"}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 w-full text-center text-xs">
        <Stat label="Safe tiles" value={`${Math.max(safeCount, 0)}/${SAFE_TILES}`} />
        <Stat label="Multiplier" value={`${multiplier.toFixed(2)}x`} accent="text-amber-400" />
        <Stat label={over ? "Result" : "Cash out"} value={`${formatPoints(over ? payout : currentPayout)} pts`} accent="text-emerald-400" />
      </div>
      {!over && (
        <p className="text-[11px] text-slate-500 mt-2">Next safe tile pays {nextMultiplier.toFixed(2)}x</p>
      )}

      <div className="h-8 mt-2 text-center" aria-live="polite">
        {phase === "lost" && <p className="text-rose-400 font-bold text-lg">💥 KABOOM! You hit a mine.</p>}
        {phase === "cashed" && <p className="text-emerald-400 font-bold text-lg">🎉 Cashed out +{formatPoints(payout)} pts!</p>}
      </div>

      <div className="flex items-center gap-3 mt-2 w-full">
        <button
          onClick={onCancel}
          disabled={over || revealed.size > 0}
          title={revealed.size > 0 ? "Cash out to finish this round" : undefined}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors disabled:opacity-50"
        >
          Exit
        </button>
        <button
          onClick={cashOut}
          disabled={over || revealed.size === 0}
          className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          CASH OUT
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "text-white" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 py-2 px-1">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-bold text-sm ${accent}`}>{value}</div>
    </div>
  );
}
