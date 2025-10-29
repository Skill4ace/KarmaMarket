import type {
  LeaderboardEntry,
  MarketSymbol,
  PortfolioPosition,
  PortfolioSummary,
  SubredditQuote,
  TradeEvent,
} from '../types/market';

const canonicalSymbols: MarketSymbol[] = [
  'r/AskReddit',
  'r/gaming',
  'r/technology',
  'r/memes',
  'r/fitness',
  'r/wallstreetbets',
  'r/aww',
  'r/explainlikeimfive',
  'r/anime',
  'r/nfl',
];

const deterministicNoise = (seed: number) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const HOURS_IN_WEEK = 24 * 7;

const buildHistory = (seed: number, basePrice: number): SubredditQuote['history'] => {
  const random = deterministicNoise(seed);
  const points: SubredditQuote['history'] = [];
  let price = basePrice;
  const spacingMs = 60 * 60 * 1000;
  const start = Date.now() - (HOURS_IN_WEEK - 1) * spacingMs;

  for (let i = 0; i < HOURS_IN_WEEK; i++) {
    const drift = (random() - 0.5) * 2;
    const pctMove = drift * 0.4;
    price = Math.max(10, price * (1 + pctMove / 100));
    points.push({
      timestamp: new Date(start + i * spacingMs).toISOString(),
      price: Math.round(price * 100) / 100,
    });
  }
  return points;
};

const symbolMeta: Record<MarketSymbol, { displayName: string; seed: number; base: number }> = {
  'r/AskReddit': { displayName: 'r/AskReddit', seed: 13, base: 150 },
  'r/gaming': { displayName: 'r/gaming', seed: 23, base: 120 },
  'r/technology': { displayName: 'r/technology', seed: 47, base: 135 },
  'r/memes': { displayName: 'r/memes', seed: 19, base: 95 },
  'r/fitness': { displayName: 'r/fitness', seed: 31, base: 110 },
  'r/wallstreetbets': { displayName: 'r/wallstreetbets', seed: 61, base: 200 },
  'r/aww': { displayName: 'r/aww', seed: 29, base: 85 },
  'r/explainlikeimfive': { displayName: 'r/explainlikeimfive', seed: 37, base: 105 },
  'r/anime': { displayName: 'r/anime', seed: 53, base: 115 },
  'r/nfl': { displayName: 'r/nfl', seed: 71, base: 140 },
};

const buildQuote = (symbol: MarketSymbol): SubredditQuote => {
  const meta = symbolMeta[symbol];
  const history = buildHistory(meta.seed, meta.base);
  const latest = history[history.length - 1]?.price ?? meta.base;
  const daySlice = history.slice(-24);
  const dayOpen = daySlice[0]?.price ?? latest;
  const changePercent = ((latest - dayOpen) / dayOpen) * 100;
  const highs = daySlice.length ? daySlice.map((point) => point.price) : [latest];
  const dailyHigh = Math.max(...highs, latest);
  const dailyLow = Math.min(...highs, latest);

  return {
    symbol,
    displayName: meta.displayName,
    price: latest,
    changePercent: Math.round(changePercent * 10) / 10,
    dailyHigh: Math.round(dailyHigh * 100) / 100,
    dailyLow: Math.round(dailyLow * 100) / 100,
    history,
  };
};

const buildPortfolio = (quotes: SubredditQuote[]): PortfolioPosition[] => {
  return quotes.slice(0, 4).map((quote, index) => {
    const shares = [22, 18, 12, 9][index] ?? 6;
    const base = quote.price * (1 - quote.changePercent / 200);
    const value = shares * quote.price;
    const costBasis = shares * base;
    const pnlPercent = ((value - costBasis) / costBasis) * 100;
    return {
      symbol: quote.symbol,
      shares,
      value: Math.round(value * 100) / 100,
      costBasis: Math.round(costBasis * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 10) / 10,
    };
  });
};

const buildLeaderboard = (quotes: SubredditQuote[]): LeaderboardEntry[] => {
  const seedColors = ['#FF4500', '#0DD157', '#0079D3', '#FFD600', '#A855F7'];
  const leaderboardHandles = [
    'quantwhale',
    'gammaforge',
    'algo_aurora',
    'you',
    'delta_druid',
    'memeconomist',
    'scarletbull',
    'indexink',
  ];
  const totals = leaderboardHandles.map((handle, index) => {
    if (handle === 'you') {
      return {
        handle,
        total: mockPortfolioSummary.totalValue,
        change: mockPortfolioSummary.changePercent,
      };
    }
    const quote = quotes[index % quotes.length]!;
    const base = 15000 + index * 2200;
    const modifier = index % 2 === 0 ? 1 : -1;
    const total = base + modifier * quote.price * 18;
    const change = ((index + 3) % 7) * 1.4 - 2.2;
    return { handle, total, change };
  });

  const sorted = totals
    .map((item, index) => ({
      rank: index + 1,
      ...item,
      color: seedColors[index % seedColors.length]!,
    }))
    .sort((a, b) => b.total - a.total)
    .map((entry, index) => ({
      rank: index + 1,
      user: entry.handle,
      avatarColor: entry.color,
      totalValue: Math.round(entry.total * 100) / 100,
      changePercent: Math.round(entry.change * 10) / 10,
      isSelf: entry.handle === 'you',
    }));

  return sorted;
};

const buildTrades = (quotes: SubredditQuote[]): TradeEvent[] => {
  const now = Date.now();
  const users = ['pixelwhale', 'quantling', 'kimchiOptions', 'sigmaSigma', 'rallyCap'];
  return Array.from({ length: 12 }).map((_, index) => {
    const quote = quotes[(index + 2) % quotes.length]!;
    const side = index % 3 === 0 ? 'SELL' : 'BUY';
    const priceMultiplier = 1 + (side === 'BUY' ? 0.005 * index : -0.004 * index);
    return {
      id: `mock-trade-${index}`,
      user: users[index % users.length]!,
      symbol: quote.symbol,
      side,
      quantity: [6, 12, 18, 9, 4][index % 5]!,
      price: Math.round(quote.price * priceMultiplier * 100) / 100,
      timestamp: new Date(now - index * 60_000).toISOString(),
    };
  });
};

export const mockQuotes: SubredditQuote[] = canonicalSymbols.map((symbol) => buildQuote(symbol));

export const mockPortfolioPositions: PortfolioPosition[] = buildPortfolio(mockQuotes);

export const mockPortfolioSummary: PortfolioSummary = {
  cash: 5120,
  totalValue: mockPortfolioPositions.reduce((acc, pos) => acc + pos.value, 0) + 5120,
  changePercent: 3.6,
};

export const mockLeaderboard: LeaderboardEntry[] = buildLeaderboard(mockQuotes);

export const mockTrades: TradeEvent[] = buildTrades(mockQuotes);

export const getQuoteBySymbol = (symbol: MarketSymbol) =>
  mockQuotes.find((quote) => quote.symbol === symbol) ?? mockQuotes[0]!;

export const canonicalSubredditSymbols = canonicalSymbols;
