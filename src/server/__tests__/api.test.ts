import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createExpressApp } from '../app';

const app = createExpressApp();

describe('API routes', () => {
  it('returns prices payload', async () => {
    const res = await request(app).get('/api/prices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.quotes)).toBe(true);
    expect(res.body.quotes.length).toBeGreaterThan(0);
  });

  it('returns portfolio payload', async () => {
    const res = await request(app).get('/api/portfolio');
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(Array.isArray(res.body.positions)).toBe(true);
  });

  it('returns leaderboard payload', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it('returns trades payload', async () => {
    const res = await request(app).get('/api/trades');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trades)).toBe(true);
  });

  it('executes a trade', async () => {
    const res = await request(app)
      .post('/api/trade')
      .send({ symbol: 'r/AskReddit', side: 'BUY', quantity: 1 });
    expect(res.status).toBe(200);
    expect(res.body.trade).toMatchObject({
      symbol: 'r/AskReddit',
      side: 'BUY',
      quantity: 1,
    });
    expect(res.body.portfolio).toBeDefined();
    expect(res.body.portfolio.summary.cash).toBeDefined();
  });
});
