export type MarketSymbol =
  | 'r/AskReddit'
  | 'r/gaming'
  | 'r/technology'
  | 'r/memes'
  | 'r/fitness'
  | 'r/wallstreetbets'
  | 'r/aww'
  | 'r/explainlikeimfive'
  | 'r/anime'
  | 'r/nfl';

export type MarketSide = 'BUY' | 'SELL';

export type QuotePoint = {
  timestamp: string;
  price: number;
};

export type SubredditQuote = {
  symbol: MarketSymbol;
  displayName: string;
  price: number;
  changePercent: number;
  dailyHigh: number;
  dailyLow: number;
  history: QuotePoint[];
};

export type PortfolioPosition = {
  symbol: MarketSymbol;
  shares: number;
  value: number;
  costBasis: number;
  pnlPercent: number;
};

export type PortfolioSummary = {
  cash: number;
  totalValue: number;
  changePercent: number;
};

export type LeaderboardEntry = {
  rank: number;
  user: string;
  avatarColor: string;
  totalValue: number;
  changePercent: number;
  isSelf?: boolean;
};

export type TradeEvent = {
  id: string;
  user: string;
  symbol: MarketSymbol;
  side: MarketSide;
  quantity: number;
  price: number;
  timestamp: string;
};

export type TradeRequest = {
  symbol: MarketSymbol;
  side: MarketSide;
  quantity: number;
  username?: string;
};

export type TradeResponse = {
  trade: TradeEvent;
  portfolio: PortfolioResponse;
};

export type ApiError = {
  status: 'error';
  message: string;
};

export type PricesResponse = {
  quotes: SubredditQuote[];
  spotlight: MarketSymbol[];
};

export type PortfolioResponse = {
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
};

export type TradesResponse = {
  trades: TradeEvent[];
};
