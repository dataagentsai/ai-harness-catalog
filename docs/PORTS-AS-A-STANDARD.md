# Ports as a standard — the experiment, and its criteria

**Written 2026-10-01, before the first build on a second loop owner.** The point
of writing the criteria now is that they cannot be written afterwards: once an
adapter exists, every threshold gets read in its light. What is below is fixed
until both builds have reported, and a change to it is recorded here with its
date and reason rather than made quietly.

## The question

Should the ports in this catalog become an interface standard — the way
OpenTelemetry, OpenFeature and the Model Context Protocol are — so that systems
whose loop is owned by different frameworks plug into the same port definitions,
rather than each naming its adapters in a stack file?

Today a port names its operations by intent and stops there: no signatures, no
types, no language ([PORTS.md](PORTS.md), *What a port is not*). That is half an
interface. With one implementation it was enough, and it also let the one
implementation drift: the reference agent's twelve typed interfaces do not match
the ports they realise — the `state` port says `put/get/claim/expire/reserve`
and the code has a checkpoint store and an idempotency ledger; the `approval`
port says `request/await/stop_signal` and the code has an approval store.

## Why not a typed signature for every port

Whoever owns the loop decides who calls a port. Where the harness owns its loop,
its own code calls the port and a typed interface works. Where a framework owns
the loop, the framework calls the port through its own extension point — a
checkpoint saver, an interrupt, a permission callback, a pre-tool hook — and no
single signature in one language sits inside all of them. A library every
framework had to call would be a framework, which this catalog exists not to be.

The standards that succeeded each standardised **one concern**, with a wire
protocol or a specification plus shared conformance tests, never a class in one
language. That is the shape tried here, in three tiers, cheapest first.

## The three tiers

| Tier | What | Where it stands |
|---|---|---|
| **1 · Cite** | Where a published specification already defines a port's wire, the port cites it (`standards:`) and keeps only its own invariants on top | **Done 2026-10-01** in six ports — below |
| **2 · Conform** | Each port's invariants become conformance cases any implementation must pass; two adapters are the same port because both pass *a pending approval outlives a restart*, not because both implement one class | **Prepared:** the three candidate ports' invariants carry permanent keys. The cases are written outside this repository |
| **3 · Type** | A typed interface plus a JSON Schema for what crosses the port, only where no standard exists and the concern is the system's own | **The experiment:** three ports, judged by the criteria below |

Tier 2 is what would make the ports a standard. Tier 3 is the open question.

### Tier 1, as written

| Port | Cites | Covers | Left to the port |
|---|---|---|---|
| `telemetry` | OpenTelemetry semantic conventions for generative AI; W3C Trace Context | all five operations | redaction before export, export never failing the unit, unsampled policy and cost events |
| `tool_runtime` | Model Context Protocol | `describe`, `execute`, `cancel` | validation before execution, authority where the tool runs, bounded results |
| `config` | OpenFeature | `resolve` | serving content by version; one immutable snapshot per unit of work |
| `identity` | OpenID Connect Core; OAuth 2.0 Token Exchange (RFC 8693) | `principal`, `exchange` | `authorize` — no standard is cited |
| `model` | OpenAI-compatible chat completions — **marked `de-facto`**, because it is one vendor's interface and no open standard for a model call exists | all three | no retries inside, exact sampling parameters, throttling distinct from failure, usage never zero by default |
| `trigger` | CloudEvents | `subscribe` | acknowledgement, heartbeat |

A citation is informative. It never removes an invariant and never adds one: an
implementation that conforms to the cited specification supplies the operations
it covers, and the port's invariants hold on top whoever supplies them. The
linter checks that every citation names operations the port actually has, and
it is the one place in a port where a proper name may appear.

## Where the conformance cases live

**Not here.** A conformance case runs something and returns a verdict, which is
the tripwire in [THE-AAC-BOUNDARY.md](THE-AAC-BOUNDARY.md): the day this
repository evaluates anything, it has become the thing it describes. The cases
belong with the machinery that runs agents against a world, or in an adopter's
own suite; what this catalog owes them is a name to cite.

So every invariant of the three candidate ports now carries a permanent `key`,
and a case names what it checks as `port/key` — `approval/no_self_grant`,
`cost_ledger/retry_is_same_unit` — exactly as a profile names a decision as
`AHC-####/key`. Two rules follow, and both are about keeping the suite honest:

- **A case that needs a sentence no invariant states has found a missing
  invariant**, and the port gains it before the case is written. Writing the
  approval cases from the port as it stood found three at once — an undecided
  request expires, a decision records what it judged and is final, and whether a
  pending request outlives its process is declared — each already required by
  AHC-0057 or AHC-0102 and never stated at the seam. They are in
  `ports/approval.yaml` now.
- **`checkable` decides the kind of case.** A `dynamic` invariant gets a case
  that runs; a `static` one gets an inspection rule (an import contract, a type,
  a required argument); a `declared` one is asserted and owned, and no case can
  claim it.

## The experiment

**Three ports:** `approval`, `cost_ledger`, `policy` — chosen because no
published standard covers any of them and each concern is the system's own.

**Before the first build on a second loop owner**, outside this repository:

1. The reference implementation's interfaces for the three ports are aligned to
   the port operations — one method per operation, named as the port names it —
   with a JSON Schema for each thing that crosses: an approval request and its
   decision, a usage observation and a running total, a policy decision.
2. A conformance case is written for every `dynamic` invariant of the three
   ports, citing `port/key`, and passes against the existing implementation.
3. The baseline is pinned: the commit of this repository's three port files,
   the commit of the aligned interfaces and schemas, and a digest of the
   conformance cases. Everything below is measured against those three.

**During the two builds** — the same agent with its loop owned by a graph
framework, then by an agent SDK — an adapter is written for each port on each
stack, and four things are recorded per port per stack:

| Measure | How it is counted | The bar |
|---|---|---|
| **Conformance, unchanged** | The pinned cases run against the adapter. *Unchanged* means byte-identical case files: a case edited to pass is a failure of this measure whatever the edit | every case passes |
| **Adapter size** | Logical lines — not blank, not comment-only — of code that exists only to connect this stack to this port. The shared interface, the schemas and the tests do not count | at most **150** |
| **Signature changes** | Every change to the aligned interface or a schema made during the build, each with its reason. A change that corrects a fault the original stack also had is recorded, re-run on the original stack, and does not count against the port; a change made so a framework could call the port counts | **zero** that count |
| **Fighting the loop owner** | Any one of: calling a framework's private or internal interface; replacing or wrapping the framework's loop so the port can be called where it needs to be; patching framework code at run time; holding a second copy of state the framework also holds — two sources of truth for one pending approval | **none** |

**How the result is read**, fixed now:

- **Per port.** A port that meets all four bars on both stacks keeps its typed
  interface: tier 3 is worth it *for that port*.
- A port that misses any bar on either stack **stops at tier 2** — its
  conformance cases are the standard, and the typed interface stays a
  convenience of one implementation. That is a result, not a failure, and is
  recorded as one.
- **Extending tier 3** to the other ports whose concern is the system's own —
  `admission`, `recorder`, the claim and expiry half of `state`, `eval_task` —
  happens only if at least two of the three met every bar. One of three says
  typed interfaces are the exception, and the rest stop at tier 2.
- A measure that cannot be taken — a build abandoned, a port the stack never
  reaches — is recorded as *not measured* with the reason, and the port is read
  as not having met the bar. Absence of evidence does not extend a standard.

### The record, to be filled by the two builds

| Port | Stack | Cases passed | Adapter lines | Signature changes (counted / not) | Fights the loop owner | Met all four |
|---|---|---|---|---|---|---|
| `approval` | graph framework | | | | | |
| `approval` | agent SDK | | | | | |
| `cost_ledger` | graph framework | | | | | |
| `cost_ledger` | agent SDK | | | | | |
| `policy` | graph framework | | | | | |
| `policy` | agent SDK | | | | | |

## What only the builds can decide

- Whether any of the three ports keeps a typed interface, and so whether tier 3
  exists at all.
- Whether tier 3 extends past the three.
- Whether the 150-line bar was the right number. It is not revised before the
  result; if it proves wrong, the result is recorded against it and the bar for
  any later port is argued afresh here.

## What is deliberately not being decided

Whether this catalog should publish the conformance cases as its own artifact.
It cannot ship them as code without crossing the boundary above; whether it
should publish them as data — given, when, then, citing `port/key` — is a
question for after the result, when there is a suite worth publishing.
