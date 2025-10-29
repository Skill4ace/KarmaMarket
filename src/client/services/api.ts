import useSWR from 'swr';
import type {
  LeaderboardResponse,
  PortfolioResponse,
  PricesResponse,
  TradesResponse,
} from '../../shared/types/market';
import { ACTIVE_USERNAME, apiUrl } from '../lib/api';

const fetcher = async <T>(path: string): Promise<T> => {
  const headers: HeadersInit = {};
  if (ACTIVE_USERNAME) headers['X-User-Name'] = ACTIVE_USERNAME;
  const res = await fetch(apiUrl(path), { credentials: 'include', headers });
  if (!res.ok) {
    throw new Error(`Request failed with ${res.status}`);
  }
  return (await res.json()) as T;
};

export const usePrices = () =>
  useSWR<PricesResponse>('/api/prices', fetcher, {
    refreshInterval: 120_000,
  });

export const usePortfolio = () =>
  useSWR<PortfolioResponse>('/api/portfolio', fetcher, {
    refreshInterval: 180_000,
  });

export const useLeaderboard = () =>
  useSWR<LeaderboardResponse>('/api/leaderboard', fetcher, {
    refreshInterval: 180_000,
  });

export const useTrades = () =>
  useSWR<TradesResponse>('/api/trades', fetcher, {
    refreshInterval: 60_000,
  });
