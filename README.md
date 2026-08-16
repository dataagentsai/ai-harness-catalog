# AI Harness Catalog

**Harness capabilities for AI applications, by architecture archetype.**

Status: **working draft 0.2.0** — the normative catalog is complete.
92 capabilities across all 16 harness layers and all 10 archetypes, every one of
the assurance catalog's 108 obligations discharged. Identifiers are stable from
the first tagged release. Nothing here is externally binding.

---

## The gap this fills

Its sibling, the
[AI Assurance Catalog](https://github.com/basantchoudhary/ai-assurance-catalog),
publishes 108 test obligations for AI applications. Read enough of them and a
phrase starts recurring — *"enforced by the harness"*, *"the harness must"*,
*"outside the model's control"*.

That phrase is a dangling reference. The assurance catalog names the harness
constantly and never says what one is, because saying so was deliberately out of
its scope. This catalog is the referent.

| Layer | Who owns it | What it gives you | What it doesn't |
|---|---|---|---|
| Governance | ISO/IEC 42001, NIST AI RMF, EU AI Act | *That* a system must be controlled | What to build |
| Assurance | AI Assurance Catalog | What must be **true**, and how to get a verdict | What must **exist** |
| Frameworks | LangGraph, Agent SDKs, Temporal | An implementation, with its opinions | Which decisions you just delegated |
| Cloud reference architectures | The hyperscalers | A diagram for their stack | Anything portable off it |

There is no open, versioned, machine-readable catalog of **what a harness
contains, which shapes need which parts, and what you must decide when you build
one.** That is this.

## What a harness is

Everything that is neither the model nor your business logic — the deterministic
scaffolding that turns a model into a system. Sixteen layers:

| | | | |
|---|---|---|---|
| L1 Context assembly | L5 State & memory | L9 Determinism & replay | L13 Cost accounting |
| L2 Model invocation | L6 I/O contracts | L10 Failure handling | L14 Human-in-the-loop |
| L3 Tool layer | L7 Policy enforcement | **L11 Observability** | L15 Release & config |
| L4 Control loop | L8 Concurrency & flow | **L12 Eval harness** | L16 Identity & authz |

Observability and the eval harness are two of sixteen. That is the point of this
catalog: teams routinely build those two, and call the harness done.

## What a capability looks like

```yaml
id: AHC-0004
level: MUST
layers: [L2]              # model invocation
positions: [P3, P2]       # harness library, gateway backstop
core: true
title: One choke point for every model call
requirement: >-
  Every model invocation in the system passes through a single component.
  Provider SDKs are constructed in that one place and nowhere else, and the
  set of reachable models is enumerable from it.
failure_mode: >-
  Once a second call path exists, every subsequent capability in this catalog
  acquires a hole. Cost accounting undercounts, spans go missing, the policy
  point is bypassed, and the model allow-list is advisory.
discharges: [AAC-0011, AAC-0100, AAC-0098, AAC-0094]     # ← the join
design_decisions:
  - question: In-process choke point, gateway, or both?
    tension: >-
      In-process sees types, caller identity and business context, but governs
      only code that imports it. A gateway covers everything on the network
      path and knows none of that context.
    resolution: >-
      Both, with the split made explicit. Write it down; the failure mode is
      each side assuming the other did it.
```

Three fields carry the weight. **`failure_mode`** is what justifies the
capability existing — a vague one means it is a principle, not a component.
**`design_decisions`** is the substance; a decision with nothing genuinely
traded away is not a decision. **`discharges`** is the join to the assurance
catalog, and it runs both ways: an obligation no capability discharges is a hole
in this catalog.

## The boundary — and why there are two repositories

> **AAC states what must be *true*. AHC states what must *exist*.**

Read [docs/THE-AAC-BOUNDARY.md](docs/THE-AAC-BOUNDARY.md) before contributing.
The linter enforces the rule mechanically: a `requirement` containing
verification language (*tested*, *asserted*, *measured*, *scored*) is a build
error, because that sentence belongs in the assurance catalog. So is a
realization option carrying a `mechanism` field, which is the other catalog's
vocabulary.

The dependency is one-directional: AHC cites AAC identifiers, AAC does not know
this repository exists. That protects AAC's position — it competes with nobody,
and construction guidance competes with every framework's documentation.

## What it is not

- **A framework.** It describes what a component must do and what breaks without
  it. It never ships the component.
- **A test catalog.** That is the assurance catalog. Cite it; do not restate it.
- **A framework comparison.** `framework` is one approach of six in the
  realization layer, which names products, versions separately, and is expected
  to go stale.
- **A source of thresholds.** Budgets, limits and SLOs belong to the adopter.

**Tripwire:** if anything under `references/` is ever published as an importable
dependency rather than a skeleton to copy, the boundary has been crossed.

## Layout

```
capabilities/   AHC-####.yaml — the normative master, one per file
taxonomy/       layers, positions, approaches, levels; archetypes pinned from AAC
schema/         JSON Schema for a capability
blueprints/     per-archetype assembled views — the ten pages         (Phase 3)
realizations/   how each capability gets built; only place products appear (Phase 4)
references/     runnable skeletons, copied not imported               (Phase 5)
crosswalks/     -> assurance catalog, telemetry conventions
tools/          linter
docs/           the AAC boundary, identifier policy, scope
```

```bash
npm install
npm run lint     # schema + identifier + both boundary disciplines
```

The linter checks `discharges` against a real checkout of the assurance catalog
when one is reachable at `../ai-assurance-catalog` or `$AAC_CATALOG_PATH`, and
warns rather than fails when it is not — this repository must lint standalone.

## Status

| | Count |
|---|---|
| Capabilities | **92** |
| Core — owed by every shape | 37 |
| Archetype deltas | 55 |
| Harness layers covered | **16 of 16** |
| `discharges` references | 273 |
| Assurance obligations covered | **108 of 108** |

Landed close to the projected ~89, for the structural reason the assurance
catalog lands at 108: a core every shape owes, plus what is genuinely *new*
about each shape. Deltas per archetype run from 2 (single-turn transform) to 10
(tool-using agent) — that spread is the taxonomy earning its keep.

### Roadmap

- [x] **Phase 0** — taxonomy, schema, linter with both boundary rules
- [x] **Phase 1** — the full core layer, 37 capabilities
- [x] **Phase 2** — archetype deltas for all ten shapes, 55 capabilities
- [ ] **Phase 3** — blueprints: requirements, architecture and design per archetype
- [ ] **Phase 4** — realizations, authored in one dated pass, not incrementally
- [ ] **Phase 5** — three reference skeletons, one per control-flow tier
- [x] **Phase 6** — bidirectional coverage against the assurance catalog

Phase 4 is deliberately last. Products are the fastest-rotting layer; authoring
them alongside each capability means writing them two or three times before the
catalog stabilises.

## Licence

Split deliberately, following the assurance catalog and the OWASP model:

- **Specification** — `capabilities/`, `taxonomy/`, `schema/`, `blueprints/`,
  `crosswalks/`, `docs/` — [CC BY 4.0](LICENSE-SPEC.txt)
- **Code** — `tools/`, `references/` — [Apache 2.0](LICENSE)

Apache 2.0 specifically for the patent grant, which is what corporate legal
looks for before allowing adoption.
