import {
  computeComplianceBalance,
  computePercentDiff,
  isCompliant,
  allocatePool,
  TARGET_INTENSITY_2025,
  MJ_PER_TONNE_FUEL,
} from '../src/core/domain/compliance';

describe('computeComplianceBalance', () => {
  it('returns surplus when GHG < target', () => {
    const { cb } = computeComplianceBalance(88.0, 4800, 2025);
    expect(cb).toBeGreaterThan(0);
  });

  it('returns deficit when GHG > target', () => {
    const { cb } = computeComplianceBalance(93.5, 5100, 2025);
    expect(cb).toBeLessThan(0);
  });

  it('calculates energy in scope correctly', () => {
    const { energyInScope } = computeComplianceBalance(88.0, 4800, 2025);
    expect(energyInScope).toBe(4800 * MJ_PER_TONNE_FUEL);
  });

  it('uses correct target intensity for 2025', () => {
    const { targetIntensity } = computeComplianceBalance(88.0, 4800, 2025);
    expect(targetIntensity).toBe(TARGET_INTENSITY_2025);
  });

  it('calculates CB formula: (target - actual) * energyInScope', () => {
    const fuelConsumption = 4800;
    const actual = 88.0;
    const year = 2025;
    const { cb, energyInScope, targetIntensity } = computeComplianceBalance(actual, fuelConsumption, year);
    expect(cb).toBeCloseTo((targetIntensity - actual) * energyInScope);
  });
});

describe('computePercentDiff', () => {
  it('calculates positive diff when comparison > baseline', () => {
    const diff = computePercentDiff(88.0, 91.0);
    expect(diff).toBeCloseTo(((91.0 / 88.0) - 1) * 100);
  });

  it('calculates negative diff when comparison < baseline', () => {
    const diff = computePercentDiff(91.0, 88.0);
    expect(diff).toBeLessThan(0);
  });

  it('throws on zero baseline', () => {
    expect(() => computePercentDiff(0, 88)).toThrow();
  });
});

describe('isCompliant', () => {
  it('marks GHG below target as compliant', () => {
    expect(isCompliant(88.0, 2025)).toBe(true);
  });

  it('marks GHG above target as non-compliant', () => {
    expect(isCompliant(93.5, 2025)).toBe(false);
  });

  it('treats exact target as compliant', () => {
    expect(isCompliant(TARGET_INTENSITY_2025, 2025)).toBe(true);
  });
});

describe('allocatePool', () => {
  it('validates total CB must be >= 0', () => {
    const members = [
      { shipId: 'A', cbBefore: -100 },
      { shipId: 'B', cbBefore: -50 },
    ];
    expect(() => allocatePool(members)).toThrow('must be ≥ 0');
  });

  it('transfers surplus to deficit ships', () => {
    const members = [
      { shipId: 'surplus', cbBefore: 200 },
      { shipId: 'deficit', cbBefore: -100 },
    ];
    const result = allocatePool(members);
    const deficit = result.find(r => r.shipId === 'deficit')!;
    const surplus = result.find(r => r.shipId === 'surplus')!;
    expect(deficit.cbAfter).toBeGreaterThan(deficit.cbBefore);
    expect(surplus.cbAfter).toBeGreaterThanOrEqual(0);
  });

  it('deficit ship exits at 0 or better (never worse)', () => {
    const members = [
      { shipId: 'S', cbBefore: 500 },
      { shipId: 'D', cbBefore: -200 },
    ];
    const result = allocatePool(members);
    const d = result.find(r => r.shipId === 'D')!;
    expect(d.cbAfter).toBeGreaterThanOrEqual(d.cbBefore);
  });

  it('surplus ship never exits negative', () => {
    const members = [
      { shipId: 'S', cbBefore: 100 },
      { shipId: 'D', cbBefore: -50 },
    ];
    const result = allocatePool(members);
    const s = result.find(r => r.shipId === 'S')!;
    expect(s.cbAfter).toBeGreaterThanOrEqual(0);
  });

  it('perfect balance: all exit at 0', () => {
    const members = [
      { shipId: 'S', cbBefore: 100 },
      { shipId: 'D', cbBefore: -100 },
    ];
    const result = allocatePool(members);
    result.forEach(m => expect(m.cbAfter).toBe(0));
  });
});
