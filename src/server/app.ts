import express from 'express';
import type { HealthResponse } from '../shared/types/api';
import type {
  PricesResponse,
  PortfolioResponse,
  LeaderboardResponse,
  TradesResponse,
  TradeRequest,
  TradeResponse,
  ApiError,
  MarketSymbol,
} from '../shared/types/market';
import { context } from '@devvit/web/server';
import { createPost } from './core/post';
import {
  fetchLeaderboard,
  fetchPortfolio,
  fetchPrices,
  fetchTrades,
  executeTrade,
  runPriceEngineTick,
} from './core/marketRepository';
import {
  PRICE_ENGINE_MANUAL_ENDPOINT,
  PRICE_ENGINE_SCHEDULER_ENDPOINT,
} from '../shared/types/priceEngine';
import { computeStipend, getDeterministicMockKarma } from './core/karmaService';

const extractUsername = (req: express.Request<any, any, any, any>): string => {
  const headerCandidates = [
    req.header('x-reddit-username'),
    req.header('x-devvit-user'),
    req.header('x-user-name'),
  ];
  const queryUser = typeof req.query.user === 'string' ? req.query.user : undefined;
  const username = headerCandidates.find((value) => value && value.trim()) || queryUser || 'demo';
  const trimmed = username.trim();
  return trimmed || 'demo';
};

export const createExpressApp = () => {
  const app = express();

  // Middleware for JSON, urlencoded, and text payloads so later milestones can reuse.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text());

  const router = express.Router();

  router.get<unknown, HealthResponse>('/api/health', (_req, res): void => {
    res.json({
      status: 'ok',
      message: 'Karma Market service is online.',
      timestamp: new Date().toISOString(),
    });
  });

  router.get<unknown, PricesResponse>('/api/prices', async (_req, res): Promise<void> => {
    res.json(await fetchPrices());
  });

  router.get<unknown, PortfolioResponse>('/api/portfolio', async (req, res): Promise<void> => {
    const username = extractUsername(req);
    res.json(await fetchPortfolio(username));
  });

  router.get<unknown, LeaderboardResponse>('/api/leaderboard', async (_req, res): Promise<void> => {
    res.json(await fetchLeaderboard());
  });

  router.get<unknown, TradesResponse>('/api/trades', async (_req, res): Promise<void> => {
    res.json(await fetchTrades());
  });

  router.post<unknown, TradeResponse | ApiError, TradeRequest>(
    '/api/trade',
    async (req, res): Promise<void> => {
      try {
        const { symbol, side, quantity, username: bodyUsername } = req.body ?? {};
        const parsedQuantity = Number(quantity);
        if (!symbol || (side !== 'BUY' && side !== 'SELL') || !Number.isFinite(parsedQuantity)) {
          res.status(400).json({ status: 'error', message: 'Invalid trade payload.' });
          return;
        }
        const usernameFromBody =
          typeof bodyUsername === 'string' && bodyUsername.trim().length > 0
            ? bodyUsername
            : undefined;
        const username = usernameFromBody ?? extractUsername(req);
        const result = await executeTrade({
          symbol: symbol as MarketSymbol,
          side,
          quantity: Math.trunc(parsedQuantity),
          username,
        });
        res.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to execute trade. Please retry.';
        res.status(400).json({ status: 'error', message });
      }
    }
  );

  router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
    try {
      const post = await createPost();

      res.json({
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
      });
    } catch (error) {
      console.error(`Error creating post: ${error}`);
      res.status(400).json({
        status: 'error',
        message: 'Failed to create post',
      });
    }
  });

  router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
    try {
      const post = await createPost();

      res.json({
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      });
    } catch (error) {
      console.error(`Error creating post: ${error}`);
      res.status(400).json({
        status: 'error',
        message: 'Failed to create post',
      });
    }
  });

  router.post(PRICE_ENGINE_SCHEDULER_ENDPOINT, async (_req, res): Promise<void> => {
    try {
      await runPriceEngineTick();
      res.json({ status: 'success' });
    } catch (error) {
      console.error('Price engine scheduler tick failed', error);
      res.status(500).json({ status: 'error', message: 'Price engine tick failed' });
    }
  });

  router.post(PRICE_ENGINE_MANUAL_ENDPOINT, async (_req, res): Promise<void> => {
    try {
      const prices = await runPriceEngineTick();
      res.json({ status: 'success', prices });
    } catch (error) {
      console.error('Price engine manual tick failed', error);
      res.status(500).json({ status: 'error', message: 'Price engine tick failed' });
    }
  });

  router.get('/internal/dev/karma', (req, res): void => {
    const username = extractUsername(req);
    const karma = getDeterministicMockKarma(username);
    res.json({ username, karma, stipend: computeStipend(karma) });
  });

  app.use(router);

  return app;
};
