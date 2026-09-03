import { SportId } from '@/types';
import { act, engineFor, score, start } from './helpers';

/** Football, handball and basketball share one shape: a running score across a
 *  fixed number of periods, with discipline/stat counters on the side. */
const SPORTS: Array<{ sport: SportId; goal: string; value: number }> = [
  { sport: 'football', goal: 'goal', value: 1 },
  { sport: 'handball', goal: 'goal', value: 1 },
  { sport: 'basketball', goal: '3pt', value: 3 },
];

describe.each(SPORTS)('$sport', ({ sport, goal, value }) => {
  const engine = engineFor(sport);

  it('adds the action its own value', () => {
    expect(score(start(sport), 'home', 2, goal).homeScore).toBe(2 * value);
  });

  it('credits the side that scored, and only that side', () => {
    const state = act(start(sport), 'away', goal);
    expect(state.awayScore).toBe(value);
    expect(state.homeScore).toBe(0);
  });

  it('breaks the score down per period, adding up to the total', () => {
    let state = score(start(sport), 'home', 2, goal);
    state = { ...state, currentPeriod: 1 };
    state = score(state, 'away', 3, goal);

    const total = (side: 'home' | 'away') =>
      Array.from({ length: state.config.periodCount }, (_, i) =>
        engine.getPeriodSummary!(state, i, side).score,
      ).reduce((a, b) => a + b, 0);

    expect(engine.getPeriodSummary!(state, 0, 'home').score).toBe(2 * value);
    expect(engine.getPeriodSummary!(state, 1, 'away').score).toBe(3 * value);
    expect(total('home')).toBe(state.homeScore);
    expect(total('away')).toBe(state.awayScore);
  });

  it('leaves the score alone for non-scoring actions', () => {
    const nonScoring = engine
      .availableActions(start(sport), 'home')
      .map((a) => a.id)
      .filter((id) => id !== goal && id !== '1pt' && id !== '2pt' && id !== '3pt');
    for (const id of nonScoring) {
      const state = act(start(sport), 'home', id);
      expect(state.homeScore).toBe(0);
      expect(state.events).toHaveLength(1);
    }
  });

  it('names the higher score as the winner and allows a draw', () => {
    let state = score(start(sport), 'home', 2, goal);
    expect(engine.finish(state).winner).toBe('home');

    state = score(state, 'away', 3, goal);
    expect(engine.finish(state).winner).toBe('away');

    state = score(state, 'home', 1, goal);
    expect(engine.finish(state).winner).toBe('draw');
  });
});

describe('basketbol', () => {
  const basketball = engineFor('basketball');

  it('scores 1, 2 and 3 point actions at face value', () => {
    let state = start('basketball');
    state = act(state, 'home', '1pt');
    state = act(state, 'home', '2pt');
    state = act(state, 'home', '3pt');
    expect(state.homeScore).toBe(6);
  });

  it('counts fouls against the period they were called in', () => {
    let state = act(start('basketball'), 'home', 'foul');
    state = { ...state, currentPeriod: 1 };
    state = act(state, 'home', 'foul');

    expect(basketball.getPeriodSummary!(state, 0, 'home').stats[0]!.value).toBe(1);
    expect(basketball.getPeriodSummary!(state, 1, 'home').stats[0]!.value).toBe(1);

    const undone = basketball.undo(state);
    expect(basketball.getPeriodSummary!(undone, 0, 'home').stats[0]!.value).toBe(1);
    expect(basketball.getPeriodSummary!(undone, 1, 'home').stats[0]!.value).toBe(0);
  });
});

describe('futbol', () => {
  const football = engineFor('football');

  it('tallies cards and corners per period without touching the score', () => {
    let state = start('football');
    state = act(state, 'home', 'yellow');
    state = act(state, 'home', 'yellow');
    state = act(state, 'home', 'red');
    state = act(state, 'away', 'corner');

    expect(state.homeScore).toBe(0);
    const home = football.getPeriodSummary!(state, 0, 'home').stats;
    expect(home.find((s) => s.labelKey.endsWith('yellow'))!.value).toBe(2);
    expect(home.find((s) => s.labelKey.endsWith('red'))!.value).toBe(1);
    expect(
      football.getPeriodSummary!(state, 0, 'away').stats.find((s) =>
        s.labelKey.endsWith('corners'),
      )!.value,
    ).toBe(1);
  });

  it('gives a card back on undo', () => {
    const state = act(start('football'), 'home', 'yellow');
    expect(football.undo(state).meta.homeYellow).toBe(0);
  });
});

describe('hentbol', () => {
  const handball = engineFor('handball');

  it('tracks two-minute suspensions alongside cards', () => {
    let state = act(start('handball'), 'home', 'twoMin');
    state = act(state, 'home', 'twoMin');
    state = act(state, 'away', 'yellow');

    expect(state.meta.homeTwoMin).toBe(2);
    expect(state.meta.awayYellow).toBe(1);
    expect(state.homeScore).toBe(0);
    expect(handball.undo(state).meta.awayYellow).toBe(0);
  });
});
