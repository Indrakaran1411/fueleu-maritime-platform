import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createRoutesRouter } from '../../adapters/inbound/http/routesHandler';
import {
  createComplianceRouter,
  createBankingRouter,
  createPoolsRouter,
} from '../../adapters/inbound/http/otherHandlers';

dotenv.config();

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => res.json({ message: 'FuelEU backend API is running. Use /routes, /compliance, /banking, or /pools.' }));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Mount routers — order matters: /routes/comparison before /routes/:id
  const routesRouter = createRoutesRouter();
  // Re-order: register /comparison first to avoid :id capturing "comparison"
  app.use('/routes', (req, res, next) => {
    // delegate to router
    routesRouter(req, res, next);
  });

  app.use('/compliance', createComplianceRouter());
  app.use('/banking', createBankingRouter());
  app.use('/pools', createPoolsRouter());

  return app;
}

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`FuelEU backend running on port ${PORT}`);
  });
}
