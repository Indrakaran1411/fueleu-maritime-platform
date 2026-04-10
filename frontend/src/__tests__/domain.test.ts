import { describe, it, expect } from 'vitest';

// Pure domain logic mirrored on the frontend
const TARGET_2025 = 89.3368;
const MJ_PER_TONNE = 41_000;

function computeCB(actual: number, fuel: number, year: number) {
  const target = year >= 2025 ? TARGET_2025 : 91.16;
  const energy = fuel * MJ_PER_TONNE;
  return { cb: (target - actual) * energy, energy, target };
}

function percentDiff(baseline: number, comparison: number) {
  return ((comparison / baseline) - 1) * 100;
}

function allocatePool(members: { shipId: string; cbBefore: number }[]) {
  const total = members.reduce((s, m) => s + m.cbBefore, 0);
  if (total < 0) throw new Error('Pool sum must be >= 0');
  const w = members.map(m => ({ ...m, cbAfter: m.cbBefore }));
  w.sort((a, b) => b.cbBefore - a.cbBefore);
  for (let i = 0; i < w.length; i++) {
    for (let j = w.length - 1; j > i; j--) {
      if (w[i].cbAfter > 0 && w[j].cbAfter < 0) {
        const t = Math.min(w[i].cbAfter, -w[j].cbAfter);
        w[i].cbAfter -= t;
        w[j].cbAfter += t;
      }
    }
  }
  return w;
}

describe('Frontend domain — computeCB', () => {
  it('positive CB for GHG below target', () => {
    expect(computeCB(88, 4800, 2025).cb).toBeGreaterThan(0);
  });
  it('negative CB for GHG above target', () => {
    expect(computeCB(93, 5000, 2025).cb).toBeLessThan(0);
  });
  it('energy in scope = fuel × 41000', () => {
    expect(computeCB(88, 4800, 2025).energy).toBe(4800 * MJ_PER_TONNE);
  });
});

describe('Frontend domain — percentDiff', () => {
  it('returns positive when comparison > baseline', () => {
    expect(percentDiff(88, 93)).toBeGreaterThan(0);
  });
  it('returns negative when comparison < baseline', () => {
    expect(percentDiff(93, 88)).toBeLessThan(0);
  });
});

describe('Frontend domain — allocatePool', () => {
  it('throws when total CB < 0', () => {
    expect(() => allocatePool([{ shipId: 'A', cbBefore: -100 }, { shipId: 'B', cbBefore: -50 }])).toThrow();
  });

  it('surplus ship covers deficit', () => {
    const result = allocatePool([{ shipId: 'S', cbBefore: 200 }, { shipId: 'D', cbBefore: -100 }]);
    const d = result.find(r => r.shipId === 'D')!;
    expect(d.cbAfter).toBeGreaterThanOrEqual(0);
  });

  it('perfect balance yields both at 0', () => {
    const result = allocatePool([{ shipId: 'S', cbBefore: 100 }, { shipId: 'D', cbBefore: -100 }]);
    result.forEach(r => expect(r.cbAfter).toBe(0));
  });
});
