import {
  ApplyResult,
  MatchConfig,
  MatchState,
  ScoreEvent,
  SportId,
  SportMeta,
  TeamSide,
} from '@/types';

/**
 * Each sport implements this interface. Engines are pure: given the current
 * state and an action, they return the next state plus flags about period
 * and match completion. UI never mutates state directly.
 */
export interface SportEngine {
  meta: SportMeta;

  /** Build the initial MatchState for a new match. */
  init: (config: MatchConfig) => MatchState;

  /** List of UI actions available for a given side at the current state. */
  availableActions: (state: MatchState, side: TeamSide) => SportAction[];

  /** Apply an action and return the new state. Pure function. */
  apply: (state: MatchState, side: TeamSide, action: string) => ApplyResult;

  /** Undo the last event. Pure function. */
  undo: (state: MatchState) => MatchState;

  /** Force-end the match (user taps Finish). Returns final state with winner. */
  finish: (state: MatchState) => MatchState;

  /**
   * Total number of periods/sets the match can span. Drives the center bar's
   * "Next" button, which stays visible until the last unit (then the user taps
   * Finish). Period-based sports fall back to `config.periodCount`; set-based
   * sports return the maximum number of sets for the configured best-of.
   */
  periodCount?: (state: MatchState) => number;

  /**
   * Manually close the current period/set and advance to the next one. Pure.
   * Only invoked while not on the last unit. The meaning differs per sport
   * (next quarter/half for period-based games, next set for set-based ones),
   * so set-based engines implement it; period-based ones rely on the store's
   * generic period-advance instead.
   */
  nextPeriod?: (state: MatchState) => MatchState;

  /** A short status line (e.g. "Set 2 — 1-0", "Period 3"). i18n-safe (returns key + values). */
  getStatusLabel: (state: MatchState) => StatusLabel;

  /** The "primary" big score to show under each team. */
  getDisplayScore: (state: MatchState, side: TeamSide) => number;

  /** Optional secondary stats line shown below score (e.g. set wins, fouls). */
  getStatLines?: (state: MatchState, side: TeamSide) => StatLine[];

  /**
   * Sets won so far. Only set-based sports implement this: their running
   * `homeScore`/`awayScore` is the current set's points, which is the live
   * score but not the score a finished match is remembered by. See
   * `headlineScore`.
   */
  getSetScore?: (state: MatchState, side: TeamSide) => number;

  /** Optional per-period breakdown used by the end-of-match summary modal. */
  getPeriodSummary?: (
    state: MatchState,
    periodIndex: number,
    side: TeamSide,
  ) => PeriodSummary;
}

export interface PeriodSummary {
  /** The numeric score this side put up in the given period. */
  score: number;
  /** Sport-specific extras (yellow cards, fouls, etc.) for the period. */
  stats: StatLine[];
}

export interface SportAction {
  /** Stable id used in apply(). */
  id: string;
  /** i18n key for label. */
  labelKey: string;
  /** Value visible on the button (e.g. "+1", "+2", "+3"). */
  short: string;
  /** Visual variant. */
  variant: 'primary' | 'secondary' | 'warning' | 'danger';
}

export interface StatusLabel {
  key: string;
  values?: Record<string, string | number>;
}

export interface StatLine {
  labelKey: string;
  value: string | number;
}

export const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const newEvent = (
  matchId: string,
  side: TeamSide,
  action: string,
  value: number,
  periodIndex: number,
): ScoreEvent => ({
  id: newId(),
  matchId,
  side,
  action,
  value,
  periodIndex,
  timestamp: Date.now(),
});

export const newMatchId = (): string => `m-${newId()}`;

import { basketball } from './basketball';
import { football } from './football';
import { handball } from './handball';
import { volleyball } from './volleyball';
import { tennis } from './tennis';
import { tabletennis } from './tabletennis';

export const sportEngines: Record<SportId, SportEngine> = {
  basketball,
  football,
  handball,
  volleyball,
  tennis,
  tabletennis,
};

export const sportList: SportEngine[] = [
  basketball,
  football,
  handball,
  volleyball,
  tennis,
  tabletennis,
];

export const getEngine = (sport: SportId): SportEngine => sportEngines[sport];

export interface Scoreline {
  home: number;
  away: number;
}

/**
 * The two numbers a finished match is headlined by. Set-based sports lead with
 * the set score — "2 – 0", not the 25-20 of whichever set happened to be last
 * — and leave the per-set points to the period breakdown. A match ended inside
 * its very first set has no set score to show yet, so it keeps the points on
 * the board. Period sports have no set score at all and always do.
 */
export const headlineScore = (points: Scoreline, sets: Scoreline | null): Scoreline =>
  sets && sets.home + sets.away > 0 ? sets : points;

/** `headlineScore` for a live match state. */
export const matchHeadlineScore = (state: MatchState): Scoreline => {
  const engine = getEngine(state.config.sport);
  const setScore = engine.getSetScore;
  return headlineScore(
    {
      home: engine.getDisplayScore(state, 'home'),
      away: engine.getDisplayScore(state, 'away'),
    },
    setScore
      ? { home: setScore(state, 'home'), away: setScore(state, 'away') }
      : null,
  );
};

/**
 * True when each side exposes exactly one stat line, so it can be shown compactly
 * in the center bar as "home – away" (e.g. basketball fouls, volleyball sets)
 * instead of inside each team panel. Multi-stat sports (football, tennis, and
 * table tennis while serving) keep their stats in the panels.
 */
export const statsFitCenter = (engine: SportEngine, state: MatchState): boolean => {
  const home = engine.getStatLines?.(state, 'home') ?? [];
  const away = engine.getStatLines?.(state, 'away') ?? [];
  return home.length === 1 && away.length === 1;
};
