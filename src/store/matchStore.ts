import { create } from 'zustand';
import { ApplyResult, MatchConfig, MatchState, TeamSide } from '@/types';
import { getEngine } from '@/sports';

interface MatchStoreState {
  active: MatchState | null;
  lastResult: ApplyResult | null;

  startMatch: (config: MatchConfig) => MatchState;
  applyAction: (side: TeamSide, action: string) => ApplyResult | null;
  undo: () => void;
  finish: () => MatchState | null;
  /** Close the current period/set and advance to the next, or finish the match
   *  if this was the last one. Period-based sports (basketball, football,
   *  handball) use the generic period advance; set-based sports (volleyball,
   *  tennis, table tennis) delegate to their engine's own `nextPeriod`. */
  nextPeriod: () => void;
  reset: () => void;
  swapSides: () => void;
}

/**
 * Holds the currently-running match in memory. We don't persist this directly:
 * if the user kills the app mid-game we let it go on purpose (parents on the
 * sideline don't want a stale match to revive next time). Persistence happens
 * on `finish()` via the matchHistory store.
 */
export const useMatchStore = create<MatchStoreState>((set, get) => ({
  active: null,
  lastResult: null,

  startMatch: (config) => {
    const engine = getEngine(config.sport);
    const state = engine.init(config);
    set({ active: state, lastResult: null });
    return state;
  },

  applyAction: (side, action) => {
    const cur = get().active;
    if (!cur) return null;
    const engine = getEngine(cur.config.sport);
    const result = engine.apply(cur, side, action);
    set({ active: result.next, lastResult: result });
    return result;
  },

  undo: () => {
    const cur = get().active;
    if (!cur) return;
    const engine = getEngine(cur.config.sport);
    set({ active: engine.undo(cur), lastResult: null });
  },

  finish: () => {
    const cur = get().active;
    if (!cur) return null;
    const engine = getEngine(cur.config.sport);
    const finished = engine.finish(cur);
    set({ active: finished });
    return finished;
  },

  nextPeriod: () => {
    const cur = get().active;
    if (!cur || cur.finished) return;
    const engine = getEngine(cur.config.sport);
    // Set-based engines define their own "advance to next set" semantics.
    if (engine.nextPeriod) {
      set({ active: engine.nextPeriod(cur), lastResult: null });
      return;
    }
    const periodCount = cur.config.periodCount ?? 1;
    const completedPeriod = {
      index: cur.currentPeriod,
      homeScore: cur.homeScore,
      awayScore: cur.awayScore,
    };
    const isLast = cur.currentPeriod + 1 >= periodCount;
    if (isLast) {
      // Last period — close it out and finish the match.
      const finished = engine.finish({
        ...cur,
        periods: [...cur.periods, completedPeriod],
      });
      set({ active: finished });
    } else {
      set({
        active: {
          ...cur,
          currentPeriod: cur.currentPeriod + 1,
          periods: [...cur.periods, completedPeriod],
        },
      });
    }
  },

  reset: () => set({ active: null, lastResult: null }),

  swapSides: () => {
    const cur = get().active;
    if (!cur) return;
    const swapped: MatchState = {
      ...cur,
      config: {
        ...cur.config,
        home: cur.config.away,
        away: cur.config.home,
      },
      homeScore: cur.awayScore,
      awayScore: cur.homeScore,
    };
    set({ active: swapped });
  },
}));
