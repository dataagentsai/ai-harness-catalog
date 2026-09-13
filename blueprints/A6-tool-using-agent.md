# A6 · Tool-Using Agent — architecture

**The hand-written half of this blueprint.** Requirements, design decisions and
discharges are collated in
[A6-owes.generated.md](A6-owes.generated.md) — generated from the capabilities
themselves, grouped by layer, and checked in CI against what those files
currently say, because a restatement that can drift is a restatement that will.
What follows is the part a generator cannot derive — where the seams fall for this shape, and which
position owns what. Extracted from a decomposed reference implementation on
12 September 2026, not designed beside one: every seam named here exists in
working code with tests against it.

---

## The shape, in one sentence

A deterministic router decides whether the model is needed at all; when it is, a
bounded loop asks, acts and screens, and every effect crosses a gate that the
model cannot talk its way through.

## What owns what

| Position | Owns | Why not elsewhere |
|---|---|---|
| **P1 · edge** | the credential becomes an identity, once (AHC-0099); the delivery id that makes a retry one run (AHC-0053) | anything enforced here is invisible to a second entry point, so only what *must* happen before the harness belongs |
| **P3 · harness** | assembly, the model choke point, cost accounting, the typed boundary | it sees types and caller intent; it governs only code that imports it |
| **P4 · loop** | the step and cost bounds, oscillation, the policy positions around a call | the only position that can see *this is one runaway task*, not fourteen tasks |
| **P5 · tool boundary** | authority, argument validation, the idempotency ledger, result bounding | the last place an action can be stopped while stopping it is still cheap |
| **P6 · state** | the checkpoint, approvals, escalations, the delivery log | enforcement that must outlive a crash lives where the crash does not reach |
| **P8 · human** | the approval queue and the escalation desk | the only position that can exercise judgement the system does not have |

## The seams, and what each one is

The composition root's signature **is** the port list. Everything an A6 needs
from outside itself appears there, and appears as one of three kinds:

| Kind | In the reference | Rule |
|---|---|---|
| **Port** — an interface to something the harness does not own | model client, tool client, checkpoint store, approval store, escalation store, delivery log, clock | a protocol, always; a concrete type here is a deployment that cannot be swapped or simulated |
| **Configuration** — versioned data, not code | routing rules, policy rules per position, escalation rules, desk capacity, run config | carries a version, because changing it changes behaviour and nobody rebuilds |
| **Factory** — a thing made per unit of work | the cost meter, one per task | a shared instance would accumulate one run's spend into another's ceiling |

**Absence is a realisation.** An A6 with no approval store cannot refund and
says so; with no escalation desk it refuses the handover rather than promising
one. Each is a null object behind the same protocol, never an `if` at the call
site — the branch is what rots, because the third branch is always added
somewhere else.

## The turn, in order

```
  delivery id ──► once?           P1   a retry is one run, not two
        │
        ▼
  identity  ◄── credential        P1   never from the request body
        │
        ▼
  gates                           P4   is a person already holding this?
        │                              is a decision waiting?
        ▼
  route                           P3   refuse · escalate · direct · loop
        │                              three of four never reach the model
        ├──────────────► direct   P3   templated from declared data
        │
        ▼
  ┌── loop ─────────────────────────────────────────┐
  │  pre-model check            P4  costs nothing    │
  │  assemble ──► model         P3  one choke point  │
  │  post-model check           P4                   │
  │  plan ──► pre-tool check    P4  did not happen   │
  │        ──► dispatch         P5  authority, key   │
  │        ──► post-tool check  P4  may not enter    │
  └──────────────────────────────────────────────────┘
        │
        ▼
  reply screen                    P3   every route, not only the model's
        │
        ▼
  persist                         P6   checkpoint, then answer
```

Two properties of that order are load-bearing, and both were defects first:

- **The reply screen is after the join, not inside the loop.** Three routes
  produce replies without the model; screening only the model's leaves the other
  three unguarded, and the templates on those routes are edited by people who
  reasonably believe that path is safe.
- **The checkpoint is written before the customer is answered.** Answering first
  and persisting after loses the record of exactly the turn that mattered.

## What this shape must decide, and what it must not

**Must decide** — and the profile records each with its source:

- whether the deterministic route may perform writes (it is selected by patterns
  over the customer's words, so an effect is one rewording away);
- what a policy block means at each position — ending the turn is right before a
  model call and wrong before a tool call, where the model can still choose again;
- whether an irreversible action the requester could re-create needs a person
  (AHC-0057's distinction between irreversible and unrecoverable).

**Must not decide by default** — these are forced by the agent's own
specification and appear in its Pattern View rather than as choices: a
deterministic route exists because the specification says which requests are
answerable without the model; an approval gate exists because an operation's
authority says a person decides; a compensation exists because an irreversible
operation declares one.

## The failure this shape is prone to

Control flow moved into the model, so **every control that lives in the prompt
is a control an input can renegotiate**. The arrangement above answers that by
putting nothing important in the prompt: authority is enforced where the tool
executes, the amount of a refund comes from the record rather than the
conversation, and a claim about an irreversible action is checked against what
the tools actually returned. The prompt is where the model is *told* about these
controls, never where they are applied.
