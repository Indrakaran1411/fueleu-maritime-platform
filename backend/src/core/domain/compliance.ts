// Pure domain logic — no side effects, no framework dependencies

export const TARGET_INTENSITY_2025 = 89.3368;  // gCO2e/MJ (2% below 91.16)
export const TARGET_INTENSITY_2024 = 91.16;    // baseline year gCO2e/MJ
export const MJ_PER_TONNE_FUEL = 41_000;       // MJ/tonne (LHV approximation)

/**
 * Returns the regulatory target GHG intensity for a given year.
 * FuelEU applies progressive reduction steps per Annex IV.
 */
export function getTargetIntensity(year: number): number {
  if (year <= 2024) return TARGET_INTENSITY_2024;
  if (year <= 2029) return TARGET_INTENSITY_2025;  // 2% reduction
  // Future tiers can be added here
  return TARGET_INTENSITY_2025;
}

/**
 * Calculates energy in scope (MJ) from fuel consumption (tonnes).
 * Energy = fuelConsumption × 41,000 MJ/t
 */
export function computeEnergyInScope(fuelConsumptionTonnes: number): number {
  return fuelConsumptionTonnes * MJ_PER_TONNE_FUEL;
}

/**
 * Compliance Balance = (Target − Actual) × Energy in scope
 * Positive → Surplus, Negative → Deficit
 */
export function computeComplianceBalance(
  actualGhgIntensity: number,
  fuelConsumptionTonnes: number,
  year: number
): { cb: number; energyInScope: number; targetIntensity: number } {
  const targetIntensity = getTargetIntensity(year);
  const energyInScope = computeEnergyInScope(fuelConsumptionTonnes);
  const cb = (targetIntensity - actualGhgIntensity) * energyInScope;
  return { cb, energyInScope, targetIntensity };
}

/**
 * Computes % difference between comparison and baseline GHG intensity.
 * percentDiff = ((comparison / baseline) - 1) × 100
 */
export function computePercentDiff(baseline: number, comparison: number): number {
  if (baseline === 0) throw new Error('Baseline GHG intensity cannot be zero');
  return ((comparison / baseline) - 1) * 100;
}

/**
 * A route is compliant if its GHG intensity ≤ target for that year.
 */
export function isCompliant(ghgIntensity: number, year: number): boolean {
  return ghgIntensity <= getTargetIntensity(year);
}

/**
 * Greedy pool allocation: sort members desc by CB, transfer surplus to deficits.
 * Rules:
 *   - Sum(adjustedCB) must be >= 0
 *   - Deficit ship cannot exit worse than it entered
 *   - Surplus ship cannot exit negative
 */
export interface PoolMemberInput {
  shipId: string;
  cbBefore: number;
}

export interface PoolAllocationResult {
  shipId: string;
  cbBefore: number;
  cbAfter: number;
}

export function allocatePool(members: PoolMemberInput[]): PoolAllocationResult[] {
  const totalCb = members.reduce((sum, m) => sum + m.cbBefore, 0);
  if (totalCb < 0) {
    throw new Error(`Pool is invalid: total CB is ${totalCb.toFixed(2)} (must be ≥ 0)`);
  }

  // Work with mutable copies
  const working = members.map(m => ({ ...m, cbAfter: m.cbBefore }));

  // Sort desc: surplus ships first
  working.sort((a, b) => b.cbBefore - a.cbBefore);

  // Transfer surplus to deficits greedily
  for (let i = 0; i < working.length; i++) {
    for (let j = working.length - 1; j > i; j--) {
      if (working[i].cbAfter > 0 && working[j].cbAfter < 0) {
        const transfer = Math.min(working[i].cbAfter, -working[j].cbAfter);
        working[i].cbAfter -= transfer;
        working[j].cbAfter += transfer;
      }
    }
  }

  // Validate post-allocation rules
  for (const m of working) {
    const original = members.find(x => x.shipId === m.shipId)!;
    if (original.cbBefore < 0 && m.cbAfter < original.cbBefore) {
      throw new Error(`Deficit ship ${m.shipId} would exit worse than it entered`);
    }
    if (original.cbBefore > 0 && m.cbAfter < 0) {
      throw new Error(`Surplus ship ${m.shipId} would exit negative`);
    }
  }

  return working.map(({ shipId, cbBefore, cbAfter }) => ({ shipId, cbBefore, cbAfter }));
}
