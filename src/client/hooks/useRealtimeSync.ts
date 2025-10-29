import { useEffect, useRef } from 'react';
import { connectRealtime, disconnectRealtime } from '@devvit/web/client';
import type { KeyedMutator } from 'swr';
import type {
  LeaderboardResponse,
  PortfolioResponse,
  PricesResponse,
  TradesResponse,
} from '../../shared/types/market';
import type { RealtimeEventType, RealtimeMessage } from '../../shared/types/realtime';
import { REALTIME_CHANNEL, REALTIME_EVENT_VERSION } from '../../shared/types/realtime';

type UseRealtimeSyncOptions = {
  mutateTrades: KeyedMutator<TradesResponse>;
  mutatePortfolio: KeyedMutator<PortfolioResponse>;
  mutatePrices: KeyedMutator<PricesResponse>;
  mutateLeaderboard: KeyedMutator<LeaderboardResponse>;
};

const isoLaterOrEqual = (previous: string | undefined, next: string) => {
  if (!previous) return false;
  return previous >= next;
};

export const useRealtimeSync = ({
  mutateTrades,
  mutatePortfolio,
  mutatePrices,
  mutateLeaderboard,
}: UseRealtimeSyncOptions) => {
  const lastTimestampsRef = useRef<Record<RealtimeEventType, string>>({
    TRADE_EVENT: '',
    PRICE_UPDATE: '',
    LEADERBOARD_UPDATE: '',
  });

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        await connectRealtime<RealtimeMessage>({
          channel: REALTIME_CHANNEL,
          onMessage: async (message) => {
            if (cancelled) return;
            if (message.version !== REALTIME_EVENT_VERSION) return;
            const last = lastTimestampsRef.current[message.type];
            if (isoLaterOrEqual(last, message.timestamp)) return;
            lastTimestampsRef.current[message.type] = message.timestamp;

            switch (message.type) {
              case 'TRADE_EVENT': {
                const trade = message.payload.trade;
                if (!trade) break;
                await mutateTrades(
                  (current) => {
                    const existing = current?.trades ?? [];
                    if (existing.some((item) => item.id === trade.id)) {
                      return current ?? { trades: existing };
                    }
                    return { trades: [trade, ...existing].slice(0, 30) };
                  },
                  { revalidate: false }
                );
                void mutatePortfolio();
                break;
              }
              case 'PRICE_UPDATE': {
                await mutatePrices(() => message.payload, { revalidate: false });
                break;
              }
              case 'LEADERBOARD_UPDATE': {
                await mutateLeaderboard(() => ({ entries: message.payload.entries }), {
                  revalidate: false,
                });
                break;
              }
              default:
                break;
            }
          },
        });
      } catch (error) {
        console.error('[realtime] connection failed', error);
      }
    };

    void start();

    return () => {
      cancelled = true;
      void disconnectRealtime(REALTIME_CHANNEL);
    };
  }, [mutateLeaderboard, mutatePortfolio, mutatePrices, mutateTrades]);
};
