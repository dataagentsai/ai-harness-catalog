# Guidance

Non-normative commentary, one file per capability, keyed by id.

**The catalog is the authority.** `capabilities/AHC-0055.yaml` says what must
exist; `guidance/AHC-0055.yaml` explains it. Guidance may never restate, qualify
or extend a `requirement` — if the two disagree, the catalog wins and the
guidance is a bug.

## Fields

All optional:

| field | answers |
|---|---|
| `plain` | what it means in ordinary words |
| `why` | the failure it exists to prevent |
| `example` | one concrete instance of that failure |
| `detect` | how you would know you lack it |
| `not_this` | neighbouring capabilities that do **not** cover it, and why |

**`why` is usually redundant here**, and that is a real difference from the
assurance catalog. A capability already carries `failure_mode` — *what breaks
without it* — as a normative field, and it is normally better written than
commentary would be. Use `why` only where there is something the failure mode
does not already say.

That asymmetry is worth noticing rather than smoothing over: AHC entries are
longer and more explanatory by construction, so they need less commentary. The
shared field set is for consistency across the two repositories, not because
every field earns its place in every entry.

## Coverage

Written where there is something real to say. A capability with no file renders
normally and says guidance has not been written yet — honest, and better than
padding, which hides the requirement without adding to it.
