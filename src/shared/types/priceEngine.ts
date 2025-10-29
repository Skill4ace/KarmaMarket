export type PriceEngineConfig = {
  /** How often the price engine should run in milliseconds. */
  tickIntervalMs: number;
  /** Sliding window for subreddit activity aggregation (ms). */
  activityWindowMs: number;
  /** Sliding window for order-flow aggregation (ms). */
  flowWindowMs: number;
  /** Retention for historical samples (ms). */
  sampleRetentionMs: number;
  /** Retention window for chart history (ms). */
  historyRetentionMs: number;
  /** Blend weights for activity vs. order flow. */
  activityWeight: number;
  flowWeight: number;
  /** Target per-tick volatility (e.g. 0.01 => 1%). */
  volatilityTarget: number;
  /** Hard clamp for per-tick absolute percent move. */
  maxChangePerTick: number;
  /** Daily freeze threshold (absolute percent change). */
  freezeThreshold: number;
  /** Change threshold that warrants leaderboard recalculation. */
  leaderboardRecalcThreshold: number;
};

export const PRICE_ENGINE_CONFIG: PriceEngineConfig = {
  tickIntervalMs: 120_000, // 2 minutes
  activityWindowMs: 15 * 60 * 1000, // 15 minutes
  flowWindowMs: 15 * 60 * 1000, // 15 minutes
  sampleRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  historyRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  activityWeight: 0.6,
  flowWeight: 0.4,
  volatilityTarget: 0.01, // aim for ~1% per tick
  maxChangePerTick: 0.03, // clamp to ±3% per tick
  freezeThreshold: 0.25, // freeze if price moves ±25% in a day
  leaderboardRecalcThreshold: 0.05, // trigger leaderboard update if move ≥5%
};

export const PRICE_ENGINE_JOB_NAME = 'price-engine-tick';
export const PRICE_ENGINE_SCHEDULER_ENDPOINT = '/internal/scheduler/price-engine-tick';
export const PRICE_ENGINE_MANUAL_ENDPOINT = '/internal/dev/price-engine/run';
