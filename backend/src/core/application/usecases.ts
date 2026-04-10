// Application use-cases — orchestrate domain logic and ports

import { Route, RouteComparison, ComplianceBalance, BankEntry, Pool } from '../domain/entities';
import {
  computeComplianceBalance,
  computePercentDiff,
  getTargetIntensity,
  isCompliant,
  allocatePool,
  MJ_PER_TONNE_FUEL,
  PoolMemberInput,
} from '../domain/compliance';
import {
  RouteRepository,
  ComplianceRepository,
  BankRepository,
  PoolRepository,
} from '../ports/repositories';

// ─── Routes ──────────────────────────────────────────────────────────────────

export class GetAllRoutes {
  constructor(private repo: RouteRepository) {}
  async execute(): Promise<Route[]> {
    return this.repo.findAll();
  }
}

export class SetBaseline {
  constructor(private repo: RouteRepository) {}
  async execute(routeId: string): Promise<Route> {
    const route = await this.repo.findById(routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);
    return this.repo.setBaseline(routeId);
  }
}

export class GetComparison {
  constructor(private repo: RouteRepository) {}
  async execute(): Promise<RouteComparison[]> {
    const baseline = await this.repo.findBaseline();
    if (!baseline) throw new Error('No baseline route set');
    const all = await this.repo.findAll();
    const sameYear = all.filter(r => r.year === baseline.year && !r.isBaseline);
    return sameYear.map(r => ({
      baseline,
      comparison: r,
      percentDiff: computePercentDiff(baseline.ghgIntensity, r.ghgIntensity),
      compliant: isCompliant(r.ghgIntensity, r.year),
    }));
  }
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export class ComputeCB {
  constructor(
    private routeRepo: RouteRepository,
    private complianceRepo: ComplianceRepository
  ) {}

  async execute(shipId: string, year: number): Promise<{
    cb: number;
    energyInScope: number;
    targetIntensity: number;
    actualIntensity: number;
  }> {
    // Use ship's route data matching year (shipId maps to routeId for demo)
    const routes = await this.routeRepo.findAll();
    const route = routes.find(r => r.routeId === shipId && r.year === year);
    if (!route) throw new Error(`No route data found for ship ${shipId} year ${year}`);

    const { cb, energyInScope, targetIntensity } = computeComplianceBalance(
      route.ghgIntensity,
      route.fuelConsumption,
      year
    );

    await this.complianceRepo.upsert({ shipId, year, cbGco2eq: cb });

    return { cb, energyInScope, targetIntensity, actualIntensity: route.ghgIntensity };
  }
}

export class GetAdjustedCB {
  constructor(
    private routeRepo: RouteRepository,
    private complianceRepo: ComplianceRepository,
    private bankRepo: BankRepository
  ) {}

  async execute(shipId: string, year: number): Promise<{
    shipId: string;
    year: number;
    cbRaw: number;
    bankedSurplus: number;
    adjustedCb: number;
  }> {
    let compliance = await this.complianceRepo.findByShipAndYear(shipId, year);
    if (!compliance) {
      // compute it on the fly
      const routes = await this.routeRepo.findAll();
      const route = routes.find(r => r.routeId === shipId && r.year === year);
      if (!route) throw new Error(`No data for ship ${shipId} year ${year}`);
      const { cb } = computeComplianceBalance(route.ghgIntensity, route.fuelConsumption, year);
      compliance = await this.complianceRepo.upsert({ shipId, year, cbGco2eq: cb });
    }

    const bankedSurplus = await this.bankRepo.getTotalBanked(shipId, year);
    const adjustedCb = compliance.cbGco2eq + bankedSurplus;

    return { shipId, year, cbRaw: compliance.cbGco2eq, bankedSurplus, adjustedCb };
  }
}

export class GetCBs {
  constructor(
    private routeRepo: RouteRepository,
    private complianceRepo: ComplianceRepository
  ) {}

  async execute(year: number): Promise<Array<{
    shipId: string;
    year: number;
    cb: number;
    energyInScope: number;
    targetIntensity: number;
    actualIntensity: number;
  }>> {
    const routes = await this.routeRepo.findAll();
    const yearRoutes = routes.filter(route => route.year === year);

    return Promise.all(yearRoutes.map(async route => {
      let compliance = await this.complianceRepo.findByShipAndYear(route.routeId, year);
      if (!compliance) {
        const { cb, energyInScope, targetIntensity } = computeComplianceBalance(
          route.ghgIntensity,
          route.fuelConsumption,
          year
        );
        compliance = await this.complianceRepo.upsert({
          shipId: route.routeId,
          year,
          cbGco2eq: cb,
        });
        return {
          shipId: route.routeId,
          year,
          cb,
          energyInScope,
          targetIntensity,
          actualIntensity: route.ghgIntensity,
        };
      }

      const energyInScope = route.fuelConsumption * MJ_PER_TONNE_FUEL;
      const targetIntensity = getTargetIntensity(year);
      return {
        shipId: route.routeId,
        year,
        cb: compliance.cbGco2eq,
        energyInScope,
        targetIntensity,
        actualIntensity: route.ghgIntensity,
      };
    }));
  }
}

export class GetAdjustedCBs {
  constructor(
    private routeRepo: RouteRepository,
    private complianceRepo: ComplianceRepository,
    private bankRepo: BankRepository
  ) {}

  async execute(year: number): Promise<Array<{
    shipId: string;
    year: number;
    cbRaw: number;
    bankedSurplus: number;
    adjustedCb: number;
  }>> {
    const routes = await this.routeRepo.findAll();
    const yearRoutes = routes.filter(route => route.year === year);

    return Promise.all(yearRoutes.map(async route => {
      let compliance = await this.complianceRepo.findByShipAndYear(route.routeId, year);
      if (!compliance) {
        const { cb } = computeComplianceBalance(route.ghgIntensity, route.fuelConsumption, year);
        compliance = await this.complianceRepo.upsert({
          shipId: route.routeId,
          year,
          cbGco2eq: cb,
        });
      }

      const bankedSurplus = await this.bankRepo.getTotalBanked(route.routeId, year);
      return {
        shipId: route.routeId,
        year,
        cbRaw: compliance.cbGco2eq,
        bankedSurplus,
        adjustedCb: compliance.cbGco2eq + bankedSurplus,
      };
    }));
  }
}

// ─── Banking ──────────────────────────────────────────────────────────────────

export class BankSurplus {
  constructor(
    private complianceRepo: ComplianceRepository,
    private bankRepo: BankRepository
  ) {}

  async execute(shipId: string, year: number): Promise<{ banked: number; entry: BankEntry }> {
    const compliance = await this.complianceRepo.findByShipAndYear(shipId, year);
    if (!compliance) throw new Error(`No compliance record for ship ${shipId} year ${year}`);
    if (compliance.cbGco2eq <= 0) {
      throw new Error(`Ship ${shipId} has no surplus to bank (CB = ${compliance.cbGco2eq.toFixed(2)})`);
    }

    const entry = await this.bankRepo.create({
      shipId,
      year,
      amountGco2eq: compliance.cbGco2eq,
    });

    // Zero out the compliance record after banking
    await this.complianceRepo.upsert({ shipId, year, cbGco2eq: 0 });

    return { banked: entry.amountGco2eq, entry };
  }
}

export class ApplyBanked {
  constructor(
    private complianceRepo: ComplianceRepository,
    private bankRepo: BankRepository
  ) {}

  async execute(shipId: string, year: number, amount: number): Promise<{
    cbBefore: number;
    applied: number;
    cbAfter: number;
  }> {
    const compliance = await this.complianceRepo.findByShipAndYear(shipId, year);
    if (!compliance) throw new Error(`No compliance record for ship ${shipId} year ${year}`);

    const available = await this.bankRepo.getTotalBanked(shipId, year);
    if (amount > available) {
      throw new Error(`Cannot apply ${amount}: only ${available.toFixed(2)} banked`);
    }
    if (amount <= 0) throw new Error('Amount must be positive');

    await this.bankRepo.deductBanked(shipId, year, amount);
    const cbBefore = compliance.cbGco2eq;
    const cbAfter = cbBefore + amount;
    await this.complianceRepo.upsert({ shipId, year, cbGco2eq: cbAfter });

    return { cbBefore, applied: amount, cbAfter };
  }
}

// ─── Pooling ──────────────────────────────────────────────────────────────────

export class CreatePool {
  constructor(
    private routeRepo: RouteRepository,
    private complianceRepo: ComplianceRepository,
    private bankRepo: BankRepository,
    private poolRepo: PoolRepository
  ) {}

  async execute(year: number, shipIds: string[]): Promise<Pool> {
    // Gather adjusted CBs for all ships
    const memberInputs: PoolMemberInput[] = [];
    for (const shipId of shipIds) {
      let compliance = await this.complianceRepo.findByShipAndYear(shipId, year);
      if (!compliance) {
        const routes = await this.routeRepo.findAll();
        const route = routes.find(r => r.routeId === shipId && r.year === year);
        if (!route) throw new Error(`No data for ship ${shipId} year ${year}`);
        const { cb } = computeComplianceBalance(route.ghgIntensity, route.fuelConsumption, year);
        compliance = await this.complianceRepo.upsert({ shipId, year, cbGco2eq: cb });
      }
      const banked = await this.bankRepo.getTotalBanked(shipId, year);
      memberInputs.push({ shipId, cbBefore: compliance.cbGco2eq + banked });
    }

    // Domain validation + greedy allocation
    const allocations = allocatePool(memberInputs);

    return this.poolRepo.create(year, allocations);
  }
}
