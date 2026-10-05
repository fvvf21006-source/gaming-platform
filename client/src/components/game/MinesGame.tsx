import { useState } from "react";
import { formatPoints } from "../../utils/points";
import { randomInt } from "../../utils/random";
import {
  MINES_COUNT,
  MINES_GRID,
  MINES_MULTIPLIERS,
  MINES_SAFE_TILES,
  minesMultiplier,
  payoutFor,
} from "./casinoConfig";
import { useForcedOutcome } from "./useForcedOutcome";
import { useSettle } from "./useSettle";

interface Props {
  sessionId?: string;
  pointCost: number;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

/** `count` distinct tiles chosen at random, never including any in `exclude`. */
function pickTiles(count: number, exclude: Set<number>): number[] {
  const free = Array.from({ length: MINES_GRID }, (_, i) => i).filter((i) => !exclude.has(i));
  const picked: number[] = [];
  while (picked.length < count && free.length > 0) {
    picked.push(free.splice(randomInt(free.length), 1)[0]);
  }
  return picked;
}

type Phase = "playing" | "lost" | "cashed";

export default function MinesGame({ sessionId, pointCost, onComplete, onCancel }: Props) {
  const [mines, setMines] = useState<Set<number>>(() => new Set(pickTiles(MINES_COUNT, new Set())));
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("playing");
  const [payout, setPayout] = useState(0);
  const [busy, setBusy] = useState(false);
  const settle = useSettle(onComplete);
  const fetchForced = useForcedOutcome(sessionId);

  const safeCount = [...revealed].filter((i) => !mines.has(i)).length;
  const multiplier = minesMultiplier(safeCount);
  const currentPayout = payoutFor(pointCost, multiplier);
  const nextMultiplier = minesMultiplier(safeCount + 1);
  const over = phase !== "playing";

  const finish = (next: Phase, won: number) => {
    setPhase(next);
    setPayout(won);
    settle(won);
  };

  /** How many safe tiles a preset result corresponds to (0 = a loss), or null if none. */
  const targetSafeTiles = (forced: number | null): number | null => {
    if (forced === null) return null;
    const n = MINES_MULTIPLIERS.findIndex((m) => payoutFor(pointCost, m) === forced);
    return n >= 0 ? n : null;
  };

  const revealTile = async (index: number) => {
    if (over || busy || revealed.has(index)) return;
    setBusy(true);
    const forced = await fetchForced();
    setBusy(false);

    const target = targetSafeTiles(forced);
    const next = new Set(revealed).add(index);

    // Preset loss: this pick is a mine.
    if (target === 0) {
      setMines(new Set([index, ...pickTiles(MINES_COUNT - 1, new Set([index, ...revealed]))]));
      setRevealed(next);
      finish("lost", 0);
      return;
    }

    // Preset win: this pick is safe, and the round ends once the target is reached.
    if (target !== null && forced !== null) {
      if (mines.has(index)) {
        const moved = new Set(mines);
        moved.delete(index);
        moved.add(pickTiles(1, new Set([...next, ...moved]))[0]);
        setMines(moved);
      }
      setRevealed(next);
      if (safeCount + 1 >= target) finish("cashed", forced);
      return;
    }

    setRevealed(next);
    if (mines.has(index)) {
      finish("lost", 0);
    } else if (safeCount + 1 === MINES_SAFE_TILES) {
      finish("cashed", payoutFor(pointCost, minesMultiplier(MINES_SAFE_TILES)));
    }
  };

  const cashOut = async () => {
    if (over || busy || revealed.size === 0) return;
    setBusy(true);
    const forced = await fetchForced();
    setBusy(false);

    const target = targetSafeTiles(forced);
    if (target === 0) finish("lost", 0);
    else finish("cashed", target !== null && forced !== null ? forced : currentPayout);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl w-full max-w-md mx-auto">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-black text-amber-400 tracking-wide">💣 MINES FIELD</h2>
        <p className="text-xs text-slate-400 mt-1">
          {MINES_COUNT} mines hidden in {MINES_GRID} tiles. Cash out before you hit one! (buy-in {formatPoints(pointCost)} pts)
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 my-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        {Array.from({ length: MINES_GRID }).map((_, idx) => {
          const picked = revealed.has(idx);
          const showMine = mines.has(idx) && (picked || over);
          const showGem = !mines.has(idx) && (picked || over);
          return (
            <button
              key={idx}
              disabled={over || picked || busy}
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
        <Stat label="Safe tiles" value={`${safeCount}/${MINES_SAFE_TILES}`} />
        <Stat label="Multiplier" value={`${multiplier.toFixed(2)}x`} accent="text-amber-400" />
        <Stat label={over ? "Result" : "Cash out"} value={`${formatPoints(over ? payout : currentPayout)} pts`} accent="text-emerald-400" />
      </div>
      {!over && <p className="text-[11px] text-slate-500 mt-2">Next safe tile pays {nextMultiplier.toFixed(2)}x</p>}

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
          disabled={over || busy || revealed.size === 0}
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
