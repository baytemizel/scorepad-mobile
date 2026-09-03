import { getEngine, SportEngine } from '@/sports';
import { MatchConfig, MatchState, SportId, TeamSide } from '@/types';

/**
 * Always reach an engine through the registry, never by importing its module
 * directly: `@/sports/volleyball` imports the registry back, so a test that
 * pulls the module in first would see a half-built registry. App code goes
 * through `@/sports` for the same reason.
 */
export const engineFor = (sport: SportId): SportEngine => getEngine(sport);

/** A match config with the sport's own defaults, overridable per test. */
export function config(sport: SportId, extra: Partial<MatchConfig> = {}): MatchConfig {
  return {
    sport,
    home: { id: 'home', name: 'Ev', color: '' },
    away: { id: 'away', name: 'Dep', color: '' },
    periodCount: getEngine(sport).meta.defaultPeriodCount,
    ...extra,
  };
}

export const start = (sport: SportId, extra?: Partial<MatchConfig>): MatchState =>
  getEngine(sport).init(config(sport, extra));

/** Apply one action and return the resulting state. */
export const act = (state: MatchState, side: TeamSide, action: string): MatchState =>
  getEngine(state.config.sport).apply(state, side, action).next;

/** Apply the same action `n` times for one side. */
export function score(
  state: MatchState,
  side: TeamSide,
  n: number,
  action = 'point',
): MatchState {
  for (let i = 0; i < n; i++) state = act(state, side, action);
  return state;
}

/** Sets won, as `[home, away]`. Set-based sports only. */
export function setScore(state: MatchState): [number, number] {
  const engine = getEngine(state.config.sport);
  return [engine.getSetScore!(state, 'home'), engine.getSetScore!(state, 'away')];
}

/** Win `n` whole games for one side (tennis: four straight points each). */
export function winGames(state: MatchState, side: TeamSide, n: number): MatchState {
  for (let i = 0; i < n; i++) state = score(state, side, 4);
  return state;
}
