const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('returns ok status when the database is reachable', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
