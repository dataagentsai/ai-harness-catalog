# Scope

## What a capability is

A component or structural constraint that must **exist** in a system, stated so
that a reader can tell whether their system has it. Three tests:

1. **Can you point at it in a codebase?** If the answer is "it's more of a
   principle", it is not a capability.
2. **Does something concrete break without it?** `failure_mode` must describe a
   specific failure, not a general risk. "Costs may be higher" is not a failure
   mode; "retries are counted as separate healthy traffic" is.
3. **Is there something to decide?** A capability with no genuine trade-off is
   either trivial or under-specified. The linter warns on a `MUST` with no
   `design_decisions`.

## What this catalog will never author

| Not this | Because it belongs to |
|---|---|
| Test obligations | The AI Assurance Catalog |
| Controls | ISO/IEC 42001, NIST AI RMF |
| Threat descriptions | OWASP LLM Top 10, MITRE ATLAS |
| Telemetry schemas | OpenTelemetry GenAI semantic conventions |
| Metric formulas | Ragas, DeepEval, and the eval ecosystem |
| Thresholds, budgets, SLOs | The adopting organisation |
| An implementation | Every framework, and the adopter |

## The threshold boundary

Sharpest line in the catalog, inherited from the assurance side.

- *"A token budget is enforced by the assembly function and its application is
  recorded"* — a capability.
- *"The token budget is 100,000"* — never. The number belongs to the adopter and
  any value published here would be wrong for almost everyone.

## Core versus delta

**Core** means every AI application needs it regardless of shape. A core
capability enumerates all ten archetypes explicitly rather than relying on an
inheritance keyword, so a consumer never has to resolve the taxonomy to know
whether it applies.

**Delta** means the capability is genuinely *new* for that shape — not merely
more important there. The test: would a competent team building the simplest
shape have already built this? If yes, it is core, and marking it a delta hides
it from nine archetypes that also need it.

This distinction is what keeps the catalog near 89 rather than several hundred.

## Out of scope entirely

- **Model selection and benchmarking** — a provider concern with its own
  literature.
- **Training, fine-tuning, dataset curation** — this catalog begins where a
  trained model is called.
- **Retrieval quality technique** — how to chunk, embed and rank is a large,
  well-served field. The capability is that retrieval sits behind a seam that
  can be substituted and recorded, not how to do it well.
- **Prompt engineering technique** — likewise. The capability is that assembly
  is one inspectable function, not what to put in it.
- **Business logic.** The harness is what surrounds it.

## The positioning test

If the project cannot be described in one sentence without the word *framework*,
scope has drifted.

> A catalog of harness capabilities for AI applications, organised by
> architecture archetype, mapped to the assurance obligations they make
> verifiable.
