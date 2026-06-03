import {
  ApplyResult,
  MatchConfig,
  MatchState,
  TeamSide,
} from '@/types';
import {
  SportEngine,
  SportAction,
  StatLine,
  StatusLabel,
  newEvent,
  newMatchId,
} from './index';

interface BasketballMeta {
  homeFouls: number[];
  awayFouls: number[];
  /** True once the user explicitly advances to the next period. */
}

const ACTIONS: SportAction[] = [
  { id: '1pt', labelKey: 'sport.basketball.actions.freeThrow', short: '+1', variant: 'secondary' },
  { id: '2pt', labelKey: 'sport.basketball.actions.twoPoints', short: '+2', variant: 'primary' },
  { id: '3pt', labelKey: 'sport.basketball.actions.threePoints', short: '+3', variant: 'primary' },
  { id: 'foul', labelKey: 'sport.basketball.actions.foul', short: 'F', variant: 'warning' },
];

function ensureMeta(state: MatchState): BasketballMeta {
  const meta = state.meta as Partial<BasketballMeta>;
  return {
    homeFouls: meta.homeFouls ?? Array(state.config.periodCount).fill(0),
    awayFouls: meta.awayFouls ?? Array(state.config.periodCount).fill(0),
  };
}

export const basketball: SportEngine = {
  meta: {
    id: 'basketball',
    nameKey: 'sport.basketball.name',
    icon: '🏀',
    gradient: ['#F97316', '#EA580C'],
    setBased: false,
    defaultPeriodCount: 4,
  },

  init(config: MatchConfig): MatchState {
    const meta: BasketballMeta = {
      homeFouls: Array(config.periodCount).fill(0),
      awayFouls: Array(config.periodCount).fill(0),
    };
    return {
      id: newMatchId(),
      config,
      homeScore: 0,
      awayScore: 0,
      currentPeriod: 0,
      periods: [],
      events: [],
      meta: meta as unknown as Record<string, unknown>,
      finished: false,
      startedAt: Date.now(),
    };
  },

  availableActions(): SportAction[] {
    return ACTIONS;
  },

  apply(state: MatchState, side: TeamSide, action: string): ApplyResult {
    if (state.finished) return { next: state, periodEnded: false, matchEnded: false };

    const meta = ensureMeta(state);
    const newMeta = {
      homeFouls: [...meta.homeFouls],
      awayFouls: [...meta.awayFouls],
    };
    const period = state.currentPeriod;
    let value = 0;

    switch (action) {
      case '1pt':
        value = 1;
        break;
      case '2pt':
        value = 2;
        break;
      case '3pt':
        value = 3;
        break;
      case 'foul': {
        if (side === 'home') {
          newMeta.homeFouls[period] = (newMeta.homeFouls[period] ?? 0) + 1;
        } else {
          newMeta.awayFouls[period] = (newMeta.awayFouls[period] ?? 0) + 1;
        }
        value = 0;
        break;
      }
      default:
        return { next: state, periodEnded: false, matchEnded: false };
    }

    const event = newEvent(state.id, side, action, value, period);
    const next: MatchState = {
      ...state,
      homeScore: side === 'home' ? state.homeScore + value : state.homeScore,
      awayScore: side === 'away' ? state.awayScore + value : state.awayScore,
      events: [...state.events, event],
      meta: newMeta as unknown as Record<string, unknown>,
    };
    return { next, periodEnded: false, matchEnded: false };
  },

  undo(state: MatchState): MatchState {
    if (state.events.length === 0) return state;
    const last = state.events[state.events.length - 1]!;
    const meta = ensureMeta(state);
    const newMeta = {
      homeFouls: [...meta.homeFouls],
      awayFouls: [...meta.awayFouls],
    };

    if (last.action === 'foul') {
      const arr = last.side === 'home' ? newMeta.homeFouls : newMeta.awayFouls;
      arr[last.periodIndex] = Math.max(0, (arr[last.periodIndex] ?? 0) - 1);
    }

    return {
      ...state,
      homeScore:
        last.side === 'home' ? Math.max(0, state.homeScore - last.value) : state.homeScore,
      awayScore:
        last.side === 'away' ? Math.max(0, state.awayScore - last.value) : state.awayScore,
      events: state.events.slice(0, -1),
      meta: newMeta as unknown as Record<string, unknown>,
    };
  },

  finish(state: MatchState): MatchState {
    if (state.finished) return state;
    let winner: TeamSide | 'draw' = 'draw';
    if (state.homeScore > state.awayScore) winner = 'home';
    else if (state.awayScore > state.homeScore) winner = 'away';
    return {
      ...state,
      finished: true,
      finishedAt: Date.now(),
      winner,
    };
  },

  getStatusLabel(state: MatchState): StatusLabel {
    return {
      key: 'sport.basketball.status.period',
      values: {
        current: state.currentPeriod + 1,
        total: state.config.periodCount,
      },
    };
  },

  getDisplayScore(state: MatchState, side: TeamSide): number {
    return side === 'home' ? state.homeScore : state.awayScore;
  },

  getStatLines(state: MatchState, side: TeamSide): StatLine[] {
    const meta = ensureMeta(state);
    const fouls = side === 'home' ? meta.homeFouls : meta.awayFouls;
    const totalFouls = fouls.reduce((a, b) => a + b, 0);
    return [
      {
        labelKey: 'sport.basketball.stats.fouls',
        value: totalFouls,
      },
    ];
  },
};
