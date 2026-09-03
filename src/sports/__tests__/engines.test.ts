import { sportList, getEngine, headlineScore, matchHeadlineScore } from '@/sports';
import { TeamSide } from '@/types';
import { act, config, score, start } from './helpers';

/** Invariants every engine has to hold, whatever its rules are. */
describe.each(sportList.map((e) => [e.meta.id, e] as const))('%s', (sport, engine) => {
  const actions = () => engine.availableActions(start(sport), 'home').map((a) => a.id);
  // A best-of that leaves room for the long undo sequence below.
  const opts = engine.meta.setBased ? { bestOf: 5 } : {};

  it('starts from an empty board', () => {
    const state = start(sport);
    expect(state.homeScore).toBe(0);
    expect(state.awayScore).toBe(0);
    expect(state.currentPeriod).toBe(0);
    expect(state.periods).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.finished).toBe(false);
  });

  it('ignores an action it does not know', () => {
    const state = start(sport);
    expect(act(state, 'home', 'not-a-real-action').events).toHaveLength(0);
  });

  it('records every action it advertises', () => {
    for (const id of actions()) {
      expect(act(start(sport), 'home', id).events).toHaveLength(1);
    }
  });

  it('undoes back to the opening board', () => {
    const ids = actions();
    let state = start(sport, opts);
    let applied = 0;
    for (let i = 0; i < 24 && !state.finished; i++) {
      const side: TeamSide = i % 3 === 0 ? 'away' : 'home';
      const next = act(state, side, ids[i % ids.length]!);
      if (next.events.length > state.events.length) applied++;
      state = next;
    }
    for (let i = 0; i < applied; i++) state = engine.undo(state);

    const fresh = start(sport, opts);
    expect(state.homeScore).toBe(0);
    expect(state.awayScore).toBe(0);
    expect(state.currentPeriod).toBe(0);
    expect(state.periods).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.meta).toEqual(fresh.meta);
  });

  it('undoes an empty board without complaint', () => {
    const state = start(sport);
    expect(engine.undo(state).events).toEqual([]);
  });

  it('is inert once finished', () => {
    const finished = engine.finish(score(start(sport), 'home', 3, actions()[0]!));
    expect(act(finished, 'away', actions()[0]!)).toBe(finished);
    expect(engine.finish(finished)).toBe(finished);
    expect(finished.winner).toBeDefined();
    expect(finished.finishedAt).toBeDefined();
  });

  it('names the leader as the winner, whenever the match is ended', () => {
    let state = start(sport, engine.meta.setBased ? { bestOf: 3 } : {});
    state = score(state, 'home', 4, actions()[0]!);
    state = score(state, 'away', 1, actions()[0]!);
    const finished = engine.finish(state);
    expect(finished.winner).toBe('home');
    const headline = matchHeadlineScore(finished);
    expect(headline.home).toBeGreaterThan(headline.away);
  });

  it('calls a level board a draw', () => {
    let state = start(sport, engine.meta.setBased ? { bestOf: 3 } : {});
    for (let i = 0; i < 3; i++) {
      state = act(state, 'home', actions()[0]!);
      state = act(state, 'away', actions()[0]!);
    }
    expect(engine.finish(state).winner).toBe('draw');
  });

  it('only reports a set score if it is a set-based sport', () => {
    expect(Boolean(engine.getSetScore)).toBe(engine.meta.setBased);
  });
});

describe('headlineScore', () => {
  const points = { home: 25, away: 20 };

  it('leads with the set score once a set has been decided', () => {
    expect(headlineScore(points, { home: 2, away: 1 })).toEqual({ home: 2, away: 1 });
  });

  it('keeps the points while no set has been decided', () => {
    expect(headlineScore(points, { home: 0, away: 0 })).toEqual(points);
  });

  it('keeps the points for sports that have no sets', () => {
    expect(headlineScore(points, null)).toEqual(points);
  });
});

describe('engine registry', () => {
  it('maps every id to its own engine', () => {
    for (const engine of sportList) {
      expect(getEngine(engine.meta.id)).toBe(engine);
    }
  });

  it('gives each sport a config it can start from', () => {
    for (const engine of sportList) {
      expect(config(engine.meta.id).periodCount).toBeGreaterThan(0);
    }
  });
});
