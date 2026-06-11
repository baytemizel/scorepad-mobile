import { ApplyResult, MatchConfig, MatchState, PeriodState, TeamSide } from '@/types';
import {
  SportEngine,
  SportAction,
  StatLine,
  StatusLabel,
  PeriodSummary,
  newEvent,
  newMatchId,
} from './index';

interface VolleyballMeta {
  homeSets: number;
  awaySets: number;
}

const ACTIONS: SportAction[] = [
  { id: 'point', labelKey: 'sport.volleyball.actions.point', short: '+1', variant: 'primary' },
];

const ensureMeta = (state: MatchState): VolleyballMeta => {
  const m = state.meta as Partial<VolleyballMeta>;
  return {
    homeSets: m.homeSets ?? 0,
    awaySets: m.awaySets ?? 0,
  };
};

/**
 * Official volleyball rules:
 * - First 4 sets played to 25 points (must win by 2).
 * - Decisive 5th set played to 15 points (must win by 2).
 * - Best of 3 (first to 2 sets) or best of 5 (first to 3 sets).
 */
function targetPointsForSet(setIndex: number, bestOf: number): number {
  // For best-of-3: sets 0,1 → 25, set 2 (decider) → 15
  // For best-of-5: sets 0–3 → 25, set 4 (decider) → 15
  const decidingSetIndex = bestOf === 5 ? 4 : 2;
  return setIndex >= decidingSetIndex ? 15 : 25;
}

function setsToWin(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

function detectSetWin(home: number, away: number, target: number): TeamSide | null {
  if (home >= target && home - away >= 2) return 'home';
  if (away >= target && away - home >= 2) return 'away';
  return null;
}

export const volleyball: SportEngine = {
  meta: {
    id: 'volleyball',
    nameKey: 'sport.volleyball.name',
    icon: '🏐',
    gradient: ['#F59E0B', '#D97706'],
    setBased: true,
    defaultPeriodCount: 3,
  },

  init(config: MatchConfig): MatchState {
    return {
      id: newMatchId(),
      config: { ...config, bestOf: config.bestOf ?? 3 },
      homeScore: 0,
      awayScore: 0,
      currentPeriod: 0,
      periods: [],
      events: [],
      meta: { homeSets: 0, awaySets: 0 } as Record<string, unknown>,
      finished: false,
      startedAt: Date.now(),
    };
  },

  availableActions(): SportAction[] {
    return ACTIONS;
  },

  apply(state: MatchState, side: TeamSide, action: string): ApplyResult {
    if (state.finished || action !== 'point') {
      return { next: state, periodEnded: false, matchEnded: false };
    }

    const event = newEvent(state.id, side, action, 1, state.currentPeriod);
    const home = side === 'home' ? state.homeScore + 1 : state.homeScore;
    const away = side === 'away' ? state.awayScore + 1 : state.awayScore;
    const meta = ensureMeta(state);
    const bestOf = state.config.bestOf ?? 3;
    const target = targetPointsForSet(state.currentPeriod, bestOf);
    const winner = detectSetWin(home, away, target);

    if (!winner) {
      return {
        next: {
          ...state,
          homeScore: home,
          awayScore: away,
          events: [...state.events, event],
        },
        periodEnded: false,
        matchEnded: false,
      };
    }

    // Set ended.
    const newSets: VolleyballMeta = {
      homeSets: meta.homeSets + (winner === 'home' ? 1 : 0),
      awaySets: meta.awaySets + (winner === 'away' ? 1 : 0),
    };
    const completedPeriod: PeriodState = {
      index: state.currentPeriod,
      homeScore: home,
      awayScore: away,
    };
    const requiredSets = setsToWin(bestOf);
    const matchWinner: TeamSide | null =
      newSets.homeSets >= requiredSets ? 'home' :
      newSets.awaySets >= requiredSets ? 'away' : null;

    const next: MatchState = {
      ...state,
      homeScore: matchWinner ? home : 0,
      awayScore: matchWinner ? away : 0,
      currentPeriod: matchWinner ? state.currentPeriod : state.currentPeriod + 1,
      periods: [...state.periods, completedPeriod],
      events: [...state.events, event],
      meta: newSets as unknown as Record<string, unknown>,
      finished: matchWinner !== null,
      finishedAt: matchWinner ? Date.now() : undefined,
      winner: matchWinner ?? undefined,
    };

    return {
      next,
      periodEnded: true,
      matchEnded: matchWinner !== null,
    };
  },

  undo(state: MatchState): MatchState {
    if (state.events.length === 0) return state;
    const last = state.events[state.events.length - 1]!;
    const meta = ensureMeta(state);

    // If the last event ended a set, revert sets count and pop the period.
    const periodEnded = state.periods.length > 0 &&
      state.periods[state.periods.length - 1]!.index === last.periodIndex &&
      state.currentPeriod !== last.periodIndex;

    if (periodEnded || state.finished) {
      const lastPeriod = state.periods[state.periods.length - 1]!;
      const setWonBy: TeamSide =
        lastPeriod.homeScore > lastPeriod.awayScore ? 'home' : 'away';
      const newMeta: VolleyballMeta = {
        homeSets: meta.homeSets - (setWonBy === 'home' ? 1 : 0),
        awaySets: meta.awaySets - (setWonBy === 'away' ? 1 : 0),
      };
      return {
        ...state,
        homeScore: last.side === 'home' ? lastPeriod.homeScore - 1 : lastPeriod.homeScore,
        awayScore: last.side === 'away' ? lastPeriod.awayScore - 1 : lastPeriod.awayScore,
        currentPeriod: lastPeriod.index,
        periods: state.periods.slice(0, -1),
        events: state.events.slice(0, -1),
        meta: newMeta as unknown as Record<string, unknown>,
        finished: false,
        finishedAt: undefined,
        winner: undefined,
      };
    }

    return {
      ...state,
      homeScore: last.side === 'home' ? Math.max(0, state.homeScore - 1) : state.homeScore,
      awayScore: last.side === 'away' ? Math.max(0, state.awayScore - 1) : state.awayScore,
      events: state.events.slice(0, -1),
    };
  },

  finish(state: MatchState): MatchState {
    if (state.finished) return state;
    const meta = ensureMeta(state);
    let winner: TeamSide | 'draw' = 'draw';
    if (meta.homeSets > meta.awaySets) winner = 'home';
    else if (meta.awaySets > meta.homeSets) winner = 'away';
    return { ...state, finished: true, finishedAt: Date.now(), winner };
  },

  getStatusLabel(state: MatchState): StatusLabel {
    return {
      key: 'sport.volleyball.status.set',
      values: { current: state.currentPeriod + 1 },
    };
  },

  getDisplayScore(state: MatchState, side: TeamSide): number {
    return side === 'home' ? state.homeScore : state.awayScore;
  },

  getStatLines(state: MatchState, side: TeamSide): StatLine[] {
    const meta = ensureMeta(state);
    return [
      {
        labelKey: 'sport.volleyball.stats.sets',
        value: side === 'home' ? meta.homeSets : meta.awaySets,
      },
    ];
  },

  getPeriodSummary(state: MatchState, periodIndex: number, side: TeamSide): PeriodSummary {
    const completed = state.periods[periodIndex];
    if (completed) {
      return {
        score: side === 'home' ? completed.homeScore : completed.awayScore,
        stats: [],
      };
    }
    // In-progress set (e.g. match finished early via Finish): show live points.
    if (periodIndex === state.currentPeriod) {
      return {
        score: side === 'home' ? state.homeScore : state.awayScore,
        stats: [],
      };
    }
    return { score: 0, stats: [] };
  },
};
