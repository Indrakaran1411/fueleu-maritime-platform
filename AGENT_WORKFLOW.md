# AI Agent Workflow Log

## Agents Used

- Codex: repository inspection, documentation cleanup, and validation of the required markdown deliverable.
- Claude (claude.ai / Claude Code style workflow): architecture design, domain modeling, and use-case implementation.
- GitHub Copilot: inline completions for repetitive TypeScript, SQL, and handler boilerplate.
- Cursor Agent: targeted refactors to preserve hexagonal boundaries while moving logic between layers.

## Prompts & Outputs

### Example 1: exact prompt and generated snippet

**Exact prompt**

```text
Write a pure TypeScript module with NO imports and NO side effects implementing
the FuelEU Maritime compliance formulas from EU 2023/1805 Annex IV:

1. getTargetIntensity(year): returns 91.16 for <=2024, 89.3368 for 2025+
2. computeEnergyInScope(fuelConsumptionTonnes): fuel × 41000 MJ/t
3. computeComplianceBalance(actual, fuel, year): returns { cb, energyInScope, targetIntensity }
   Formula: CB = (target - actual) * energyInScope
4. computePercentDiff(baseline, comparison): ((comparison/baseline) - 1) * 100
5. isCompliant(ghg, year): ghg <= target
6. allocatePool(members): greedy allocation — sort desc by CB, transfer surplus to deficits.
   Validate: sum >= 0, deficit never exits worse, surplus never exits negative.
   Input: {shipId, cbBefore}[]. Output: {shipId, cbBefore, cbAfter}[]
```

**Generated snippet**

```ts
export function computeEnergyInScope(fuelConsumptionTonnes: number): number {
  return fuelConsumptionTonnes * 41000;
}

export function computeComplianceBalance(actual: number, fuel: number, year: number) {
  const targetIntensity = getTargetIntensity(year);
  const energyInScope = computeEnergyInScope(fuel);
  const cb = (targetIntensity - actual) * energyInScope;
  return { cb, energyInScope, targetIntensity };
}
```

**Outcome**

The generated domain module was mostly correct on the first pass. The main manual correction was adding a post-allocation guard in pooling logic after unit tests exposed an edge case where a deficit member could exit worse than before.

### Example 2: refined or corrected output

**Initial prompt**

```text
Generate a TypeScript interface RouteRepository with methods:
  findAll(): Promise<Route[]>
  findById(id: string): Promise<Route | null>
  findBaseline(): Promise<Route | null>
  setBaseline(id: string): Promise<Route>

Then generate PgRouteRepository implementing it using the pg library.
Map snake_case columns to camelCase. Use a helper toRoute(row) mapper.
The setBaseline method should first clear all baselines then set the new one.
```

**Generated snippet**

```ts
async findById(id: string): Promise<Route | null> {
  const result = await this.pool.query(
    "SELECT * FROM routes WHERE id = $1 LIMIT 1",
    [id]
  );
  return result.rows[0] ? toRoute(result.rows[0]) : null;
}
```

**Refinement prompt**

```text
Correct findById so it can resolve either the UUID primary key or the business route_id.
Keep the rest of the repository unchanged.
```

**Corrected snippet**

```ts
async findById(id: string): Promise<Route | null> {
  const result = await this.pool.query(
    "SELECT * FROM routes WHERE id = $1 OR route_id = $1 LIMIT 1",
    [id]
  );
  return result.rows[0] ? toRoute(result.rows[0]) : null;
}
```

## Validation / Corrections

- Regulatory constants were checked against the FuelEU Maritime regulation source instead of trusting model output.
- Pool allocation behavior was verified with unit tests covering surplus-only, deficit-only, and mixed-member scenarios.
- Generated TypeScript was reviewed for strict-mode issues, especially implicit `any` and nullable query results.
- Repository SQL and API wiring were manually inspected to confirm snake_case to camelCase mapping and endpoint consistency.
- Documentation output was rewritten where necessary to match assignment wording exactly rather than leaving approximate sections.

## Observations

- Where agent saved time: repetitive port, adapter, handler, and test scaffolding was substantially faster than writing each file manually.
- Where it failed or hallucinated: domain constants and regulatory edge cases were the weakest area; plausible but incorrect values appeared without source grounding.
- How you combined tools effectively: Claude was useful for first-pass structure, Copilot for local boilerplate completion, Cursor for scoped refactors, and manual review for semantic correctness and compliance verification.

## Best Practices Followed

- Used domain-first prompts so the pure calculation logic was defined before framework code.
- Kept prompts narrow and single-purpose instead of asking one agent to generate the whole application in one pass.
- Used tests as a specification before accepting generated business logic.
- Refined agent output with follow-up prompts instead of patching around unclear behavior blindly.
- Preserved architectural boundaries by using Cursor-style refactors to move logic without leaking framework concerns into the core.
- Performed human validation on every regulation-derived value, SQL change, and final documentation artifact.
