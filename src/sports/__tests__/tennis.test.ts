import { MatchState, TennisFormat } from '@/types';
import { act, engineFor, score, setScore, start, winGames } from './helpers';

const tennis = engineFor('tennis');
const open = (tennisFormat: TennisFormat = 'best-of-3') => start('tennis', { tennisFormat });

/** Points as shown on the scoreboard, via the engine's own stat line. */
const points = (state: MatchState, side: 'home' | 'away') =>
  String(tennis.getStatLines!(state, side)[0]!.value);
const games = (state: MatchState): [number, number] => [
  state.meta.homeGames as number,
  state.meta.awayGames as number,
];
/** Play out a set to 6-6 by alternating whole games. */
const toSixAll = (state: MatchState): MatchState => {
  for (let i = 0; i < 12; i++) state = winGames(state, i % 2 === 0 ? 'home' : 'away', 1);
  return state;
};

describe('tenis — oyun içi sayılar', () => {
  it('0 / 15 / 30 / 40 sırasını izler', () => {
    let state = open();
    expect(points(state, 'home')).toBe('0');
    state = act(state, 'home', 'point');
    expect(points(state, 'home')).toBe('15');
    state = act(state, 'home', 'point');
    expect(points(state, 'home')).toBe('30');
    state = act(state, 'home', 'point');
    expect(points(state, 'home')).toBe('40');
  });

  it("40'tan sonraki sayı oyunu alır ve sayıları sıfırlar", () => {
    const state = score(open(), 'home', 4);
    expect(games(state)).toEqual([1, 0]);
    expect(points(state, 'home')).toBe('0');
  });

  it("deuce, avantaj ve deuce'a dönüşü yürütür", () => {
    let state = open();
    state = score(state, 'home', 3);
    state = score(state, 'away', 3);
    expect([points(state, 'home'), points(state, 'away')]).toEqual(['40', '40']);

    state = act(state, 'home', 'point');
    expect([points(state, 'home'), points(state, 'away')]).toEqual(['AD', '40']);
    expect(games(state)).toEqual([0, 0]);

    state = act(state, 'away', 'point');
    expect([points(state, 'home'), points(state, 'away')]).toEqual(['40', '40']);
    expect(games(state)).toEqual([0, 0]);

    state = score(state, 'home', 2);
    expect(games(state)).toEqual([1, 0]);
  });
});

describe('tenis — set kazanımı', () => {
  it('6 oyunda iki fark ister', () => {
    let state = open();
    state = winGames(state, 'home', 5);
    state = winGames(state, 'away', 5);
    expect(setScore(state)).toEqual([0, 0]);

    state = winGames(state, 'home', 1); // 6-5
    expect(setScore(state)).toEqual([0, 0]);

    state = winGames(state, 'home', 1); // 7-5
    expect(setScore(state)).toEqual([1, 0]);
  });

  it('6-0 gibi net setleri anında kapatır', () => {
    const state = winGames(open(), 'home', 6);
    expect(setScore(state)).toEqual([1, 0]);
  });
});

describe('tenis — tiebreak', () => {
  it("6-6'da başlar ve 7 sayı + iki farkla biter", () => {
    let state = toSixAll(open());
    expect(state.meta.tiebreak).toBe(true);
    expect(setScore(state)).toEqual([0, 0]);

    state = score(state, 'home', 6);
    state = score(state, 'away', 6);
    expect(setScore(state)).toEqual([0, 0]); // 6-6, iki fark yok

    state = act(state, 'home', 'point'); // 7-6
    expect(setScore(state)).toEqual([0, 0]);

    state = act(state, 'home', 'point'); // 8-6
    expect(setScore(state)).toEqual([1, 0]);
  });

  it('tiebreak setini 7-6 olarak kaydeder ve bayrağı kapatır', () => {
    let state = toSixAll(open());
    state = score(state, 'home', 7);
    expect(state.periods[0]).toMatchObject({ homeScore: 7, awayScore: 6 });
    expect(state.meta.tiebreak).toBe(false);
  });
});

describe('tenis — maçın bitişi', () => {
  it('üç setlikte 2, beş setlikte 3 set gerektirir', () => {
    let b3 = winGames(open(), 'home', 6);
    expect(b3.finished).toBe(false);
    b3 = winGames(b3, 'home', 6);
    expect(b3.finished).toBe(true);
    expect(b3.winner).toBe('home');

    let b5 = open('best-of-5');
    for (let i = 0; i < 2; i++) b5 = winGames(b5, 'home', 6);
    expect(b5.finished).toBe(false);
    b5 = winGames(b5, 'home', 6);
    expect(b5.finished).toBe(true);
  });

  it('biten maçta oynanmayan sete geçmez', () => {
    const state = winGames(open(), 'home', 12);
    expect(state.periods).toHaveLength(2);
    expect(state.currentPeriod).toBe(1);
    expect(state.homeScore).toBe(6); // son setin oyunları tahtada kalır
  });

  it('"Sonraki" ile kapatılan set maçı kazandırıyorsa maç orada biter', () => {
    let state = winGames(open(), 'home', 6); // 1-0
    state = winGames(state, 'home', 3);
    state = tennis.nextPeriod!(state);

    expect(state.finished).toBe(true);
    expect(state.winner).toBe('home');
    expect(setScore(state)).toEqual([2, 0]);
    expect(state.periods).toHaveLength(2);
  });

  it('periodCount oynanabilecek en fazla set sayısıdır', () => {
    expect(tennis.periodCount!(open())).toBe(3);
    expect(tennis.periodCount!(open('best-of-5'))).toBe(5);
  });
});

describe('tenis — erken bitirme', () => {
  it('setler eşitse oyunlara, oyunlar da eşitse sayılara bakar', () => {
    const bySets = winGames(open(), 'home', 6);
    expect(tennis.finish(winGames(bySets, 'away', 2)).winner).toBe('home');

    const byGames = winGames(open(), 'home', 3);
    expect(tennis.finish(winGames(byGames, 'away', 1)).winner).toBe('home');

    const byPoints = score(open(), 'away', 2);
    expect(tennis.finish(byPoints).winner).toBe('away');

    expect(tennis.finish(open()).winner).toBe('draw');
  });
});

describe('tenis — geri alma', () => {
  it('oyun kazandıran sayıyı geri alır', () => {
    let state = score(open(), 'home', 4);
    expect(games(state)).toEqual([1, 0]);

    state = tennis.undo(state);
    expect(games(state)).toEqual([0, 0]);
    expect(points(state, 'home')).toBe('40');
  });

  it('maçı bitiren sayıyı geri alınca maç yeniden açılır', () => {
    let state = winGames(open(), 'home', 12);
    expect(state.finished).toBe(true);

    state = tennis.undo(state);
    expect(state.finished).toBe(false);
    expect(setScore(state)).toEqual([1, 0]);
  });
});
