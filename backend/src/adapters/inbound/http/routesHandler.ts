import { Router, Request, Response } from 'express';
import { GetAllRoutes, SetBaseline, GetComparison } from '../../../core/application/usecases';
import { PgRouteRepository } from '../../outbound/postgres/routeRepository';

export function createRoutesRouter(): Router {
  const router = Router();
  const repo = new PgRouteRepository();

  // GET /routes
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const routes = await new GetAllRoutes(repo).execute();
      res.json(routes);
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /routes/:id/baseline
  router.post('/:id/baseline', async (req: Request, res: Response) => {
    try {
      const route = await new SetBaseline(repo).execute(req.params.id);
      res.json(route);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      res.status(msg.includes('not found') ? 404 : 500).json({ error: msg });
    }
  });

  // GET /routes/comparison
  router.get('/comparison', async (_req: Request, res: Response) => {
    try {
      const comparisons = await new GetComparison(repo).execute();
      res.json(comparisons);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      res.status(msg.includes('No baseline') ? 400 : 500).json({ error: msg });
    }
  });

  return router;
}
