# Ports — the seams

A capability says what must exist. A **port** says where the harness meets
something it does not own, and what must hold across that meeting whoever
implements it.

Seventeen of them: ten every harness has, seven pulled in by archetype.

## Why the layer exists

The catalog is portable because it names no products. The consequence is a gap:
an adopter reads *"one choke point for every model call"*, agrees, and still has
to invent the boundary between their code and a provider's SDK — and everyone
invents a different one. The vocabulary teams need to compare notes, and that
tooling needs to bind against, does not exist anywhere in the catalog.

Ports are that vocabulary, and they are declared as **data** for the same reason
everything else here is: so that anyone can generate an interface in any
language without this repository shipping a package.

> A port names a seam. It never ships one.

## What a port is not

- **Not an interface definition.** No signatures, no types, no language, no
  error taxonomy. `operations` states intent; a generated interface states
  shape, and generation belongs downstream.
- **Not a partition of the catalog.** Most capabilities are structural and cross
  no seam at all — 26 of 98 today. A capability with no port is normal, not a
  gap, and the linter reports the split as information rather than a fault.
- **Not one per product category.** There is deliberately no prompt-registry
  port: a prompt registry is versioned storage serving content by identifier,
  which is the `config` seam with larger values. A port that exists because a
  product category exists is how seventeen seams become sixty.
- **Not a place for thresholds.** Same boundary as everywhere else in the
  catalog: how long a policy evaluation may take is a port concern; *two hundred
  milliseconds* is the adopter's.

## The fields that carry the weight

**`kernel_owns`** is what stops a port from quietly becoming a client library.
It states what stays on the harness side and is therefore not an implementation's
to decide — retry policy, the typed boundary, redaction, composition order. A
port whose harness side is empty is a wrapper, and the linter fails the build for
it.

**`invariants`** is the substance. Each states what must hold, what breaks when
it does not, the capability it belongs to, and whether an adopter could establish
it **statically** (an import rule, a type, a required argument), **dynamically**
(replay a fixture and watch), or only by **declaration** — which is worth knowing
before anyone claims coverage of it.

**`substitution_test`** is how you tell a port from one vendor's API with a
wrapper on it: the swap that must be possible, and what may legitimately differ
afterwards. If no such swap can be described, the seam is in the wrong place.
`model` must survive being replaced by recorded fixtures; `state` by an
in-memory map; `policy` by moving from in-process to a gateway.

## Core and extension

The same split as the capabilities, for the same reason. Core ports are the
seams a harness of any shape has. Extension ports arrive with an archetype and
say so in `requires_archetypes`: `tool_runtime` with agents, `retrieval` with a
grounded answerer, `artifact_verifier` with an artifact producer. A single-turn
transform never has to think about approval queues.

## One port points the other way

`eval_task` has `direction: exported`. Every other seam is something the harness
calls out through; this one is something the harness **offers**, so an evaluation
can drive the real system.

Naming it is the point. An eval harness that was never a seam gets bolted on
late, and by then the production path is the one thing it cannot reach without a
branch — which is exactly the branch that makes the measurement worthless.

## Where the orchestrator is

The commonest question on first reading: there is no `loop` port, no
`orchestrator` port, and that is deliberate. Three different things get called
orchestration, and they land in three different places.

**The agent loop is the harness.** Every control-loop capability in the catalog
crosses no seam — budget enforcement outside the model's control, the
no-progress condition, delegation depth and fan-out, cycle detection,
containment of a sub-agent's failure. They are ordering properties, and
something selectable cannot enforce an ordering property: whatever owns the loop
owns all of them. A catalog that offered the loop as a choice would be offering
its own guarantees as a choice.

**The step order is a composition root**, and it belongs to the adopter. Which
port is called before which — admission before the deadline starts, the ceiling
checked before the call rather than after, policy evaluated separately on the
way in and on the way out, redaction before anything leaves the process — is
implied by the capabilities and lives in the adopter's own code. This catalog
states the constraints; it does not ship the function.

**Only durable execution is a seam.** In a deterministic workflow the control
flow belongs to the adopter's code while resumption, retry and crash recovery
belong to infrastructure. That split is what the `workflow` port names, and it
is why that port exists while a `loop` port does not.

## Identifiers

Port names are permanent and never reused, on the same argument as capability
identifiers: they are interchange vocabulary, and a rename breaks every binding
that ever cited one. Layer and archetype are metadata on a port, never part of
its name. A port that stops being right becomes `status: deprecated` and stays
declared forever.

## Relationship to the rest of the catalog

| Layer | States | Names products |
|---|---|---|
| `capabilities/` | What must exist | Never |
| `ports/` | Where the harness meets what it does not own | Never |
| `realizations/` | Which product classes can fill a seam | Yes — the only layer that may |
| `references/` | A skeleton to copy | Incidentally, and it is expected to date |

Ports sit between the first and the third: they are what a realization option
plugs into, which is what makes the realization layer a menu rather than a pile
of unrelated recommendations.
