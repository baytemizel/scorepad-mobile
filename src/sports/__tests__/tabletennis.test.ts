import { MatchState, TeamSide } from '@/types';
import { act, engineFor, score, setScore, start } from './helpers';

const tabletennis = engineFor('tabletennis');
const open = (bestOf: 5 | 7 = 5) => start('tabletennis', { bestOf });
const serving = (state: MatchState) => state.meta.serving as TeamSide;

describe('masa tenisi — set kazanımı', () => {
  it('11 sayıda ve iki fark varsa seti verir', () => {
    let state = open();
    state = score(state, 'home', 10);
    state = score(state, 'away', 10);
    expect(setScore(state)).toEqual([0, 0]);

    state = act(state, 'home', 'point'); // 11-10
    expect(setScore(state)).toEqual([0, 0]);

    state = act(state, 'home', 'point'); // 12-10
    expect(setScore(state)).toEqual([1, 0]);
  });

  it('11-0 seti anında kapatır', () => {
    expect(setScore(score(open(), 'home', 11))).toEqual([1, 0]);
  });
});

describe('masa tenisi — servis', () => {
  it('iki sayıda bir el değiştirir', () => {
    let state = open();
    const opener = serving(state);
    state = act(state, 'home', 'point');
    expect(serving(state)).toBe(opener);
    state = act(state, 'home', 'point');
    expect(serving(state)).not.toBe(opener);
    state = act(state, 'home', 'point');
    expect(serving(state)).not.toBe(opener);
    state = act(state, 'home', 'point');
    expect(serving(state)).toBe(opener);
  });

  it('10-10 sonrası her sayıda el değiştirir', () => {
    let state = open();
    state = score(state, 'home', 10);
    state = score(state, 'away', 10);
    const atDeuce = serving(state);
    state = act(state, 'home', 'point');
    expect(serving(state)).not.toBe(atDeuce);
    state = act(state, 'away', 'point');
    expect(serving(state)).toBe(atDeuce);
  });

  it('her sette ilk servisi rakip kullanır — sette kaç sayı oynandığından bağımsız', () => {
    let state = open();
    const first = serving(state);

    state = score(state, 'home', 11); // set 1: 11 sayı — tek
    expect(serving(state)).not.toBe(first);

    state = score(state, 'away', 6); // set 2: 11-1, toplam 12 sayı — çift
    state = score(state, 'home', 1);
    state = score(state, 'away', 5);
    expect(state.periods).toHaveLength(2);
    expect(serving(state)).toBe(first);
  });

  it('el değiştirme düğmesi servisi karşıya verir', () => {
    const state = open();
    expect(serving(act(state, 'home', 'switchService'))).not.toBe(serving(state));
  });

  it('maç bitince el değiştirme düğmesi görünmez', () => {
    const state = score(open(), 'home', 33);
    expect(state.finished).toBe(true);
    expect(tabletennis.availableActions(state, 'home').map((a) => a.id)).toEqual(['point']);
  });
});

describe('masa tenisi — maçın bitişi', () => {
  it('beş setlikte 3, yedi setlikte 4 set gerektirir', () => {
    expect(score(open(5), 'home', 33).finished).toBe(true);

    let b7 = open(7);
    for (let i = 0; i < 3; i++) b7 = score(b7, 'home', 11);
    expect(b7.finished).toBe(false);
    b7 = score(b7, 'home', 11);
    expect(b7.finished).toBe(true);
    expect(b7.winner).toBe('home');
  });

  it('biten maçta oynanmayan sete geçmez', () => {
    const state = score(open(5), 'home', 33);
    expect(state.periods).toHaveLength(3);
    expect(state.currentPeriod).toBe(2);
  });

  it('"Sonraki" ile kapatılan set maçı kazandırıyorsa maç orada biter', () => {
    let state = open(5);
    state = score(state, 'home', 22); // 2-0
    state = score(state, 'home', 8);
    state = score(state, 'away', 3);
    state = tabletennis.nextPeriod!(state);

    expect(state.finished).toBe(true);
    expect(state.winner).toBe('home');
    expect(setScore(state)).toEqual([3, 0]);
  });

  it('periodCount best-of değeridir', () => {
    expect(tabletennis.periodCount!(open(5))).toBe(5);
    expect(tabletennis.periodCount!(open(7))).toBe(7);
  });
});

describe('masa tenisi — erken bitirme ve geri alma', () => {
  it('setler eşitken oynanan setin sayılarına bakar', () => {
    let state = open();
    state = score(state, 'home', 7);
    state = score(state, 'away', 3);
    expect(tabletennis.finish(state).winner).toBe('home');
  });

  it('set kazandıran sayıyı geri alınca seti de geri verir', () => {
    let state = score(open(), 'home', 11);
    expect(setScore(state)).toEqual([1, 0]);

    state = tabletennis.undo(state);
    expect(setScore(state)).toEqual([0, 0]);
    expect(state.homeScore).toBe(10);
    expect(state.currentPeriod).toBe(0);
  });
});
