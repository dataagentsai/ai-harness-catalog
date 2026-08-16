# Contributing

Read [docs/THE-AAC-BOUNDARY.md](docs/THE-AAC-BOUNDARY.md) first. It is short and
it is the thing most likely to make a proposed capability out of scope.

## The bar for a new capability

1. It describes something that must **exist**, not something that must be
   **true**. The second belongs in the assurance catalog.
2. `failure_mode` names a specific, concrete failure. Not a risk — a failure.
3. At least one `design_decisions` entry with a genuine trade-off. If nothing is
   given up by either answer, it is not a decision.
4. At least one `discharges` reference, or a stated reason there is none.
5. No products in normative text. No thresholds. Ever.

Capabilities that restate a test obligation, name a framework, or set a number
are out of scope by construction, and the linter will say so.

## Core or delta

Would a competent team building the simplest shape (A1) have already built this?
If yes it is **core**, and it must enumerate all ten archetypes. Marking a core
capability as a delta hides it from nine shapes that also need it.

## Before opening a PR

```bash
npm run lint
```

The linter must pass with no errors. Warnings are worth reading — "MUST with no
design_decisions" usually means the capability is a principle in disguise.
