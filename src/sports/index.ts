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

  /** A short status line (e.g. "Set 2 — 1-0", "Period 3"). i18n-safe (returns key + values). */
  getStatusLabel: (state: MatchState) => StatusLabel;

  /** The "primary" big score to show under each team. */
  getDisplayScore: (state: MatchState, side: TeamSide) => number;

  /** Optional secondary stats line shown below score (e.g. set wins, fouls). */
  getStatLines?: (state: MatchState, side: TeamSide) => StatLine[];

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
