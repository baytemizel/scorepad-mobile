import { act, engineFor, score, setScore, start } from './helpers';

const volleyball = engineFor('volleyball');
const open = (bestOf: 3 | 5) => start('volleyball', { bestOf });

describe('voleybol — set kazanımı', () => {
  it('25 sayıda ve iki fark varsa seti verir', () => {
    let state = open(3);
    state = score(state, 'home', 24);
    state = score(state, 'away', 24);
    expect(setScore(state)).toEqual([0, 0]);

    state = act(state, 'home', 'point');
    expect(setScore(state)).toEqual([0, 0]); // 25-24: iki fark yok

    state = act(state, 'home', 'point');
    expect(setScore(state)).toEqual([1, 0]); // 26-24
  });

  it('biten seti kaydedip yeni seti 0-0 açar', () => {
    let state = open(3);
    state = score(state, 'home', 24);
    state = score(state, 'away', 24);
    state = score(state, 'home', 2);

    expect(state.periods[0]).toMatchObject({ index: 0, homeScore: 26, awayScore: 24 });
    expect(state.homeScore).toBe(0);
    expect(state.awayScore).toBe(0);
    expect(state.currentPeriod).toBe(1);
  });
});

describe('voleybol — karar seti 15 sayı', () => {
  it('üç setlikte 3. set 15 sayıya oynanır', () => {
    let state = open(3);
    state = score(state, 'home', 25);
    state = score(state, 'away', 25);
    expect(state.currentPeriod).toBe(2);

    state = score(state, 'home', 14);
    expect(state.finished).toBe(false);

    state = act(state, 'home', 'point');
    expect(state.finished).toBe(true);
    expect(state.winner).toBe('home');
  });

  it('beş setlikte 5. set 15 sayıya oynanır ve 3 set gerekir', () => {
    let state = open(5);
    state = score(state, 'home', 50); // 2 set
    state = score(state, 'away', 50); // 2 set
    expect(state.finished).toBe(false);
    expect(state.currentPeriod).toBe(4);

    state = score(state, 'away', 14);
    expect(state.finished).toBe(false);

    state = act(state, 'away', 'point');
    expect(state.finished).toBe(true);
    expect(state.winner).toBe('away');
    expect(setScore(state)).toEqual([2, 3]);
  });
});

describe('voleybol — maçın bitişi', () => {
  it('gereken set sayısına ulaşınca durur', () => {
    let state = open(3);
    state = score(state, 'home', 50);
    expect(state.finished).toBe(true);
    expect(state.winner).toBe('home');
    // Biten maçta oynanmayan 3. set açılmaz.
    expect(state.currentPeriod).toBe(1);
    expect(state.periods).toHaveLength(2);
  });

  it('"Sonraki" ile kapatılan set maçı kazandırıyorsa maç orada biter', () => {
    let state = open(3);
    state = score(state, 'home', 25); // 1-0
    state = score(state, 'home', 20);
    state = score(state, 'away', 11);
    state = volleyball.nextPeriod!(state);

    expect(state.finished).toBe(true);
    expect(state.winner).toBe('home');
    expect(setScore(state)).toEqual([2, 0]);
    expect(state.periods).toHaveLength(2);
  });

  it('"Sonraki" maçı bitirmiyorsa sadece sete geçer', () => {
    let state = open(5);
    state = score(state, 'home', 12);
    state = score(state, 'away', 9);
    state = volleyball.nextPeriod!(state);

    expect(state.finished).toBe(false);
    expect(setScore(state)).toEqual([1, 0]);
    expect(state.currentPeriod).toBe(1);
    expect(state.homeScore).toBe(0);
  });

  it('berabere kapatılan sette kimseye set yazmaz', () => {
    let state = open(5);
    state = score(state, 'home', 7);
    state = score(state, 'away', 7);
    state = volleyball.nextPeriod!(state);
    expect(setScore(state)).toEqual([0, 0]);
  });
});

describe('voleybol — erken bitirme', () => {
  it('setler eşitken oynanan setin sayılarına bakar', () => {
    let state = open(3);
    state = score(state, 'home', 20);
    state = score(state, 'away', 11);
    expect(volleyball.finish(state).winner).toBe('home');
  });

  it('kazanılmış set, devam eden setteki geriliğe baskın gelir', () => {
    let state = open(5);
    state = score(state, 'home', 25); // 1-0
    state = score(state, 'away', 9);
    expect(volleyball.finish(state).winner).toBe('home');
  });
});

describe('voleybol — geri alma', () => {
  it('set kazandıran sayıyı geri alınca seti de geri verir', () => {
    let state = open(3);
    state = score(state, 'home', 24);
    state = score(state, 'away', 20);
    state = act(state, 'home', 'point'); // 25-20, set biter
    expect(setScore(state)).toEqual([1, 0]);

    state = volleyball.undo(state);
    expect(setScore(state)).toEqual([0, 0]);
    expect(state.homeScore).toBe(24);
    expect(state.awayScore).toBe(20);
    expect(state.currentPeriod).toBe(0);
    expect(state.periods).toEqual([]);
  });

  it('maçı bitiren sayıyı geri alınca maç yeniden açılır', () => {
    let state = open(3);
    state = score(state, 'home', 50);
    expect(state.finished).toBe(true);

    state = volleyball.undo(state);
    expect(state.finished).toBe(false);
    expect(state.winner).toBeUndefined();
    expect(setScore(state)).toEqual([1, 0]);
  });

  it('"Sonraki" ile kapatılan seti geri alır', () => {
    let state = open(5);
    state = score(state, 'home', 12);
    state = score(state, 'away', 9);
    state = volleyball.nextPeriod!(state);
    state = volleyball.undo(state);

    expect(setScore(state)).toEqual([0, 0]);
    expect(state.homeScore).toBe(12);
    expect(state.awayScore).toBe(9);
    expect(state.currentPeriod).toBe(0);
  });
});

describe('voleybol — döküm', () => {
  it('periodCount best-of değeridir', () => {
    expect(volleyball.periodCount!(open(3))).toBe(3);
    expect(volleyball.periodCount!(open(5))).toBe(5);
  });

  it('biten setlerin skorunu, yarım seti de canlı gösterir', () => {
    let state = open(5);
    state = score(state, 'home', 25);
    state = score(state, 'home', 7);
    state = score(state, 'away', 3);

    expect(volleyball.getPeriodSummary!(state, 0, 'home').score).toBe(25);
    expect(volleyball.getPeriodSummary!(state, 1, 'home').score).toBe(7);
    expect(volleyball.getPeriodSummary!(state, 1, 'away').score).toBe(3);
  });
});
