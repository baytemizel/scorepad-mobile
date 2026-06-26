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
  PeriodSummary,
  newEvent,
  newMatchId,
} from './index';

interface FootballMeta {
  homeYellow: number;
  awayYellow: number;
  homeRed: number;
  awayRed: number;
  homeCorners: number;
  awayCorners: number;
}

const ACTIONS: SportAction[] = [
  { id: 'goal', labelKey: 'sport.football.actions.goal', short: '+1', variant: 'primary' },
  { id: 'yellow', labelKey: 'sport.football.actions.yellow', short: '🟨', variant: 'warning' },
  { id: 'red', labelKey: 'sport.football.actions.red', short: '🟥', variant: 'danger' },
  { id: 'corner', labelKey: 'sport.football.actions.corner', short: 'C', variant: 'secondary' },
];

const ensureMeta = (state: MatchState): FootballMeta => {
  const m = state.meta as Partial<FootballMeta>;
  return {
    homeYellow: m.homeYellow ?? 0,
    awayYellow: m.awayYellow ?? 0,
    homeRed: m.homeRed ?? 0,
    awayRed: m.awayRed ?? 0,
    homeCorners: m.homeCorners ?? 0,
    awayCorners: m.awayCorners ?? 0,
  };
};

export const football: SportEngine = {
  meta: {
    id: 'football',
    nameKey: 'sport.football.name',
    icon: '⚽',
    mdiIcon: 'soccer',
    gradient: ['#10B981', '#047857'],
    setBased: false,
    defaultPeriodCount: 2,
  },

  init(config: MatchConfig): MatchState {
    return {
      id: newMatchId(),
      config,
      homeScore: 0,
      awayScore: 0,
      currentPeriod: 0,
      periods: [],
      events: [],
      meta: {
        homeYellow: 0, awayYellow: 0,
        homeRed: 0, awayRed: 0,
        homeCorners: 0, awayCorners: 0,
      } as Record<string, unknown>,
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
    const newMeta: FootballMeta = { ...meta };
    let value = 0;

    switch (action) {
      case 'goal':
        value = 1;
        break;
      case 'yellow':
        if (side === 'home') newMeta.homeYellow += 1;
        else newMeta.awayYellow += 1;
        break;
      case 'red':
        if (side === 'home') newMeta.homeRed += 1;
        else newMeta.awayRed += 1;
        break;
      case 'corner':
        if (side === 'home') newMeta.homeCorners += 1;
        else newMeta.awayCorners += 1;
        break;
      default:
        return { next: state, periodEnded: false, matchEnded: false };
    }

    const event = newEvent(state.id, side, action, value, state.currentPeriod);
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
    const newMeta: FootballMeta = { ...meta };

    switch (last.action) {
      case 'yellow':
        if (last.side === 'home') newMeta.homeYellow = Math.max(0, newMeta.homeYellow - 1);
        else newMeta.awayYellow = Math.max(0, newMeta.awayYellow - 1);
        break;
      case 'red':
        if (last.side === 'home') newMeta.homeRed = Math.max(0, newMeta.homeRed - 1);
        else newMeta.awayRed = Math.max(0, newMeta.awayRed - 1);
        break;
      case 'corner':
        if (last.side === 'home') newMeta.homeCorners = Math.max(0, newMeta.homeCorners - 1);
        else newMeta.awayCorners = Math.max(0, newMeta.awayCorners - 1);
        break;
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
      key: 'sport.football.status.half',
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
    if (side === 'home') {
      return [
        { labelKey: 'sport.football.stats.yellow', value: meta.homeYellow },
        { labelKey: 'sport.football.stats.red', value: meta.homeRed },
        { labelKey: 'sport.football.stats.corners', value: meta.homeCorners },
      ];
    }
    return [
      { labelKey: 'sport.football.stats.yellow', value: meta.awayYellow },
      { labelKey: 'sport.football.stats.red', value: meta.awayRed },
      { labelKey: 'sport.football.stats.corners', value: meta.awayCorners },
    ];
  },

  getPeriodSummary(state: MatchState, periodIndex: number, side: TeamSide): PeriodSummary {
    const events = state.events.filter(
      (e) => e.periodIndex === periodIndex && e.side === side,
    );
    const count = (id: string) => events.filter((e) => e.action === id).length;
    return {
      score: count('goal'),
      stats: [
        { labelKey: 'sport.football.stats.yellow', value: count('yellow') },
        { labelKey: 'sport.football.stats.red', value: count('red') },
        { labelKey: 'sport.football.stats.corners', value: count('corner') },
      ],
    };
  },
};
