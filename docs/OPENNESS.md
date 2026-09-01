# Openness — the rules that keep this a standard rather than a product

A specification whose only implementation is its author's is not a standard, and
saying otherwise fools nobody for long. These are the constraints that keep the
distinction real, written while they are still free.

Each one forbids something specific. A principle that forbids nothing is
decoration.

## 1. The formats live here, not in any implementation

Three artifacts are the interchange surface:

| Artifact | What it carries | Lives in |
|---|---|---|
| **Port specs** | The seams and what must hold across them | `ports/` |
| **Profile** | An adopter's shapes, decisions, thresholds and bindings | `schema/`, this repository |
| **Receipt** | Evidence: capabilities present, obligations covered, gaps accepted | `schema/`, this repository |

All three are specification-side, under CC BY, and versioned with the catalog.
An implementation that wants to produce or consume them needs nothing from any
tool the authors of this catalog happen to write.

**Forbids:** a format defined by whatever a particular tool happens to emit.

## 2. No implementation is privileged

A schema must never require a field only one implementation could populate, and
a receipt must never be gradeable by which tool produced it. Producer identity
belongs in a receipt for provenance; it must carry no weight in the verdict.

**Forbids:** a "verified by" field that changes how a receipt is read.

## 3. The two-implementation rule

A format change is not final until something that is not the reference tooling
produces a valid artifact under it. Until then it is a draft, whatever the
version number says.

**Forbids:** declaring a format stable on the strength of one implementation.

## 4. Extension without forking

Keys prefixed `x_` are reserved for adopters and vendors. Validators must ignore
unknown `x_` keys rather than reject them. Anything an adopter needs that the
format lacks goes there, and the pressure to fork disappears.

**Forbids:** a vendor extension that requires a private schema.

## 5. Identifiers are permanent

Capability identifiers, port names, decision keys and receipt field names are
never reused and never renamed. Deprecation replaces deletion, always. Receipts
are compared across years, and that comparison is the entire point of having a
format at all.

**Forbids:** a rename, however tidy.

## 6. Nothing here is required at runtime

Describing a harness and proving its properties must be possible with no library
from this project. The formats are plain YAML and JSON, readable and writable by
hand; tooling is a convenience for people who want one.

**Forbids:** a receipt that can only be produced by running someone's binary.

## 7. Anything importable can be left

Any component an adopter imports must have a documented path to being inlined
and the dependency removed. A component that cannot be left is a defect, not a
feature.

**Forbids:** a runtime that owns state an adopter cannot get out.

## 8. No check may be exclusive to generated code

Conformance must be establishable against a harness written by hand, assembled
by a framework, or run by a hosted service. The strength of the evidence
legitimately varies — a black box yields declared gaps rather than static proof
— but the path must exist for all of them.

**Forbids:** a capability that is only checkable if you adopted the tooling.

## 9. The tooling reports nothing to anyone

No implementation of these formats may transmit anything about an adopter's
system to its authors — no usage counts, no telemetry, no registration, no
licence check. Conformance tooling that phones home is conformance tooling
nobody will run on a system that matters.

**Forbids:** exactly what it says.

## 10. Normative text names no products

Already enforced mechanically by the linter, in capabilities and in ports.
Products appear only in the realization layer, which is informative, dated, and
versioned separately because it rots.

**Forbids:** a specification that quietly recommends a vendor.

## 11. A neutral home, once there is something to govern

When two independent implementations exist, the formats should move to
governance that is not this project's authors. Written down now because the
argument for it is strongest before anyone has anything to lose by it.

The names follow the same rule: the formats are named after the catalog, never
after a tool or a company, so that moving them costs nothing but a repository
transfer.

---

## What is mechanically enforced today

| Rule | Enforcement |
|---|---|
| 10 — no products in normative text | `tools/lint.js`, capabilities and ports |
| 5 — permanent identifiers | `tools/lint.js`, gaps and reuse reported |
| 1 — formats live here | Structural: the schemas are in this repository |

The rest are editorial until there is tooling to enforce them, and each should
acquire a check as the tooling arrives. A rule with no enforcement is a rule
that survives exactly as long as the person who remembers it.
