# The boundary with the AI Assurance Catalog

This catalog has a sibling: the
[AI Assurance Catalog](https://github.com/basantchoudhary/ai-assurance-catalog).
They share an archetype vocabulary and nothing else. Keeping them distinct is
the single most important editorial discipline in this repository, because the
moment they blur, one of them becomes redundant.

## The rule

> **AAC states what must be *true*. AHC states what must *exist*.**
> Properties, verified ⟷ Components, built.

Every "does this belong here?" question reduces to that sentence.

| | AAC | AHC |
|---|---|---|
| Unit | Obligation | Capability |
| Asks | Is it right? | What do I build? |
| Answer is | A verdict | A component |
| Axes | mechanism × stage | layer × position |
| Fails when | A test does not pass | A component does not exist |

## A worked pair

The assurance catalog says, in AAC-0055:

> Maximum steps, wall-clock and token budget are enforced by the harness — not
> requested in the prompt — and the stop path is tested including its
> partial-result behaviour.

Note *"enforced by the harness."* Across all 108 obligations, that phrase is a
dangling reference: the assurance catalog names the harness constantly and
never says what one is. This catalog is the referent. Its capability states
what the loop must contain, where the counter lives, and what the caller
receives at cutoff — then cites `discharges: [AAC-0055]`.

Neither is complete alone. An obligation nobody knows how to build is a
principle; a component nobody knows how to check is a hope.

## How the rule is enforced

**Mechanically, in `tools/lint.js`:**

1. A `requirement` containing verification language — *tested*, *asserted*,
   *measured*, *verified*, *scored*, *benchmark* — is a build error. That
   sentence is an assurance obligation wearing a construction costume. Move it
   to AAC and cite it back.
2. A capability marked `realization_policy: see_aac` must carry a
   `realization_note` and at least one `discharges` reference, and
   `realizations/` must carry **zero** options for it.
3. A realization option carrying a `mechanism` field is a build error —
   `M1`–`M7` is the assurance catalog's vocabulary. This catalog uses
   `position` and `approach`.
4. `taxonomy/archetypes.yaml` is diffed against upstream. Drift is an error;
   the vocabulary is owned there, copied here.

The `requirement` field is the only one scanned for rule 1. A `failure_mode` may
legitimately describe what goes wrong at test time, and a design tension may
discuss verification as a trade-off — the ban is on *stating a verification
obligation as this catalog's normative text*, not on mentioning testing.

## When a capability points at AAC instead

The default is `realization_policy: own`, because for most capabilities the
construction question is genuinely different from the verification question,
even on the same subject. Redaction is the standard example: AAC asks which
detector produces a verdict and where it runs; AHC asks whether an unredacted
copy ever exists at rest. Different questions, both worth answering.

Use `see_aac` when the honest answer is *"the machinery is the same and AAC
already lists it."* The capability still exists — it is a component you must
build — but this catalog contributes only a structural constraint, and
duplicating the option list would mean maintaining the fastest-rotting layer in
two places.

`AHC-0009` is the reference example of the pattern.

## The dependency direction

**One-directional: AHC → AAC.** This catalog cites AAC identifiers; AAC contains
no reference to this one and does not need to know it exists. That is
deliberate. The assurance catalog's strategic position depends on it competing
with nobody, and construction guidance competes with every framework's
documentation. Keeping the opinionated half in a separate repository is what
protects the neutral half.

If the two ever need to ship together, they still should not merge — publish a
combined rendered site from two independent sources.

## The tripwire

The assurance catalog's tripwire is *"if code in this repository ever evaluates
something, the boundary has been crossed."* This repository needs its own,
because it is far more prone to drift — construction guidance sits one small
step from being a framework.

> **AHC describes what a component must do and what breaks without it. It never
> ships the component.**
>
> If anything under `references/` is ever published as an importable dependency
> rather than a skeleton to copy, the boundary has been crossed.

The moment this repository ships a library, every capability in it becomes an
advertisement for that library, and the catalog stops being something a team
with a different stack can use.
