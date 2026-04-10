import { Router, Request, Response } from 'express';
import {
  ComputeCB,
  GetAdjustedCB,
  GetCBs,
  GetAdjustedCBs,
  BankSurplus,
  ApplyBanked,
  CreatePool,
} from '../../../core/application/usecases';
import { PgRouteRepository } from '../../outbound/postgres/routeRepository';
import {
  PgComplianceRepository,
  PgBankRepository,
  PgPoolRepository,
} from '../../outbound/postgres/otherRepositories';

// ─── Compliance ───────────────────────────────────────────────────────────────

export function createComplianceRouter(): Router {
  const router = Router();
  const routeRepo = new PgRouteRepository();
  const complianceRepo = new PgComplianceRepository();
  const bankRepo = new PgBankRepository();

  // GET /compliance/cb?year=2024 or /compliance/cb?shipId=R001&year=2024
  router.get('/cb', async (req: Request, res: Response) => {
    const { shipId, year } = req.query as { shipId?: string; year?: string };
    if (!year) {
      res.status(400).json({ error: 'year is required' });
      return;
    }

    try {
      if (shipId) {
        const result = await new ComputeCB(routeRepo, complianceRepo).execute(shipId, Number(year));
        res.json({ shipId, year: Number(year), ...result });
      } else {
        const list = await new GetCBs(routeRepo, complianceRepo).execute(Number(year));
        res.json(list);
      }
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // GET /compliance/adjusted-cb?year=2024 or /compliance/adjusted-cb?shipId=R001&year=2024
  router.get('/adjusted-cb', async (req: Request, res: Response) => {
    const { shipId, year } = req.query as { shipId?: string; year?: string };
    if (!year) {
      res.status(400).json({ error: 'year is required' });
      return;
    }

    try {
      if (shipId) {
        const result = await new GetAdjustedCB(routeRepo, complianceRepo, bankRepo).execute(
          shipId,
          Number(year)
        );
        res.json(result);
      } else {
        const list = await new GetAdjustedCBs(routeRepo, complianceRepo, bankRepo).execute(Number(year));
        res.json(list);
      }
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}

// ─── Banking ──────────────────────────────────────────────────────────────────

export function createBankingRouter(): Router {
  const router = Router();
  const routeRepo = new PgRouteRepository();
  const complianceRepo = new PgComplianceRepository();
  const bankRepo = new PgBankRepository();

  // GET /banking/records?shipId=R001&year=2024
  router.get('/records', async (req: Request, res: Response) => {
    const { shipId, year } = req.query as { shipId: string; year: string };
    if (!shipId || !year) {
      res.status(400).json({ error: 'shipId and year are required' });
      return;
    }
    try {
      const records = await bankRepo.findByShipAndYear(shipId, Number(year));
      const total = await bankRepo.getTotalBanked(shipId, Number(year));
      res.json({ records, totalBanked: total });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /banking/bank  { shipId, year }
  router.post('/bank', async (req: Request, res: Response) => {
    const { shipId, year } = req.body as { shipId: string; year: number };
    if (!shipId || !year) {
      res.status(400).json({ error: 'shipId and year are required' });
      return;
    }
    try {
      // Ensure CB is computed first
      const complianceUc = new ComputeCB(routeRepo, complianceRepo);
      await complianceUc.execute(shipId, year);
      const result = await new BankSurplus(complianceRepo, bankRepo).execute(shipId, year);
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // POST /banking/apply  { shipId, year, amount }
  router.post('/apply', async (req: Request, res: Response) => {
    const { shipId, year, amount } = req.body as { shipId: string; year: number; amount: number };
    if (!shipId || !year || amount == null) {
      res.status(400).json({ error: 'shipId, year, and amount are required' });
      return;
    }
    try {
      const result = await new ApplyBanked(complianceRepo, bankRepo).execute(shipId, year, amount);
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return router;
}

// ─── Pooling ──────────────────────────────────────────────────────────────────

export function createPoolsRouter(): Router {
  const router = Router();
  const routeRepo = new PgRouteRepository();
  const complianceRepo = new PgComplianceRepository();
  const bankRepo = new PgBankRepository();
  const poolRepo = new PgPoolRepository();

  // POST /pools  { year, shipIds: string[] }
  router.post('/', async (req: Request, res: Response) => {
    const { year, shipIds } = req.body as { year: number; shipIds: string[] };
    if (!year || !Array.isArray(shipIds) || shipIds.length < 2) {
      res.status(400).json({ error: 'year and at least 2 shipIds are required' });
      return;
    }
    try {
      const pool = await new CreatePool(routeRepo, complianceRepo, bankRepo, poolRepo).execute(
        year,
        shipIds
      );
      res.status(201).json(pool);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // GET /pools
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const pools = await new PgPoolRepository().findAll();
      res.json(pools);
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
