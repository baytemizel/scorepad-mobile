import { useMatchStore } from '@/store/matchStore';
import { getEngine } from '@/sports';
import { MatchConfig, SportId } from '@/types';

const config = (sport: SportId, extra: Partial<MatchConfig> = {}): MatchConfig => ({
  sport,
  home: { id: 'home', name: 'Ev', color: '' },
  away: { id: 'away', name: 'Dep', color: '' },
  periodCount: getEngine(sport).meta.defaultPeriodCount,
  ...extra,
});

const store = () => useMatchStore.getState();
const active = () => useMatchStore.getState().active!;

beforeEach(() => useMatchStore.setState({ active: null, lastResult: null }));

describe('matchStore — periyot ilerletme', () => {
  it('her periyoda kendi skorunu yazar, koşan toplamı değil', () => {
    store().startMatch(config('football')); // iki devre
    store().applyAction('home', 'goal');
    store().applyAction('home', 'goal');

    store().nextPeriod();
    expect(active().periods[0]).toMatchObject({ index: 0, homeScore: 2, awayScore: 0 });
    expect(active().currentPeriod).toBe(1);
    expect(active().homeScore).toBe(2); // maç skoru koşmaya devam eder

    store().applyAction('home', 'goal');
    store().applyAction('away', 'goal');
    store().applyAction('away', 'goal');

    store().nextPeriod();
    expect(active().periods[1]).toMatchObject({ index: 1, homeScore: 1, awayScore: 2 });
  });

  it('son periyottan sonra maçı bitirir ve kazananı yazar', () => {
    store().startMatch(config('basketball', { periodCount: 2 }));
    store().applyAction('home', '3pt');

    store().nextPeriod();
    expect(active().finished).toBe(false);

    store().nextPeriod();
    expect(active().finished).toBe(true);
    expect(active().winner).toBe('home');
    expect(active().periods).toHaveLength(2);
  });

  it('bitmiş maçta periyot ilerletmez', () => {
    store().startMatch(config('football', { periodCount: 1 }));
    store().nextPeriod();
    const finished = active();
    store().nextPeriod();
    expect(active()).toBe(finished);
  });

  it('set sporlarında motorun kendi set geçişini kullanır', () => {
    store().startMatch(config('volleyball', { bestOf: 5, periodCount: 5 }));
    for (let i = 0; i < 12; i++) store().applyAction('home', 'point');

    store().nextPeriod();
    expect(active().currentPeriod).toBe(1);
    expect(active().homeScore).toBe(0); // yeni set 0-0 başlar
    expect(active().meta.homeSets).toBe(1);
    expect(active().finished).toBe(false);
  });
});

describe('matchStore — maç akışı', () => {
  it('biten maçı kazananıyla birlikte döndürür', () => {
    store().startMatch(config('handball'));
    store().applyAction('away', 'goal');
    const finished = store().finish()!;
    expect(finished.finished).toBe(true);
    expect(finished.winner).toBe('away');
  });

  it('geri alma son olayı siler', () => {
    store().startMatch(config('football'));
    store().applyAction('home', 'goal');
    store().undo();
    expect(active().homeScore).toBe(0);
    expect(active().events).toHaveLength(0);
  });

  it('taraf değiştirince skorlar da takımlarla birlikte gider', () => {
    store().startMatch(config('football'));
    store().applyAction('home', 'goal');
    store().swapSides();

    expect(active().config.home.name).toBe('Dep');
    expect(active().homeScore).toBe(0);
    expect(active().awayScore).toBe(1);
  });

  it('aktif maç yokken sessizce durur', () => {
    expect(store().applyAction('home', 'goal')).toBeNull();
    expect(store().finish()).toBeNull();
    expect(() => store().undo()).not.toThrow();
    expect(() => store().nextPeriod()).not.toThrow();
  });
});
