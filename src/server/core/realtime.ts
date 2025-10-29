import { context, realtime } from '@devvit/web/server';
import type {
  LeaderboardRealtimePayload,
  RealtimeEnvelope,
  RealtimeEventType,
  RealtimeMessage,
  TradeRealtimePayload,
  PriceRealtimePayload,
} from '../../shared/types/realtime';
import {
  REALTIME_CHANNEL,
  REALTIME_EVENT_VERSION,
} from '../../shared/types/realtime';

const logPrefix = '[realtime]';

const hasRealtimeContext = () => {
  try {
    // Accessing any property forces the getter and throws if no context is available.
    void context.postId;
    return true;
  } catch {
    return false;
  }
};

const buildEnvelope = <Type extends RealtimeEventType, Payload>(
  type: Type,
  payload: Payload
): RealtimeEnvelope<Type, Payload> => ({
  type,
  version: REALTIME_EVENT_VERSION,
  timestamp: new Date().toISOString(),
  payload,
});

export const broadcastRealtimeMessage = async (message: RealtimeMessage) => {
  if (!hasRealtimeContext()) {
    return;
  }
  try {
    await realtime.send(REALTIME_CHANNEL, message);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (!err.message.includes('No context found')) {
      console.error(`${logPrefix} Failed to broadcast ${message.type}`, err);
    }
  }
};

export const broadcastTradeEvent = async (payload: TradeRealtimePayload) => {
  const envelope = buildEnvelope('TRADE_EVENT', payload);
  await broadcastRealtimeMessage(envelope);
};

export const broadcastPriceUpdate = async (payload: PriceRealtimePayload) => {
  const envelope = buildEnvelope('PRICE_UPDATE', payload);
  await broadcastRealtimeMessage(envelope);
};

export const broadcastLeaderboardUpdate = async (payload: LeaderboardRealtimePayload) => {
  const envelope = buildEnvelope('LEADERBOARD_UPDATE', payload);
  await broadcastRealtimeMessage(envelope);
};
