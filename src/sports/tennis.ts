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

interface TennisMeta {
  /** Points within the current game. 0 = "0", 1 = "15", 2 = "30", 3 = "40", >=4 = adv/deuce calc. */
  homePoints: number;
  awayPoints: number;
  /** Games won in current set. */
  homeGames: number;
  awayGames: number;
  /** Sets won. */
  homeSets: number;
  awaySets: number;
  /** True when current game is a tiebreak (6-6 in non-deciding sets). */
  tiebreak: boolean;
}

const ACTIONS: SportAction[] = [
  { id: 'point', labelKey: 'sport.tennis.actions.point', short: '+1', variant: 'primary' },
];

const ensureMeta = (state: MatchState): TennisMeta => {
  const m = state.meta as Partial<TennisMeta>;
  return {
    homePoints: m.homePoints ?? 0,
    awayPoints: m.awayPoints ?? 0,
    homeGames: m.homeGames ?? 0,
    awayGames: m.awayGames ?? 0,
    homeSets: m.homeSets ?? 0,
    awaySets: m.awaySets ?? 0,
    tiebreak: m.tiebreak ?? false,
  };
};

const setsToWin = (state: MatchState): number => {
  return state.config.tennisFormat === 'best-of-5' ? 3 : 2;
};

/** Convert internal point counter to display string for the team. */
export function pointDisplay(meta: TennisMeta, side: TeamSide): string {
  if (meta.tiebreak) {
    return String(side === 'home' ? meta.homePoints : meta.awayPoints);
  }
  const own = side === 'home' ? meta.homePoints : meta.awayPoints;
  const opp = side === 'home' ? meta.awayPoints : meta.homePoints;

  // Both at 3 → 40-40 (deuce)
  if (own >= 3 && opp >= 3) {
    if (own === opp) return '40';
    if (own > opp) return 'AD';
    return '40';
  }
  switch (own) {
    case 0: return '0';
    case 1: return '15';
    case 2: return '30';
    case 3: return '40';
    default: return '40';
  }
}

/** Returns the side that won the game when a point is added, or null. */
function checkGameWin(meta: TennisMeta, side: TeamSide): TeamSide | null {
  if (meta.tiebreak) {
    const home = meta.homePoints;
    const away = meta.awayPoints;
    if (home >= 7 && home - away >= 2) return 'home';
    if (away >= 7 && away - home >= 2) return 'away';
    return null;
  }
  const own = side === 'home' ? meta.homePoints : meta.awayPoints;
  const opp = side === 'home' ? meta.awayPoints : meta.homePoints;
  if (own >= 4 && own - opp >= 2) return side;
  return null;
}

function checkSetWin(meta: TennisMeta): TeamSide | null {
  if (meta.homeGames >= 6 && meta.homeGames - meta.awayGames >= 2) return 'home';
  if (meta.awayGames >= 6 && meta.awayGames - meta.homeGames >= 2) return 'away';
  // Tiebreak win at 7-6
  if (meta.homeGames === 7 && meta.awayGames === 6) return 'home';
  if (meta.awayGames === 7 && meta.homeGames === 6) return 'away';
  return null;
}

export const tennis: SportEngine = {
  meta: {
    id: 'tennis',
    nameKey: 'sport.tennis.name',
    icon: '🎾',
    mdiIcon: 'tennis-ball',
    gradient: ['#84CC16', '#65A30D'],
    setBased: true,
    defaultPeriodCount: 3,
  },

  init(config: MatchConfig): MatchState {
    return {
      id: newMatchId(),
      config: { ...config, tennisFormat: config.tennisFormat ?? 'best-of-3' },
      homeScore: 0,
      awayScore: 0,
      currentPeriod: 0,
      periods: [],
      events: [],
      meta: {
        homePoints: 0, awayPoints: 0,
        homeGames: 0, awayGames: 0,
        homeSets: 0, awaySets: 0,
        tiebreak: false,
      } as Record<string, unknown>,
      finished: false,
      startedAt: Date.now(),
    };
  },

  availableActions(): SportAction[] {
    return ACTIONS;
  },

  apply(state: MatchState, side: TeamSide, action: string): ApplyResult {
    if (state.finished || (action !== 'point' && action !== 'nextset')) {
      return { next: state, periodEnded: false, matchEnded: false };
    }

    // Manual "next set": award the current set to whoever leads on games and
    // advance. Points/games reset; sets credited to the leader (if any).
    if (action === 'nextset') {
      const meta = ensureMeta(state);
      const winner: TeamSide | null =
        meta.homeGames > meta.awayGames ? 'home' :
        meta.awayGames > meta.homeGames ? 'away' : null;
      const event = newEvent(state.id, winner ?? 'home', 'nextset', 0, state.currentPeriod);
      const period: PeriodState = {
        index: state.currentPeriod,
        homeScore: meta.homeGames,
        awayScore: meta.awayGames,
        meta: winner ? { setWinner: winner } : undefined,
      };
      const newMeta: TennisMeta = {
        ...meta,
        homePoints: 0,
        awayPoints: 0,
        homeGames: 0,
        awayGames: 0,
        homeSets: meta.homeSets + (winner === 'home' ? 1 : 0),
        awaySets: meta.awaySets + (winner === 'away' ? 1 : 0),
        tiebreak: false,
      };
      return {
        next: {
          ...state,
          homeScore: 0,
          awayScore: 0,
          currentPeriod: state.currentPeriod + 1,
          periods: [...state.periods, period],
          events: [...state.events, event],
          meta: newMeta as unknown as Record<string, unknown>,
        },
        periodEnded: true,
        matchEnded: false,
      };
    }

    const event = newEvent(state.id, side, action, 1, state.currentPeriod);
    let meta = ensureMeta(state);
    meta = {
      ...meta,
      homePoints: side === 'home' ? meta.homePoints + 1 : meta.homePoints,
      awayPoints: side === 'away' ? meta.awayPoints + 1 : meta.awayPoints,
    };

    // Handle deuce regression: if both reach 4+ and equal, snap back to 3-3
    if (!meta.tiebreak && meta.homePoints >= 4 && meta.awayPoints >= 4 &&
        meta.homePoints === meta.awayPoints) {
      meta = { ...meta, homePoints: 3, awayPoints: 3 };
    }

    const gameWinner = checkGameWin(meta, side);
    let periodEnded = false;
    let matchEnded = false;
    let newPeriods = state.periods;
    let newCurrentPeriod = state.currentPeriod;
    let winner: TeamSide | undefined;

    if (gameWinner) {
      // Game won. Reset points; increment games.
      meta = {
        ...meta,
        homePoints: 0,
        awayPoints: 0,
        homeGames: meta.homeGames + (gameWinner === 'home' ? 1 : 0),
        awayGames: meta.awayGames + (gameWinner === 'away' ? 1 : 0),
        tiebreak: false,
      };

      // Tiebreak entry at 6-6
      if (meta.homeGames === 6 && meta.awayGames === 6) {
        meta = { ...meta, tiebreak: true };
      }

      const setWinner = checkSetWin(meta);
      if (setWinner) {
        const period: PeriodState = {
          index: state.currentPeriod,
          homeScore: meta.homeGames,
          awayScore: meta.awayGames,
          meta: { setWinner },
        };
        newPeriods = [...state.periods, period];
        meta = {
          ...meta,
          homeGames: 0,
          awayGames: 0,
          homeSets: meta.homeSets + (setWinner === 'home' ? 1 : 0),
          awaySets: meta.awaySets + (setWinner === 'away' ? 1 : 0),
          tiebreak: false,
        };
        newCurrentPeriod = state.currentPeriod + 1;
        periodEnded = true;

        const required = setsToWin(state);
        if (meta.homeSets >= required) {
          matchEnded = true;
          winner = 'home';
        } else if (meta.awaySets >= required) {
          matchEnded = true;
          winner = 'away';
        }
      }
    }

    return {
      next: {
        ...state,
        homeScore: meta.homeGames,
        awayScore: meta.awayGames,
        currentPeriod: newCurrentPeriod,
        periods: newPeriods,
        events: [...state.events, event],
        meta: meta as unknown as Record<string, unknown>,
        finished: matchEnded,
        finishedAt: matchEnded ? Date.now() : undefined,
        winner,
      },
      periodEnded,
      matchEnded,
    };
  },

  undo(state: MatchState): MatchState {
    // Tennis undo is non-trivial because of game/set transitions.
    // Strategy: replay all events except the last one from a fresh init.
    if (state.events.length === 0) return state;
    let replay = tennis.init(state.config);
    replay = { ...replay, id: state.id, startedAt: state.startedAt };
    const events = state.events.slice(0, -1);
    for (const ev of events) {
      const r = tennis.apply(replay, ev.side, ev.action);
      replay = r.next;
    }
    // Preserve the original event timestamps
    replay = { ...replay, events };
    return replay;
  },

  /**
   * Finish usually lands mid-set, so walk the scoring hierarchy the way an
   * umpire would read the board: sets first, then games in the set on court,
   * then points in the current game. Only a board that is level all the way
   * down is a genuine draw.
   */
  finish(state: MatchState): MatchState {
    if (state.finished) return state;
    const meta = ensureMeta(state);
    let winner: TeamSide | 'draw' = 'draw';
    if (meta.homeSets !== meta.awaySets) {
      winner = meta.homeSets > meta.awaySets ? 'home' : 'away';
    } else if (meta.homeGames !== meta.awayGames) {
      winner = meta.homeGames > meta.awayGames ? 'home' : 'away';
    } else if (meta.homePoints !== meta.awayPoints) {
      winner = meta.homePoints > meta.awayPoints ? 'home' : 'away';
    }
    return { ...state, finished: true, finishedAt: Date.now(), winner };
  },

  periodCount(state: MatchState): number {
    // Max sets playable = (sets needed to win) * 2 - 1.
    return setsToWin(state) * 2 - 1;
  },

  nextPeriod(state: MatchState): MatchState {
    return tennis.apply(state, 'home', 'nextset').next;
  },

  getStatusLabel(state: MatchState): StatusLabel {
    const meta = ensureMeta(state);
    if (meta.tiebreak) {
      return { key: 'sport.tennis.status.tiebreak' };
    }
    return {
      key: 'sport.tennis.status.set',
      values: { current: state.currentPeriod + 1 },
    };
  },

  getDisplayScore(state: MatchState, side: TeamSide): number {
    // Display the games count as the big number; points shown separately.
    return side === 'home' ? state.homeScore : state.awayScore;
  },

  getSetScore(state: MatchState, side: TeamSide): number {
    const meta = ensureMeta(state);
    return side === 'home' ? meta.homeSets : meta.awaySets;
  },

  getStatLines(state: MatchState, side: TeamSide): StatLine[] {
    const meta = ensureMeta(state);
    return [
      {
        labelKey: 'sport.tennis.stats.points',
        value: pointDisplay(meta, side),
      },
      {
        labelKey: 'sport.tennis.stats.sets',
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
    // In-progress set (e.g. match finished early via Finish): show live games.
    if (periodIndex === state.currentPeriod) {
      const meta = ensureMeta(state);
      return {
        score: side === 'home' ? meta.homeGames : meta.awayGames,
        stats: [],
      };
    }
    return { score: 0, stats: [] };
  },
};
