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

interface TableTennisMeta {
  homeSets: number;
  awaySets: number;
  /** Side that holds service. */
  serving: TeamSide;
  /** Total points played in the current set (used for service rotation). */
  pointsInSet: number;
}

const ACTIONS: SportAction[] = [
  { id: 'point', labelKey: 'sport.tabletennis.actions.point', short: '+1', variant: 'primary' },
  { id: 'switchService', labelKey: 'sport.tabletennis.actions.switchService', short: '↔', variant: 'secondary' },
];

/** Only "point" is meaningful once the match has finished — hide the manual
 *  service-switch action so it doesn't bleed through the end-of-match modal. */
const ACTIONS_FINISHED: SportAction[] = ACTIONS.filter((a) => a.id !== 'switchService');

const ensureMeta = (state: MatchState): TableTennisMeta => {
  const m = state.meta as Partial<TableTennisMeta>;
  return {
    homeSets: m.homeSets ?? 0,
    awaySets: m.awaySets ?? 0,
    serving: m.serving ?? 'home',
    pointsInSet: m.pointsInSet ?? 0,
  };
};

const setsToWin = (bestOf: number): number => Math.ceil(bestOf / 2);

function detectSetWin(home: number, away: number): TeamSide | null {
  if (home >= 11 && home - away >= 2) return 'home';
  if (away >= 11 && away - home >= 2) return 'away';
  return null;
}

/**
 * Service rotation rule: every 2 points the service switches.
 * Once both sides reach 10, service alternates every single point (deuce).
 */
function nextServer(current: TeamSide, pointsInSet: number, home: number, away: number): TeamSide {
  if (home >= 10 && away >= 10) {
    return current === 'home' ? 'away' : 'home';
  }
  if (pointsInSet % 2 === 0) {
    return current === 'home' ? 'away' : 'home';
  }
  return current;
}

export const tabletennis: SportEngine = {
  meta: {
    id: 'tabletennis',
    nameKey: 'sport.tabletennis.name',
    icon: '🏓',
    gradient: ['#EF4444', '#DC2626'],
    setBased: true,
    defaultPeriodCount: 3,
  },

  init(config: MatchConfig): MatchState {
    return {
      id: newMatchId(),
      config: { ...config, bestOf: config.bestOf ?? 5 },
      homeScore: 0,
      awayScore: 0,
      currentPeriod: 0,
      periods: [],
      events: [],
      meta: {
        homeSets: 0, awaySets: 0,
        serving: 'home',
        pointsInSet: 0,
      } as Record<string, unknown>,
      finished: false,
      startedAt: Date.now(),
    };
  },

  availableActions(state: MatchState): SportAction[] {
    return state.finished ? ACTIONS_FINISHED : ACTIONS;
  },

  apply(state: MatchState, side: TeamSide, action: string): ApplyResult {
    if (state.finished) {
      return { next: state, periodEnded: false, matchEnded: false };
    }

    let meta = ensureMeta(state);

    if (action === 'switchService') {
      const event = newEvent(state.id, side, action, 0, state.currentPeriod);
      meta = { ...meta, serving: meta.serving === 'home' ? 'away' : 'home' };
      return {
        next: {
          ...state,
          events: [...state.events, event],
          meta: meta as unknown as Record<string, unknown>,
        },
        periodEnded: false,
        matchEnded: false,
      };
    }

    if (action !== 'point') {
      return { next: state, periodEnded: false, matchEnded: false };
    }

    const event = newEvent(state.id, side, action, 1, state.currentPeriod);
    const home = side === 'home' ? state.homeScore + 1 : state.homeScore;
    const away = side === 'away' ? state.awayScore + 1 : state.awayScore;
    const newPointsInSet = meta.pointsInSet + 1;
    const setWinner = detectSetWin(home, away);

    if (!setWinner) {
      meta = {
        ...meta,
        pointsInSet: newPointsInSet,
        serving: nextServer(meta.serving, newPointsInSet, home, away),
      };
      return {
        next: {
          ...state,
          homeScore: home,
          awayScore: away,
          events: [...state.events, event],
          meta: meta as unknown as Record<string, unknown>,
        },
        periodEnded: false,
        matchEnded: false,
      };
    }

    // Set won
    const completedPeriod: PeriodState = {
      index: state.currentPeriod,
      homeScore: home,
      awayScore: away,
    };
    const newSets: TableTennisMeta = {
      ...meta,
      homeSets: meta.homeSets + (setWinner === 'home' ? 1 : 0),
      awaySets: meta.awaySets + (setWinner === 'away' ? 1 : 0),
      pointsInSet: 0,
      // Server alternates between sets
      serving: meta.serving === 'home' ? 'away' : 'home',
    };
    const required = setsToWin(state.config.bestOf ?? 5);
    const matchWinner: TeamSide | null =
      newSets.homeSets >= required ? 'home' :
      newSets.awaySets >= required ? 'away' : null;

    return {
      next: {
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
      },
      periodEnded: true,
      matchEnded: matchWinner !== null,
    };
  },

  undo(state: MatchState): MatchState {
    if (state.events.length === 0) return state;
    // Replay strategy
    let replay = tabletennis.init(state.config);
    replay = { ...replay, id: state.id, startedAt: state.startedAt };
    const events = state.events.slice(0, -1);
    for (const ev of events) {
      const r = tabletennis.apply(replay, ev.side, ev.action);
      replay = r.next;
    }
    return { ...replay, events };
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
      key: 'sport.tabletennis.status.set',
      values: { current: state.currentPeriod + 1 },
    };
  },

  getDisplayScore(state: MatchState, side: TeamSide): number {
    return side === 'home' ? state.homeScore : state.awayScore;
  },

  getStatLines(state: MatchState, side: TeamSide): StatLine[] {
    const meta = ensureMeta(state);
    const lines: StatLine[] = [
      {
        labelKey: 'sport.tabletennis.stats.sets',
        value: side === 'home' ? meta.homeSets : meta.awaySets,
      },
    ];
    if (meta.serving === side) {
      lines.push({ labelKey: 'sport.tabletennis.stats.serving', value: '●' });
    }
    return lines;
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
