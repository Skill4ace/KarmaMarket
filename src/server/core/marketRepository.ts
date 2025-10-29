import { redis } from '@devvit/web/server';
import type {
  LeaderboardEntry,
  LeaderboardResponse,
  MarketSide,
  MarketSymbol,
  PortfolioPosition,
  PortfolioResponse,
  PricesResponse,
  SubredditQuote,
  TradeEvent,
  TradesResponse,
} from '../../shared/types/market';
import {
  canonicalSubredditSymbols,
  mockLeaderboard,
  mockPortfolioPositions,
  mockPortfolioSummary,
  mockQuotes,
  mockTrades,
} from '../../shared/data/mockMarket';
import {
  broadcastLeaderboardUpdate,
  broadcastPriceUpdate,
  broadcastTradeEvent,
} from './realtime';
import { PRICE_ENGINE_CONFIG } from '../../shared/types/priceEngine';
import { getKarmaStipend, DEFAULT_STIPEND } from './karmaService';

const ns = (suffix: string) => `karma-market:${suffix}`;
const TRADES_KEY = ns('trades');
const summaryKey = (user: string) => ns(`portfolio:summary:${user}`);
const positionsKey = (user: string) => ns(`portfolio:positions:${user}`);
const flowTradeKey = (symbol: MarketSymbol) => ns(`flow:trades:${symbol}`);
const flowAggregateKey = (symbol: MarketSymbol) => ns(`flow:agg:${symbol}`);
const activityKey = (symbol: MarketSymbol) => ns(`activity:${symbol}`);
const dailyKey = (symbol: MarketSymbol) => ns(`daily:${symbol}`);

const DAY_MS = 24 * 60 * 60 * 1000;

const userKey = (username?: string): string => {
  if (!username) return 'demo';
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return 'demo';
  if (trimmed === 'guest') return 'demo';
  return trimmed;
};

type StoredSummary = {
  cash: number;
  changePercent: number;
};

type StoredPosition = {
  symbol: MarketSymbol;
  shares: number;
  costBasis: number;
};

type MetricSample = {
  timestamp: number;
  value: number;
};

type DailyState = {
  date: string;
  open: number;
  high: number;
  low: number;
  frozen: boolean;
};

const DEFAULT_SUMMARY: StoredSummary = {
  cash: DEFAULT_STIPEND,
  changePercent: 0,
};

const DEFAULT_POSITIONS: StoredPosition[] = [];

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const MEMORY_KEY = '__karmaMarketMemoryStore__';

type MemoryContainer = {
  seededAt: string | null;
  quotes: Map<MarketSymbol, SubredditQuote>;
  symbols: MarketSymbol[];
  spotlight: MarketSymbol[];
  summary: Map<string, StoredSummary>;
  positions: Map<string, StoredPosition[]>;
  leaderboard: LeaderboardEntry[];
  trades: TradeEvent[];
  flowTrades: Map<MarketSymbol, MetricSample[]>;
  flowAggregates: Map<MarketSymbol, MetricSample[]>;
  activitySamples: Map<MarketSymbol, MetricSample[]>;
  daily: Map<MarketSymbol, DailyState>;
};

const getMemory = (): MemoryContainer => {
  const globalObj = globalThis as typeof globalThis & { [MEMORY_KEY]?: MemoryContainer };
  if (!globalObj[MEMORY_KEY]) {
    globalObj[MEMORY_KEY] = {
      seededAt: null,
      quotes: new Map(),
      symbols: [],
      spotlight: [],
      summary: new Map(),
      positions: new Map(),
      leaderboard: [...mockLeaderboard],
      trades: [...mockTrades],
      flowTrades: new Map(),
      flowAggregates: new Map(),
      activitySamples: new Map(),
      daily: new Map(),
    };
  }
  return globalObj[MEMORY_KEY]!;
};

const memory = getMemory();

let useMemoryStore = false;
let memoryWarningLogged = false;

const seedMemoryIfNeeded = () => {
  if (memory.seededAt) return;
  memory.symbols = [...canonicalSubredditSymbols];
  memory.spotlight = canonicalSubredditSymbols.slice(0, 4);
  memory.quotes = new Map(mockQuotes.map((quote) => [quote.symbol, quote]));
  memory.summary = new Map();
  memory.positions = new Map();
  memory.leaderboard = [...mockLeaderboard];
  memory.trades = [...mockTrades];
  memory.flowTrades = new Map(canonicalSubredditSymbols.map((symbol) => [symbol, []]));
  memory.flowAggregates = new Map(canonicalSubredditSymbols.map((symbol) => [symbol, []]));
  memory.activitySamples = new Map(canonicalSubredditSymbols.map((symbol) => [symbol, []]));
  const today = new Date().toISOString().slice(0, 10);
  memory.daily = new Map(
    canonicalSubredditSymbols.map((symbol) => {
      const quote = memory.quotes.get(symbol);
      const price = quote?.price ?? mockQuotes.find((item) => item.symbol === symbol)?.price ?? 0;
      return [
        symbol,
        {
          date: today,
          open: price,
          high: price,
          low: price,
          frozen: false,
        } satisfies DailyState,
      ];
    })
  );
  memory.seededAt = new Date().toISOString();
};

const seedRedisIfNeeded = async () => {
  const seeded = await redis.get(ns('seeded'));
  if (seeded) return;

  await redis.set(ns('symbols'), JSON.stringify(canonicalSubredditSymbols));
  await redis.set(ns('spotlight'), JSON.stringify(canonicalSubredditSymbols.slice(0, 4)));

  for (const quote of mockQuotes) {
    await redis.hSet(ns(`price:${quote.symbol}`), {
      displayName: quote.displayName,
      price: quote.price.toString(),
      changePercent: quote.changePercent.toString(),
      dailyHigh: quote.dailyHigh.toString(),
      dailyLow: quote.dailyLow.toString(),
      history: JSON.stringify(quote.history),
    });
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    await redis.set(
      dailyKey(quote.symbol),
      JSON.stringify({
        date: today,
        open: quote.price,
        high: quote.price,
        low: quote.price,
        frozen: false,
      } satisfies DailyState)
    );
    await recordActivitySample(
      quote.symbol,
      Math.max(10, Math.round(quote.price / 4)),
      now
    );
    await recordFlowAggregateSample(quote.symbol, 0, now);
  }

  await redis.set(summaryKey('demo'), JSON.stringify(DEFAULT_SUMMARY));
  await redis.set(positionsKey('demo'), JSON.stringify(DEFAULT_POSITIONS));
  await redis.set(ns('leaderboard'), JSON.stringify(mockLeaderboard));

  await redis.set(TRADES_KEY, JSON.stringify(mockTrades));

  await redis.set(ns('seeded'), new Date().toISOString());
};

const ensureStorageReady = async () => {
  if (useMemoryStore) {
    seedMemoryIfNeeded();
    return;
  }
  try {
    await seedRedisIfNeeded();
  } catch (error) {
    useMemoryStore = true;
    seedMemoryIfNeeded();
    if (!memoryWarningLogged) {
      console.warn(
        'Redis unavailable – using in-memory store. Data resets on server restart.',
        (error as Error).message
      );
      memoryWarningLogged = true;
    }
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const upsertMemorySamples = (
  map: Map<MarketSymbol, MetricSample[]>,
  symbol: MarketSymbol,
  sample: MetricSample,
  retentionMs: number
) => {
  const cutoff = sample.timestamp - retentionMs;
  const existing = map.get(symbol) ?? [];
  const filtered = existing.filter((item) => item.timestamp >= cutoff);
  filtered.push(sample);
  map.set(symbol, filtered);
};

const readMemorySamples = (
  map: Map<MarketSymbol, MetricSample[]>,
  symbol: MarketSymbol,
  minTimestamp: number,
  maxTimestamp: number
): MetricSample[] => {
  const samples = map.get(symbol) ?? [];
  const filtered = samples.filter(
    (sample) => sample.timestamp >= minTimestamp && sample.timestamp <= maxTimestamp
  );
  map.set(
    symbol,
    samples.filter((sample) => sample.timestamp >= minTimestamp - PRICE_ENGINE_CONFIG.sampleRetentionMs)
  );
  return filtered;
};

const addSample = async (
  key: string,
  map: Map<MarketSymbol, MetricSample[]>,
  symbol: MarketSymbol,
  sample: MetricSample,
  retentionMs: number
) => {
  if (useMemoryStore) {
    upsertMemorySamples(map, symbol, sample, retentionMs);
    return;
  }
  await redis.zAdd(key, { member: sample.value.toString(), score: sample.timestamp });
  await redis.zRemRangeByScore(key, 0, sample.timestamp - retentionMs);
};

const getSamples = async (
  key: string,
  map: Map<MarketSymbol, MetricSample[]>,
  symbol: MarketSymbol,
  minTimestamp: number,
  maxTimestamp: number
): Promise<MetricSample[]> => {
  if (useMemoryStore) {
    return readMemorySamples(map, symbol, minTimestamp, maxTimestamp);
  }
  const entries = await redis.zRange(key, minTimestamp, maxTimestamp, { by: 'score' });
  return entries.map((entry) => ({
    timestamp: entry.score,
    value: Number(entry.member),
  }));
};

const computeStats = (values: number[]) => {
  if (!values.length) {
    return { mean: 0, stdDev: 0 };
  }
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / Math.max(values.length - 1, 1);
  return { mean, stdDev: Math.sqrt(variance) };
};

const computeZScore = (value: number, mean: number, stdDev: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(mean) || stdDev === 0) return 0;
  return (value - mean) / stdDev;
};

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

const generateActivitySample = (previous: number | undefined, netFlow: number, price: number) => {
  const baseline = previous ?? Math.max(15, price / 3);
  const flowInfluence = Math.abs(netFlow) * 1.8;
  const drift = baseline * 0.15;
  const noisy = baseline * 0.6 + flowInfluence + randomInRange(-drift, drift) + 25;
  return Math.max(5, Math.round(noisy));
};

const recordFlowTradeSample = async (symbol: MarketSymbol, value: number, timestamp: number) => {
  await addSample(flowTradeKey(symbol), memory.flowTrades, symbol, { value, timestamp }, PRICE_ENGINE_CONFIG.sampleRetentionMs);
};

const getFlowTradeSamples = async (
  symbol: MarketSymbol,
  minTimestamp: number,
  maxTimestamp: number
) => getSamples(flowTradeKey(symbol), memory.flowTrades, symbol, minTimestamp, maxTimestamp);

const recordFlowAggregateSample = async (
  symbol: MarketSymbol,
  value: number,
  timestamp: number
) => {
  await addSample(
    flowAggregateKey(symbol),
    memory.flowAggregates,
    symbol,
    { value, timestamp },
    PRICE_ENGINE_CONFIG.sampleRetentionMs
  );
};

const getFlowAggregateSamples = async (
  symbol: MarketSymbol,
  minTimestamp: number,
  maxTimestamp: number
) => getSamples(flowAggregateKey(symbol), memory.flowAggregates, symbol, minTimestamp, maxTimestamp);

const recordActivitySample = async (
  symbol: MarketSymbol,
  value: number,
  timestamp: number
) => {
  await addSample(
    activityKey(symbol),
    memory.activitySamples,
    symbol,
    { value, timestamp },
    PRICE_ENGINE_CONFIG.sampleRetentionMs
  );
};

const getActivitySamples = async (
  symbol: MarketSymbol,
  minTimestamp: number,
  maxTimestamp: number
) => getSamples(activityKey(symbol), memory.activitySamples, symbol, minTimestamp, maxTimestamp);

const loadDailyState = async (
  symbol: MarketSymbol,
  currentPrice: number,
  now: number
): Promise<DailyState> => {
  const today = new Date(now).toISOString().slice(0, 10);
  if (useMemoryStore) {
    const existing = memory.daily.get(symbol);
    if (!existing || existing.date !== today) {
      const fresh: DailyState = {
        date: today,
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        frozen: false,
      };
      memory.daily.set(symbol, fresh);
      return { ...fresh };
    }
    return { ...existing };
  }
  const raw = await redis.get(dailyKey(symbol));
  if (!raw) {
    const fresh: DailyState = {
      date: today,
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      frozen: false,
    };
    await redis.set(dailyKey(symbol), JSON.stringify(fresh));
    return fresh;
  }
  let parsed: DailyState;
  try {
    parsed = JSON.parse(raw) as DailyState;
  } catch {
    parsed = {
      date: today,
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      frozen: false,
    };
  }
  if (parsed.date !== today) {
    parsed = {
      date: today,
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      frozen: false,
    };
  }
  return parsed;
};

const saveDailyState = async (symbol: MarketSymbol, state: DailyState) => {
  if (useMemoryStore) {
    memory.daily.set(symbol, { ...state });
    return;
  }
  await redis.set(dailyKey(symbol), JSON.stringify(state));
};

const persistQuote = async (quote: SubredditQuote) => {
  if (useMemoryStore) {
    memory.quotes.set(quote.symbol, quote);
    return;
  }
  await redis.hSet(ns(`price:${quote.symbol}`), {
    displayName: quote.displayName,
    price: quote.price.toString(),
    changePercent: quote.changePercent.toString(),
    dailyHigh: quote.dailyHigh.toString(),
    dailyLow: quote.dailyLow.toString(),
    history: JSON.stringify(quote.history),
  });
};

const selectSpotlight = (quotes: SubredditQuote[]): MarketSymbol[] => {
  return [...quotes]
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 4)
    .map((quote) => quote.symbol);
};

const persistSpotlight = async (spotlight: MarketSymbol[]) => {
  if (useMemoryStore) {
    memory.spotlight = spotlight;
    return;
  }
  await redis.set(ns('spotlight'), JSON.stringify(spotlight));
};

const parseQuote = (symbol: MarketSymbol, data: Record<string, string>): SubredditQuote | null => {
  if (!data.price) return null;
  let history: SubredditQuote['history'] = [];
  try {
    history = JSON.parse(data.history ?? '[]');
  } catch {
    history = [];
  }
  return {
    symbol,
    displayName: data.displayName ?? symbol,
    price: Number(data.price),
    changePercent: Number(data.changePercent ?? 0),
    dailyHigh: Number(data.dailyHigh ?? 0),
    dailyLow: Number(data.dailyLow ?? 0),
    history,
  };
};

const loadQuotes = async (): Promise<SubredditQuote[]> => {
  await ensureStorageReady();
  if (useMemoryStore) {
    return Array.from(memory.quotes.values());
  }

  const symbolsJson = await redis.get(ns('symbols'));
  if (!symbolsJson) return mockQuotes;
  const symbols: MarketSymbol[] = JSON.parse(symbolsJson);
  const quotes: SubredditQuote[] = [];
  for (const symbol of symbols) {
    const data = await redis.hGetAll(ns(`price:${symbol}`));
    const quote = parseQuote(symbol, data);
    if (quote) quotes.push(quote);
  }
  return quotes.length ? quotes : mockQuotes;
};

const loadSpotlight = async (fallback: MarketSymbol[]): Promise<MarketSymbol[]> => {
  await ensureStorageReady();
  if (useMemoryStore) {
    return memory.spotlight.length ? memory.spotlight : fallback;
  }
  const raw = await redis.get(ns('spotlight'));
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as MarketSymbol[];
    return parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const initializeUserSummary = async (username: string): Promise<StoredSummary> => {
  const key = userKey(username);
  if (useMemoryStore) {
    const legacy = memory.summary.get('guest');
    if (!memory.summary.has(key) && legacy) {
      memory.summary.delete('guest');
      memory.summary.set(key, legacy);
      const legacyPositions = memory.positions.get('guest');
      if (legacyPositions) {
        memory.positions.delete('guest');
        memory.positions.set(key, legacyPositions);
      }
    }
  }
  if (key === 'demo') {
    const summary: StoredSummary = {
      cash: mockPortfolioSummary.cash,
      changePercent: mockPortfolioSummary.changePercent,
    };
    if (useMemoryStore) {
      memory.summary.set(key, summary);
      memory.positions.set(
        key,
        mockPortfolioPositions.map((position) => ({
          symbol: position.symbol,
          shares: position.shares,
          costBasis: position.costBasis,
        }))
      );
    } else {
      await redis.set(summaryKey(key), JSON.stringify(summary));
      await redis.set(positionsKey(key), JSON.stringify(mockPortfolioPositions));
    }
    return { ...summary };
  }

  const { stipend } = await getKarmaStipend(username);
  const summary: StoredSummary = {
    cash: stipend,
    changePercent: DEFAULT_SUMMARY.changePercent,
  };
  if (useMemoryStore) {
    memory.summary.set(key, summary);
    memory.positions.set(key, []);
  } else {
    await redis.set(summaryKey(key), JSON.stringify(summary));
    await redis.set(positionsKey(key), JSON.stringify([]));
  }
  return { ...summary };
};

const loadSummary = async (username: string): Promise<StoredSummary> => {
  await ensureStorageReady();
  const key = userKey(username);
  if (useMemoryStore) {
    const existing = memory.summary.get(key);
    if (existing) return { ...existing };
    return initializeUserSummary(username);
  }
  let raw = await redis.get(summaryKey(key));
  if (!raw && key === 'demo') {
    const legacyRaw = await redis.get(summaryKey('guest'));
    if (legacyRaw) {
      await redis.set(summaryKey(key), legacyRaw);
      raw = legacyRaw;
    }
  }
  if (!raw) {
    return initializeUserSummary(username);
  }
  try {
    const parsed = JSON.parse(raw) as StoredSummary;
    return {
      cash: parsed.cash ?? DEFAULT_SUMMARY.cash,
      changePercent: parsed.changePercent ?? DEFAULT_SUMMARY.changePercent,
    };
  } catch {
    return initializeUserSummary(username);
  }
};

const saveSummary = async (username: string, summary: StoredSummary) => {
  const key = userKey(username);
  if (useMemoryStore) {
    memory.summary.set(key, { ...summary });
    return;
  }
  await redis.set(summaryKey(key), JSON.stringify(summary));
};

const loadPositions = async (username: string): Promise<StoredPosition[]> => {
  await ensureStorageReady();
  const key = userKey(username);
  if (useMemoryStore) {
    const existing = memory.positions.get(key) ?? [];
    memory.positions.set(key, existing);
    return existing.map((pos) => ({ ...pos }));
  }
  let raw = await redis.get(positionsKey(key));
  if (!raw && key === 'demo') {
    const legacyRaw = await redis.get(positionsKey('guest'));
    if (legacyRaw) {
      await redis.set(positionsKey(key), legacyRaw);
      raw = legacyRaw;
    }
  }
  if (!raw) {
    await redis.set(positionsKey(key), JSON.stringify([]));
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as StoredPosition[];
    return parsed.map((pos) => ({
      symbol: pos.symbol,
      shares: pos.shares,
      costBasis: pos.costBasis,
    }));
  } catch {
    return [];
  }
};

const savePositions = async (username: string, positions: StoredPosition[]) => {
  const key = userKey(username);
  if (useMemoryStore) {
    memory.positions.set(key, positions.map((pos) => ({ ...pos })));
    return;
  }
  await redis.set(positionsKey(key), JSON.stringify(positions));
};

const loadTradesState = async (): Promise<TradeEvent[]> => {
  await ensureStorageReady();
  if (useMemoryStore) {
    return memory.trades.map((trade) => ({ ...trade }));
  }
  const raw = await redis.get(TRADES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TradeEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveTradesState = async (trades: TradeEvent[]) => {
  if (useMemoryStore) {
    memory.trades = trades.map((trade) => ({ ...trade }));
    return;
  }
  await redis.set(TRADES_KEY, JSON.stringify(trades));
};

const appendTrade = async (trade: TradeEvent) => {
  const trades = await loadTradesState();
  const updated = [trade, ...trades].slice(0, 30);
  await saveTradesState(updated);
};

const buildPortfolioResponse = (
  summary: StoredSummary,
  positions: StoredPosition[],
  quotes: SubredditQuote[]
): PortfolioResponse => {
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const detailedPositions: PortfolioPosition[] = positions.map((position) => {
    const quote = quoteMap.get(position.symbol);
    const price = quote?.price ?? 0;
    const value = round(position.shares * price);
    const costBasis = round(position.costBasis);
    const avgCost = position.shares > 0 ? position.costBasis / position.shares : 0;
    const pnlPercent =
      position.shares > 0 && avgCost > 0
        ? round(((price - avgCost) / avgCost) * 100, 1)
        : 0;
    return {
      symbol: position.symbol,
      shares: position.shares,
      value,
      costBasis,
      pnlPercent,
    };
  });

  const holdingsValue = detailedPositions.reduce((acc, pos) => acc + pos.value, 0);
  const totalValue = round(summary.cash + holdingsValue);

  return {
    summary: {
      cash: round(summary.cash),
      totalValue,
      changePercent: summary.changePercent,
    },
    positions: detailedPositions,
  };
};

export const fetchPrices = async (): Promise<PricesResponse> => {
  const quotes = await loadQuotes();
  const spotlight = await loadSpotlight(quotes.slice(0, 4).map((quote) => quote.symbol));
  return { quotes, spotlight };
};

export const fetchPortfolio = async (username: string): Promise<PortfolioResponse> => {
  const summary = await loadSummary(username);
  const [positions, quotes] = await Promise.all([
    loadPositions(username),
    loadQuotes(),
  ]);
  return buildPortfolioResponse(summary, positions, quotes);
};

export const fetchLeaderboard = async (): Promise<LeaderboardResponse> => {
  await ensureStorageReady();
  if (useMemoryStore) return { entries: memory.leaderboard };
  const raw = await redis.get(ns('leaderboard'));
  try {
    if (raw) {
      const parsed = JSON.parse(raw) as LeaderboardEntry[];
      if (parsed.length) return { entries: parsed };
    }
  } catch {
    // ignore parse errors
  }
  return { entries: mockLeaderboard };
};

export const fetchTrades = async (): Promise<TradesResponse> => {
  const trades = await loadTradesState();
  return { trades: trades.length ? trades : mockTrades };
};

const updatePriceForSymbol = async (
  quote: SubredditQuote,
  now: number
): Promise<{ quote: SubredditQuote; delta: number }> => {
  const symbol = quote.symbol;
  const flowWindowStart = now - PRICE_ENGINE_CONFIG.flowWindowMs;
  const flowSamples = await getFlowTradeSamples(symbol, flowWindowStart, now);
  const netFlow = flowSamples.reduce((acc, sample) => acc + sample.value, 0);

  const flowHistorySamples = await getFlowAggregateSamples(
    symbol,
    now - PRICE_ENGINE_CONFIG.sampleRetentionMs,
    now
  );
  const flowStats = computeStats(flowHistorySamples.map((sample) => sample.value));

  await recordFlowAggregateSample(symbol, netFlow, now);

  const activitySamples = await getActivitySamples(
    symbol,
    now - PRICE_ENGINE_CONFIG.sampleRetentionMs,
    now
  );
  const activityStats = computeStats(activitySamples.map((sample) => sample.value));
  const previousActivityValue = activitySamples.at(-1)?.value;
  const activityValue = generateActivitySample(previousActivityValue, netFlow, quote.price);

  await recordActivitySample(symbol, activityValue, now);

  const flowZ = computeZScore(netFlow, flowStats.mean, flowStats.stdDev);
  const activityZ = computeZScore(activityValue, activityStats.mean, activityStats.stdDev);
  const blended =
    PRICE_ENGINE_CONFIG.activityWeight * activityZ +
    PRICE_ENGINE_CONFIG.flowWeight * flowZ;
  const dampened = Math.tanh(blended);
  let delta = clamp(
    dampened * PRICE_ENGINE_CONFIG.volatilityTarget,
    -PRICE_ENGINE_CONFIG.maxChangePerTick,
    PRICE_ENGINE_CONFIG.maxChangePerTick
  );

  const dailyState = await loadDailyState(symbol, quote.price, now);
  if (dailyState.frozen) {
    delta = 0;
  }

  let newPrice = round(quote.price * (1 + delta));
  if (newPrice < 1) newPrice = 1;

  if (!dailyState.frozen) {
    const dailyChange = (newPrice - dailyState.open) / dailyState.open;
    if (Math.abs(dailyChange) >= PRICE_ENGINE_CONFIG.freezeThreshold) {
      dailyState.frozen = true;
      const cappedMultiplier =
        1 + Math.sign(dailyChange) * PRICE_ENGINE_CONFIG.freezeThreshold;
      newPrice = round(dailyState.open * cappedMultiplier);
      delta = newPrice / quote.price - 1;
    }
  }

  dailyState.high = Math.max(dailyState.high, newPrice);
  dailyState.low = Math.min(dailyState.low, newPrice);
  await saveDailyState(symbol, dailyState);

  const history = [
    ...quote.history,
    { timestamp: new Date(now).toISOString(), price: newPrice },
  ];
  const historyCutoff = now - PRICE_ENGINE_CONFIG.historyRetentionMs;
  const trimmedHistory = history.filter(
    (point) => new Date(point.timestamp).getTime() >= historyCutoff
  );

  const dayCutoff = now - DAY_MS;
  const dayPoints = trimmedHistory.filter(
    (point) => new Date(point.timestamp).getTime() >= dayCutoff
  );
  const dayPrices = dayPoints.map((point) => point.price);
  const dayOpen = dayPoints[0]?.price ?? newPrice;
  const dailyHigh = round(Math.max(newPrice, ...dayPrices));
  const dailyLow = round(Math.min(newPrice, ...dayPrices));
  const changePercent = round(((newPrice - dayOpen) / dayOpen) * 100, 1);

  const updatedQuote: SubredditQuote = {
    ...quote,
    price: newPrice,
    changePercent,
    dailyHigh,
    dailyLow,
    history: trimmedHistory,
  };

  await persistQuote(updatedQuote);
  return { quote: updatedQuote, delta };
};

export const runPriceEngineTick = async (): Promise<PricesResponse> => {
  await ensureStorageReady();
  const now = Date.now();
  const existingQuotes = await loadQuotes();
  const updatedQuotes: SubredditQuote[] = [];
  let triggerLeaderboard = false;

  for (const quote of existingQuotes) {
    const result = await updatePriceForSymbol(quote, now);
    updatedQuotes.push(result.quote);
    if (Math.abs(result.delta) >= PRICE_ENGINE_CONFIG.leaderboardRecalcThreshold) {
      triggerLeaderboard = true;
    }
  }

  const spotlight = selectSpotlight(updatedQuotes);
  await persistSpotlight(spotlight);
  await broadcastPriceUpdate({ quotes: updatedQuotes, spotlight });
  if (triggerLeaderboard) {
    const leaderboard = await fetchLeaderboard();
    await broadcastLeaderboardUpdate({ entries: leaderboard.entries });
  }
  return { quotes: updatedQuotes, spotlight };
};

export const executeTrade = async ({
  symbol,
  side,
  quantity,
  username,
}: {
  symbol: MarketSymbol;
  side: MarketSide;
  quantity: number;
  username: string;
}): Promise<{ trade: TradeEvent; portfolio: PortfolioResponse }> => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive integer.');
  }

  const quotes = await loadQuotes();
  const quote = quotes.find((item) => item.symbol === symbol);
  if (!quote) {
    throw new Error('Unknown subreddit symbol.');
  }

  const summary = await loadSummary(username);
  const positions = await loadPositions(username);
  const tradeUser = username.trim() || 'guest';
  const positionMap = new Map<MarketSymbol, StoredPosition>();
  positions.forEach((pos) => positionMap.set(pos.symbol, { ...pos }));
  const current = positionMap.get(symbol) ?? { symbol, shares: 0, costBasis: 0 };

  if (side === 'BUY') {
    const totalCost = quote.price * quantity;
    if (summary.cash + 1e-6 < totalCost) {
      throw new Error('Insufficient cash for this trade.');
    }
    summary.cash = round(summary.cash - totalCost);
    current.costBasis = round(current.costBasis + totalCost);
    current.shares += quantity;
  } else {
    if (current.shares < quantity) {
      console.warn('[trade] insufficient shares', {
        username,
        symbol,
        availableShares: current.shares,
        requested: quantity,
        positions,
      });
      throw new Error('Insufficient shares to sell.');
    }
    const remainingShares = current.shares - quantity;
    const avgCost = current.shares > 0 ? current.costBasis / current.shares : 0;
    current.shares = remainingShares;
    current.costBasis = round(avgCost * remainingShares);
    summary.cash = round(summary.cash + quote.price * quantity);
  }

  if (current.shares > 0) {
    positionMap.set(symbol, current);
  } else {
    positionMap.delete(symbol);
  }

  const updatedPositions = Array.from(positionMap.values());

  await saveSummary(username, summary);
  await savePositions(username, updatedPositions);

  const trade: TradeEvent = {
    id: `trade-${Date.now()}`,
    user: tradeUser,
    symbol,
    side,
    quantity,
    price: round(quote.price),
    timestamp: new Date().toISOString(),
  };

  await appendTrade(trade);
  await recordFlowTradeSample(symbol, side === 'BUY' ? quantity : -quantity, Date.now());

  const portfolio = buildPortfolioResponse(summary, updatedPositions, quotes);
  const spotlight = await loadSpotlight(quotes.slice(0, 4).map((item) => item.symbol));
  const leaderboard = await fetchLeaderboard();
  await Promise.all([
    broadcastTradeEvent({ trade }),
    broadcastPriceUpdate({ quotes, spotlight }),
    broadcastLeaderboardUpdate({ entries: leaderboard.entries }),
  ]);
  return { trade, portfolio };
};

export const __resetMemoryStore = () => {
  useMemoryStore = false;
  memoryWarningLogged = false;
  memory.seededAt = null;
  memory.quotes.clear();
  memory.symbols = [];
  memory.spotlight = [];
  memory.summary = new Map();
  memory.positions = new Map();
  memory.leaderboard = [...mockLeaderboard];
  memory.trades = [...mockTrades];
  memory.flowTrades = new Map();
  memory.flowAggregates = new Map();
  memory.activitySamples = new Map();
  memory.daily = new Map();
};
