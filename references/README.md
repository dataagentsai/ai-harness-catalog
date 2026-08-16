# Reference skeletons — Phase 5

Three, not ten. One per control-flow tier:

| Tier | Archetypes | Shows |
|---|---|---|
| Stateless | A1, A2 | The core harness with nothing else — the floor |
| Pipeline | A3, A5 | Seams between steps, retrieval substitution, partial failure |
| Agentic | A6, A9 | Loop, budgets, tool boundary, checkpointing, termination |

**Copied, never imported.** These are skeletons a team reads and adapts, not a
library they depend on. Publishing any of this as an installable package
crosses the tripwire in `docs/THE-AAC-BOUNDARY.md` — every capability in the
catalog would become an advertisement for it, and the catalog would stop being
usable by a team with a different stack.

Ten reference implementations is a maintenance burden that kills repositories.
Three is affordable, and the third is intended to be `spark-cost-agent`, which
is already a no-framework build — a hand-rolled harness is exactly the specimen
this catalog describes — and already emits assurance conformance reports.
