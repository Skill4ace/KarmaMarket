import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createExpressApp } from '../app';

describe('GET /api/health', () => {
  it('returns a healthy service response', async () => {
    const app = createExpressApp();

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      message: expect.stringContaining('Karma Market'),
    });
    expect(typeof response.body.timestamp).toBe('string');
  });
});
