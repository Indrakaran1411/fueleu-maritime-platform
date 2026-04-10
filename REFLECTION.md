# Reflection on AI-Assisted Development

## What I Learned

Working on a domain-heavy regulatory platform with AI agents exposed a clear division of
labour: **agents own structure and syntax; engineers must own semantics and correctness.**

The FuelEU CB formula, banking carryover rules, and pooling constraints (Articles 20–21)
required careful reading of EU 2023/1805. No agent knew these precisely without being
provided the exact spec text. When I omitted the source document, the agent produced
plausible but wrong constants (e.g. 93.16 instead of 91.16 for the 2024 GHG target).
Once I pasted the relevant Annex IV excerpt, output accuracy improved dramatically.

Hexagonal architecture turned out to be an excellent fit for AI-assisted development.
Because each layer has a single job and talks only through interfaces, I could prompt
each layer independently — "implement this interface", "write a use-case that calls
these ports" — and assemble the pieces with minimal integration friction.

## Efficiency Gains vs Manual Coding

| Task | Manual estimate | With agents | Saving |
|------|----------------|-------------|--------|
| Port/adapter boilerplate | 3 h | 40 min | ~78% |
| SQL schema + seed | 1 h | 15 min | ~75% |
| React tab components | 4 h | 1.5 h | ~63% |
| Unit test scaffolding | 1.5 h | 20 min | ~78% |
| Documentation | 2 h | 45 min | ~63% |
| **Total** | **~11.5 h** | **~3.5 h** | **~70%** |

The biggest gains were in repetitive structural code. The smallest gains (or sometimes
negative) were in complex domain logic and regulatory validation — areas where the
engineer's judgment cannot be delegated.

## What I'd Do Differently

**1. Spec-first prompting.** Provide the primary source document (the regulation PDF)
as context before asking for any domain code. Reconstructing the correction after the
fact costs more time than getting it right on the first prompt.

**2. TDD with agents.** Write the unit tests manually first as a living specification,
then ask the agent to implement functions that make the tests pass. This constraint
keeps the agent honest and the output verifiable.

**3. Use a `tasks.md` planning file.** Sequencing prompts as a numbered checklist
(Cursor's recommended pattern) produces more coherent multi-file outputs than
free-form iteration. Mid-session context drift — where the agent forgets earlier
decisions — is the main source of rework.

**4. Strict-mode from prompt zero.** Add `"strict": true` and `noImplicitAny` to the
tsconfig before generating any code. Retrofitting strict types onto permissive agent
output is tedious; generating into a strict environment forces better output upfront.

**5. Commit after every agent session, not at the end.** The assignment requirement
for incremental commit history is also good engineering practice — it creates natural
checkpoints that reveal which parts of the codebase were human-authored vs agent-assisted.
