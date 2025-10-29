import type {
  LeaderboardEntry,
  PricesResponse,
  TradeEvent,
} from './market';

export const REALTIME_CHANNEL = 'karma-market';
export const REALTIME_EVENT_VERSION = 1;

export type RealtimeEventType = 'TRADE_EVENT' | 'PRICE_UPDATE' | 'LEADERBOARD_UPDATE';

export type TradeRealtimePayload = {
  trade: TradeEvent;
};

export type PriceRealtimePayload = PricesResponse;

export type LeaderboardRealtimePayload = {
  entries: LeaderboardEntry[];
};

export type RealtimeEnvelope<Type extends RealtimeEventType, Payload> = {
  type: Type;
  version: number;
  timestamp: string;
  payload: Payload;
};

export type TradeRealtimeEnvelope = RealtimeEnvelope<'TRADE_EVENT', TradeRealtimePayload>;
export type PriceRealtimeEnvelope = RealtimeEnvelope<'PRICE_UPDATE', PriceRealtimePayload>;
export type LeaderboardRealtimeEnvelope = RealtimeEnvelope<
  'LEADERBOARD_UPDATE',
  LeaderboardRealtimePayload
>;

export type RealtimeMessage =
  | TradeRealtimeEnvelope
  | PriceRealtimeEnvelope
  | LeaderboardRealtimeEnvelope;
