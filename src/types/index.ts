/**
 * Core domain types for ScorePad.
 * These types describe matches, teams, scoring events and configurations
 * across all supported sports.
 */

export type SportId =
  | 'basketball'
  | 'football'
  | 'handball'
  | 'volleyball'
  | 'tennis'
  | 'tabletennis';

export type TeamSide = 'home' | 'away';

export interface TeamConfig {
  /** Unique id for this team within a match. */
  id: TeamSide;
  /** Display name. */
  name: string;
  /** Hex color used for accents on the score screen. */
  color: string;
}

/** Period / set / half — the unit each sport uses to segment a match. */
export interface PeriodState {
  index: number;
  /** Final score per side at the moment this period ended. */
  homeScore: number;
  awayScore: number;
  /** Sport-specific extra payload (e.g. tennis games per set). */
  meta?: Record<string, unknown>;
}

/** A single scoring event recorded during a match. Used for undo + replay. */
export interface ScoreEvent {
  id: string;
  matchId: string;
  side: TeamSide;
  /** Sport-specific action (e.g. '2pt', '3pt', 'goal', 'point'). */
  action: string;
  /** Numeric value applied to the running raw score. */
  value: number;
  /** Optional period index this event belongs to. */
  periodIndex: number;
  timestamp: number;
}

/** Configuration created during the Match Setup screen. */
export interface MatchConfig {
  sport: SportId;
  home: TeamConfig;
  away: TeamConfig;
  /** Number of periods / halves / sets configured for this match. */
  periodCount: number;
  /** Period duration in minutes (informational; we don't run live timers). */
  periodMinutes?: number;
  /** Best-of for set-based sports. */
  bestOf?: number;
  /** Allow overtime when scores tied. */
  allowOvertime?: boolean;
  /** Tennis-specific format. */
  tennisFormat?: TennisFormat;
}

export type TennisFormat = 'best-of-3' | 'best-of-5';

export interface MatchState {
  id: string;
  config: MatchConfig;
  /** Raw running scores in the current period. */
  homeScore: number;
  awayScore: number;
  /** Index of the currently active period (0-based). */
  currentPeriod: number;
  /** All completed periods so far (history). */
  periods: PeriodState[];
  /** Linear list of scoring events (latest first NOT enforced; ordered by timestamp). */
  events: ScoreEvent[];
  /** Sport-specific runtime data. */
  meta: Record<string, unknown>;
  /** True when the match has ended (winner determined or user finished). */
  finished: boolean;
  startedAt: number;
  finishedAt?: number;
  /** Cached final winner for finished matches. */
  winner?: TeamSide | 'draw';
}

/** Result returned by sport rule engines after each scoring action. */
export interface ApplyResult {
  next: MatchState;
  /** True if the period ended on this action (e.g. set won). */
  periodEnded: boolean;
  /** True if the entire match ended on this action. */
  matchEnded: boolean;
}

/** Metadata describing a sport for menus and rule selection. */
export interface SportMeta {
  id: SportId;
  /** i18n key for the display name. */
  nameKey: string;
  /** Emoji/icon shown in lists. */
  icon: string;
  /** MaterialCommunityIcons glyph name shown in the sport badge. */
  mdiIcon: string;
  /** Brand gradient colors. */
  gradient: [string, string];
  /** True if the sport uses set-based scoring (volleyball, tennis, table tennis). */
  setBased: boolean;
  /** Default period count if not configured. */
  defaultPeriodCount: number;
}

/** Persisted match record used by Match History. */
export interface MatchRecord {
  id: string;
  sport: SportId;
  homeName: string;
  awayName: string;
  homeFinalScore: number;
  awayFinalScore: number;
  winner: TeamSide | 'draw';
  startedAt: number;
  finishedAt: number;
  periods: PeriodState[];
  /** Stored events for review (capped). */
  events: ScoreEvent[];
}

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  isPremium: boolean;
  createdAt: number;
}
