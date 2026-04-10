# AI Agent Workflow Log

## Agents Used

| Agent | Role |
|-------|------|
| **Claude (claude.ai)** | Primary: architecture design, domain modeling, use-case implementation, documentation |
| **GitHub Copilot** | Inline completions for boilerplate (repository CRUD methods, Express handler patterns, SQL queries) |
| **Cursor Agent** | Refactoring: extracting pure domain functions from use-cases, enforcing hexagonal layer boundaries |

---

## Prompts & Outputs

### Example 1 — Domain formula scaffolding

**Exact prompt:**
```
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

**Generated output:** Complete `compliance.ts` — all 6 functions correct on first pass.

**Correction needed:** `allocatePool` initially lacked the post-allocation guard loop
(deficit-exits-worse check). Added manually after noticing the edge case in unit tests.

---

### Example 2 — Hexagonal repository pattern

**Exact prompt:**
```
Generate a TypeScript interface RouteRepository with methods:
  findAll(): Promise<Route[]>
  findById(id: string): Promise<Route | null>
  findBaseline(): Promise<Route | null>
  setBaseline(id: string): Promise<Route>

Then generate PgRouteRepository implementing it using the `pg` library.
Map snake_case columns to camelCase. Use a helper toRoute(row) mapper.
The setBaseline method should first clear all baselines then set the new one.
```

**Generated output:** Both interface and implementation — correct structure, minor fix
needed: `findById` needed to accept both `id` (UUID) and `route_id` for convenience.

---

### Example 3 — Banking tab UI

**Exact prompt:**
```
React + TypeScript component BankingTab. No props. Uses two API adapters.
Ship selector (R001-R005) + year selector. "Fetch CB" button calls compApi.getCB().
Show 4 KPI cards: Compliance Balance, Total Banked, GHG Intensity, Target Intensity.
"Bank Surplus" button: disabled if CB <= 0, calls bankApi.bank(), refetches.
"Apply Banked" section: number input + Apply button, disabled if nothing banked.
Show bank ledger table below. All styling via CSS variables (--accent, --success, --danger).
```

**Generated output:** ~200 lines, functionally correct. Refined: added the green success
flash message for action results, and split the two action cards into a grid layout.

---

## Validation / Corrections

| Item | Agent Output | Correction Applied |
|------|-------------|-------------------|
| Target intensity 2024 | Initially `93.16` | Fixed to `91.16` per Annex IV |
| Pool guard: deficit exits worse | Missing | Added post-allocation validation loop manually |
| TypeScript strict: `any` params | Several `any`-typed callbacks | Typed all `.find()`, `.forEach()` callbacks explicitly |
| `ON CONFLICT` upsert syntax | Correct | Cross-checked against pg docs |
| Frontend proxy config | Missing `/api` prefix handling | Added `rewrite` rule in vite.config.ts |

---

## Observations

**Where agents saved time:**
- Hexagonal boilerplate (interface → implementation → handler wiring) cut from ~3h to ~40min
- SQL schema and seed data generated correctly on first pass
- Test case scaffolding for pure functions was near-instant once functions existed

**Where agents failed or hallucinated:**
- Regulatory constants need primary-source verification — agents guess plausibly but incorrectly
- Complex stateful logic (pool greedy allocator) required 3 prompt iterations
- Strict TypeScript: agents default to permissive types; always add a strict-mode review pass

**How tools were combined:**
- Claude → overall architecture and domain logic
- Copilot → filling in repetitive method bodies inline
- Cursor Agent → "move this function to domain layer" refactoring without breaking imports
- Manual review → regulatory formula verification, edge case testing

---

## Best Practices Followed

1. **Domain-first prompting** — wrote pure functions before any framework code
2. **One concern per prompt** — never asked agent to "build everything" in one shot
3. **Tests as specification** — wrote test cases before asking agent to implement functions
4. **Prompt log maintained** — kept a running log of exact prompts and outputs
5. **Layer boundary enforcement** — used Cursor to catch any `import express` leaking into core
6. **Primary source verification** — all regulatory constants checked against EU 2023/1805 PDF
