import request from 'supertest';
import { createApp } from '../src/infrastructure/server/index';
import { query, db } from '../src/infrastructure/db/connection';

describe('Backend API integration', () => {
  const app = createApp();
  const req = request(app);
  const testYear = 2024;
  const testShips = ['R001', 'R002', 'R003'];

  beforeEach(async () => {
    await query('DELETE FROM pool_members WHERE pool_id IN (SELECT id FROM pools)', []);
    await query('DELETE FROM pools', []);
    await query('DELETE FROM bank_entries WHERE ship_id = ANY($1) AND year = $2', [testShips, testYear]);
    await query('DELETE FROM ship_compliance WHERE ship_id = ANY($1) AND year = $2', [testShips, testYear]);
    await req.post('/routes/R001/baseline');
  });

  afterAll(async () => {
    await db.end();
  });

  it('GET /routes returns seeded routes', async () => {
    const res = await req.get('/routes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((route: any) => route.routeId === 'R001')).toBeTruthy();
  });

  it('POST /routes/:id/baseline sets the baseline route', async () => {
    const res = await req.post('/routes/R002/baseline');
    expect(res.status).toBe(200);
    expect(res.body.routeId).toBe('R002');

    const comparison = await req.get('/routes/comparison');
    expect(comparison.status).toBe(200);
    expect(comparison.body[0].baseline.routeId).toBe('R002');
  });

  it('GET /routes/comparison returns comparisons relative to baseline', async () => {
    const res = await req.get('/routes/comparison');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((item: any) => item.baseline && item.comparison)).toBe(true);
  });

  it('GET /routes/comparison only compares routes in the baseline year', async () => {
    const res = await req.get('/routes/comparison');
    expect(res.status).toBe(200);
    expect(res.body.every((item: any) => item.comparison.year === 2024)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('GET /compliance/cb?year=YYYY returns year-level CB list', async () => {
    const res = await req.get(`/compliance/cb?year=${testYear}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((item: any) => item.year === testYear)).toBe(true);
  });

  it('GET /compliance/adjusted-cb?year=YYYY returns adjusted CB records', async () => {
    const res = await req.get(`/compliance/adjusted-cb?year=${testYear}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((item: any) => item.year === testYear)).toBe(true);
    expect(res.body[0]).toHaveProperty('adjustedCb');
  });

  it('POST /banking/bank and POST /banking/apply work for a positive CB ship', async () => {
    const bankRes = await req.post('/banking/bank').send({ shipId: 'R001', year: testYear });
    expect(bankRes.status).toBe(200);
    expect(bankRes.body.banked).toBeGreaterThan(0);
    expect(bankRes.body.entry).toMatchObject({ shipId: 'R001', year: testYear });

    const applyRes = await req.post('/banking/apply').send({ shipId: 'R001', year: testYear, amount: 1 });
    expect(applyRes.status).toBe(200);
    expect(applyRes.body.cbBefore).toBeGreaterThanOrEqual(0);
    expect(applyRes.body.cbAfter).toBe(applyRes.body.cbBefore + 1);
  });

  it('POST /pools creates a valid pool for a year with non-negative total CB', async () => {
    const res = await req.post('/pools').send({ year: testYear, shipIds: ['R001', 'R002', 'R003'] });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.members).toBeInstanceOf(Array);
    expect(res.body.members.length).toBeGreaterThanOrEqual(2);
  });
});
