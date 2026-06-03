import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storageAdapter } from '@/services/storage';
import { MatchRecord, MatchState, SportId, TeamSide } from '@/types';

interface MatchHistoryState {
  records: MatchRecord[];
  saveMatch: (state: MatchState) => MatchRecord | null;
  deleteMatch: (id: string) => void;
  clearAll: () => void;
  filterBySport: (sport: SportId | null) => MatchRecord[];
  search: (query: string) => MatchRecord[];
}

const toRecord = (state: MatchState): MatchRecord | null => {
  if (!state.finished || !state.finishedAt) return null;
  const winner: TeamSide | 'draw' =
    state.winner ??
    (state.homeScore > state.awayScore
      ? 'home'
      : state.awayScore > state.homeScore
        ? 'away'
        : 'draw');
  return {
    id: state.id,
    sport: state.config.sport,
    homeName: state.config.home.name,
    awayName: state.config.away.name,
    homeFinalScore: state.homeScore,
    awayFinalScore: state.awayScore,
    winner,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    periods: state.periods,
    // Cap stored events to keep storage size bounded.
    events: state.events.slice(-200),
  };
};

export const useMatchHistoryStore = create<MatchHistoryState>()(
  persist(
    (set, get) => ({
      records: [],

      saveMatch: (state) => {
        const rec = toRecord(state);
        if (!rec) return null;
        set({ records: [rec, ...get().records.filter((r) => r.id !== rec.id)] });
        return rec;
      },

      deleteMatch: (id) =>
        set({ records: get().records.filter((r) => r.id !== id) }),

      clearAll: () => set({ records: [] }),

      filterBySport: (sport) => {
        const all = get().records;
        return sport ? all.filter((r) => r.sport === sport) : all;
      },

      search: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return get().records;
        return get().records.filter(
          (r) =>
            r.homeName.toLowerCase().includes(q) ||
            r.awayName.toLowerCase().includes(q),
        );
      },
    }),
    {
      name: 'scorepad/matches',
      storage: createJSONStorage(() => storageAdapter),
      version: 1,
    },
  ),
);
