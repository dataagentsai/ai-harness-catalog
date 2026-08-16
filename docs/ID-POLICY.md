# Identifier policy

Identical in shape to the assurance catalog's, and for the same reasons. If you
have read that one, you already know this one.

## The rule

Identifiers are `AHC-####`. **Flat, permanent, never reused.** Layer, position
and archetype are metadata on a capability, never part of its identity.

## Why flat

The obvious scheme is to encode the layer or the archetype — `L4-03`, or
`A6-07`. It is wrong for the same reason it was wrong in the assurance catalog,
and the failure arrives quickly.

A capability belongs to more than one layer (context assembly is also a cost
concern; tool dispatch is also an authorization concern) and to more than one
archetype. Encoding either into the identifier forces a choice between a lie —
filing it under one layer and hoping nobody looks — and a renumber, which breaks
every citation ever made.

ATT&CK hit this with techniques and tactics. Flat identifiers with multi-valued
metadata is the shape that survives re-categorisation.

## Consequences

- **Numbers are allocated in authoring order**, not in taxonomy order. `AHC-0004`
  sitting between two unrelated layers is expected, not a defect.
- **Gaps are warnings, not errors.** A withdrawn draft leaves a hole; the hole
  stays.
- **Nothing is ever deleted.** A capability that stops being right becomes
  `status: deprecated` or `status: superseded` with `superseded_by`, and remains
  in the catalog forever so citations keep resolving.
- **Renumbering is never correct.** If the catalog is reorganised, the
  presentation changes and the identifiers do not.

## Citing a capability

The unit of adoption is one identifier in one place — an architecture decision
record, a module docstring, a review checklist.

```python
# AHC-0004 — all model calls route through this client, nothing constructs a
# provider SDK directly. See docs/adr/0012-model-client.md
class ModelClient: ...
```

```markdown
## Decision: budget enforced in the loop and at the gateway
Discharges AHC-0041. Assurance obligations: AAC-0055, AAC-0061.
```

That costs nothing and requires no buy-in to the rest of the catalog.

## The relationship to AAC identifiers

`discharges: [AAC-####]` references the assurance catalog. Those identifiers are
owned there and are equally permanent, so the reference is stable in both
directions.

The linter validates every `discharges` reference against a real checkout when
one is reachable. A reference to a deprecated obligation still resolves — that is
the whole point of never deleting — but should be revisited when its
`superseded_by` is known.
