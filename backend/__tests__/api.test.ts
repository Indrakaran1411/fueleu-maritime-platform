import request from 'supertest';
import { createApp } from '../src/infrastructure/server/index';
import { query, db } from '../src/infrastructure/db/connection';

interface RouteResponse {
  id: string;
  routeId: string;
  year: number;
  isBaseline: boolean;
}

interface ComparisonResponse {
  baseline: RouteResponse;
  comparison: RouteResponse;
}

interface YearResponse {
  year: number;
}

interface AdjustedCbResponse extends YearResponse {
  adjustedCb: number;
}

interface BankRecordResponse {
  year: number;
}

interface BankingRecordsResponse {
  records: BankRecordResponse[];
  totalBanked: number;
}

function getRoute(routes: RouteResponse[], routeId: string, year: number): RouteResponse {
  const route = routes.find((item) => item.routeId === routeId && item.year === year);
  expect(route).toBeDefined();
  return route as RouteResponse;
}

describe('Backend API integration', () => {
  const app = createApp();
  const req = request(app);
  const testYear = 2024;
  const testShips = ['R001', 'R002', 'R003', 'R004', 'R005'];
  let route2024Id = '';

  beforeAll(async () => {
    const routesRes = await req.get('/routes');
    route2024Id = getRoute(routesRes.body as RouteResponse[], 'R001', 2024).id;
  });

  beforeEach(async () => {
    await query('DELETE FROM pool_members WHERE pool_id IN (SELECT id FROM pools)', []);
    await query('DELETE FROM pools', []);
    await query('DELETE FROM bank_entries WHERE ship_id = ANY($1)', [testShips]);
    await query('DELETE FROM ship_compliance WHERE ship_id = ANY($1)', [testShips]);
    await req.post(`/routes/${route2024Id}/baseline`);
  });

  afterAll(async () => {
    await db.end();
  });

  it('GET /routes returns seeded routes', async () => {
    const res = await req.get('/routes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as RouteResponse[]).some((route) => route.routeId === 'R001')).toBe(true);
  });

  it('POST /routes/:id/baseline sets the baseline route', async () => {
    const routesRes = await req.get('/routes');
    const route2024R002 = getRoute(routesRes.body as RouteResponse[], 'R002', 2024);
    const res = await req.post(`/routes/${route2024R002.id}/baseline`);
    expect(res.status).toBe(200);
    expect(res.body.routeId).toBe('R002');

    const comparison = await req.get('/routes/comparison');
    expect(comparison.status).toBe(200);
    expect(Array.isArray(comparison.body)).toBe(true);
    const comparisons = comparison.body as ComparisonResponse[];
    expect(comparisons.every((item) => item.baseline.routeId === 'R002')).toBe(true);
  });

  it('GET /routes/comparison returns comparisons relative to baseline', async () => {
    const res = await req.get('/routes/comparison');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const comparisons = res.body as ComparisonResponse[];
    expect(comparisons.some((item) => Boolean(item.baseline) && Boolean(item.comparison))).toBe(true);
  });

  it('GET /routes/comparison only compares routes in the baseline year', async () => {
    const res = await req.get('/routes/comparison');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const comparisons = res.body as ComparisonResponse[];
    expect(comparisons.every((item) => item.comparison.year === 2024)).toBe(true);
    expect(comparisons.map((item) => item.comparison.routeId).sort()).toEqual(['R002', 'R003']);
  });

  it('GET /compliance/cb?year=YYYY returns year-level CB list', async () => {
    const res = await req.get(`/compliance/cb?year=${testYear}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const records = res.body as YearResponse[];
    expect(records.every((item) => item.year === testYear)).toBe(true);
  });

  it('GET /compliance/adjusted-cb?year=YYYY returns adjusted CB records', async () => {
    const res = await req.get(`/compliance/adjusted-cb?year=${testYear}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const records = res.body as AdjustedCbResponse[];
    expect(records.every((item) => item.year === testYear)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toHaveProperty('adjustedCb');
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

  it('allows banked surplus from an earlier year to be applied in a later year for the same ship', async () => {
    const bankRes = await req.post('/banking/bank').send({ shipId: 'R001', year: 2024 });
    expect(bankRes.status).toBe(200);
    expect(bankRes.body.banked).toBeGreaterThan(0);

    const recordsRes = await req.get('/banking/records').query({ shipId: 'R001', year: 2025 });
    const bankingRecords = recordsRes.body as BankingRecordsResponse;
    expect(recordsRes.status).toBe(200);
    expect(bankingRecords.totalBanked).toBeGreaterThan(0);
    expect(bankingRecords.records.some((entry) => entry.year === 2024)).toBe(true);

    const cbRes = await req.get('/compliance/cb').query({ shipId: 'R001', year: 2025 });
    expect(cbRes.status).toBe(200);
    expect(cbRes.body.cb).toBeLessThan(0);

    const applyAmount = 1000;
    const applyRes = await req.post('/banking/apply').send({ shipId: 'R001', year: 2025, amount: applyAmount });
    expect(applyRes.status).toBe(200);
    expect(applyRes.body.applied).toBe(applyAmount);

    const adjustedRes = await req.get('/compliance/adjusted-cb').query({ shipId: 'R001', year: 2025 });
    expect(adjustedRes.status).toBe(200);
    expect(adjustedRes.body.bankedSurplus).toBeGreaterThanOrEqual(0);
  });

  it('POST /pools creates a valid pool for a year with non-negative total CB', async () => {
    const res = await req.post('/pools').send({ year: testYear, shipIds: ['R001', 'R002', 'R003'] });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.members).toBeInstanceOf(Array);
    expect(res.body.members.length).toBeGreaterThanOrEqual(2);
  });
});
