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

/**
 * Handball is a time-based sport (IHF rules): each goal counts 1, the match
 * runs two halves and the team with more goals wins — a draw is a valid final
 * result. Beyond the score we track the disciplinary ladder a scoreboard cares
 * about: warnings (yellow), 2-minute suspensions and disqualifications (red).
 */
interface HandballMeta {
  homeTwoMin: number;
  awayTwoMin: number;
  homeYellow: number;
  awayYellow: number;
  homeRed: number;
  awayRed: number;
}

const ACTIONS: SportAction[] = [
  { id: 'goal', labelKey: 'sport.handball.actions.goal', short: '+1', variant: 'primary' },
  { id: 'twoMin', labelKey: 'sport.handball.actions.twoMin', short: "2'", variant: 'secondary' },
  { id: 'yellow', labelKey: 'sport.handball.actions.yellow', short: '🟨', variant: 'warning' },
  { id: 'red', labelKey: 'sport.handball.actions.red', short: '🟥', variant: 'danger' },
];

const ensureMeta = (state: MatchState): HandballMeta => {
  const m = state.meta as Partial<HandballMeta>;
  return {
    homeTwoMin: m.homeTwoMin ?? 0,
    awayTwoMin: m.awayTwoMin ?? 0,
    homeYellow: m.homeYellow ?? 0,
    awayYellow: m.awayYellow ?? 0,
    homeRed: m.homeRed ?? 0,
    awayRed: m.awayRed ?? 0,
  };
};

export const handball: SportEngine = {
  meta: {
    id: 'handball',
    nameKey: 'sport.handball.name',
    icon: '🤾',
    mdiIcon: 'handball',
    gradient: ['#3B82F6', '#1D4ED8'],
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
        homeTwoMin: 0, awayTwoMin: 0,
        homeYellow: 0, awayYellow: 0,
        homeRed: 0, awayRed: 0,
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
    const newMeta: HandballMeta = { ...meta };
    let value = 0;

    switch (action) {
      case 'goal':
        value = 1;
        break;
      case 'twoMin':
        if (side === 'home') newMeta.homeTwoMin += 1;
        else newMeta.awayTwoMin += 1;
        break;
      case 'yellow':
        if (side === 'home') newMeta.homeYellow += 1;
        else newMeta.awayYellow += 1;
        break;
      case 'red':
        if (side === 'home') newMeta.homeRed += 1;
        else newMeta.awayRed += 1;
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
    const newMeta: HandballMeta = { ...meta };

    switch (last.action) {
      case 'twoMin':
        if (last.side === 'home') newMeta.homeTwoMin = Math.max(0, newMeta.homeTwoMin - 1);
        else newMeta.awayTwoMin = Math.max(0, newMeta.awayTwoMin - 1);
        break;
      case 'yellow':
        if (last.side === 'home') newMeta.homeYellow = Math.max(0, newMeta.homeYellow - 1);
        else newMeta.awayYellow = Math.max(0, newMeta.awayYellow - 1);
        break;
      case 'red':
        if (last.side === 'home') newMeta.homeRed = Math.max(0, newMeta.homeRed - 1);
        else newMeta.awayRed = Math.max(0, newMeta.awayRed - 1);
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
      key: 'sport.handball.status.half',
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
        { labelKey: 'sport.handball.stats.twoMin', value: meta.homeTwoMin },
        { labelKey: 'sport.handball.stats.yellow', value: meta.homeYellow },
        { labelKey: 'sport.handball.stats.red', value: meta.homeRed },
      ];
    }
    return [
      { labelKey: 'sport.handball.stats.twoMin', value: meta.awayTwoMin },
      { labelKey: 'sport.handball.stats.yellow', value: meta.awayYellow },
      { labelKey: 'sport.handball.stats.red', value: meta.awayRed },
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
        { labelKey: 'sport.handball.stats.twoMin', value: count('twoMin') },
        { labelKey: 'sport.handball.stats.yellow', value: count('yellow') },
        { labelKey: 'sport.handball.stats.red', value: count('red') },
      ],
    };
  },
};
