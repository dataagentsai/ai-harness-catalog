# The profile — one file that says what harness you have

A capability says what must exist. A port says where the harness meets what it
does not own. A **profile** is the third artifact and the only one an adopter
writes: which shapes this system is, which of the catalog's decisions it
answered and how, which thresholds it set, which implementation fills each seam,
and which capabilities it is knowingly not meeting.

It lives in the adopting repository. `schema/profile.schema.json` lives here,
under CC BY, so that no particular tool is needed to write or read one.

## Why it exists

The catalog is portable because it names no products and publishes no
thresholds. That leaves every adopter holding the same three unwritten
documents: what we decided, what our numbers are, and what we actually bound.
They normally exist as folklore, three slide decks and a wiki page that is
eighteen months stale.

A profile is those three, in one file, in a form a reviewer can read in five
minutes and a build can check. It is the architecture decision record that
nobody writes, produced as a side effect of being specific.

## The six blocks

```yaml
apiVersion: harness-profile/v1
subject:    { name, archetypes }        # everything downstream follows from the shapes
catalog:    { ahc, aac }                # pinned, so an upgrade arrives as a diff
decisions:  { "AHC-0001/parse_failure": { value, source } }
thresholds: { token_budget_per_unit: 20000 }
bindings:   { model: { approach, adapter } }
accepted_gaps: [ { capability, reason, owner, review } ]
```

All six are required, and empty is allowed for three of them. That is
deliberate: an empty `decisions` block says every applicable decision is
outstanding, which is a legitimate starting state and an illegitimate finishing
one. Omitting the block entirely would let it be forgotten instead.

### `source` — the field that earns its place

Every answer records how it arrived: `chosen`, `golden-path`, `inherited`, or
`locked`. A reviewer can then see at a glance how much of an architecture a
person actually decided and how much arrived by default.

This is the mechanical form of a rule worth stating plainly: **a default is
permitted, a silent default is not.** Tooling may fill in a recommended answer
for every decision a shape raises — that is a golden path and it is a good
thing — but it must write down that it did.

### `extends` — inheritance, and what a platform team locks

An organisation publishes a baseline: the policy binding, the telemetry
endpoint, the decisions it will not reopen per team. A system profile extends
it, and the diff between the two is the reviewable artifact. A value marked
`locked` in the baseline cannot be overridden downstream.

### `thresholds` — where the catalog's refusal ends

The catalog will never publish a budget, a limit or an SLO, because any number
it printed would be wrong for almost everyone. The profile is where those
numbers become real, which means a profile missing one its capabilities need is
**incomplete rather than defaulted**.

### `bindings` — the whole of the stack choice

Port name to implementation, with the approach class from
`taxonomy/construction.yaml`. This is the only place in a profile where a
product may be named, and rebinding is how stack freedom is exercised: change
one line, and anything that was proven *about that adapter* is stale by
definition and gets re-proven.

### `accepted_gaps` — the honest half

An owned, dated, identified gap is a defensible position; an undiscovered one is
a finding. An empty list is therefore a claim rather than an absence — it says
every applicable capability is accounted for somewhere else.

## What the linter checks

`npm run lint` validates every `examples/*.profile.yaml` against the schema and
then against the catalog itself:

- Every port the declared shapes need is bound — and a bound port **no** shape
  needs is a warning, because that is machinery with no capability behind it.
- A shape with a control loop says who owns it: `kit-kernel`, `in-house`,
  `framework` or `hosted`. Loop properties are not selectable; who implements
  them is.
- Decision keys and accepted gaps reference capabilities that exist and that the
  declared shapes actually owe.
- The pinned catalog version matches the checkout.

Roughly thirty lines, no dependency beyond a YAML parser. That is the point
rather than an aside: a format only its own tooling can act on is not an
interchange format. See [OPENNESS.md](OPENNESS.md), rules 2 and 6.

## Fixtures that must fail

`examples/invalid/` holds profiles broken in one specific way each — a core port
unbound, an agent with no declared loop owner. The build fails if the linter
stops rejecting them.

A check nobody has watched fail is not a check, and this is the cheapest
possible defence against the whole apparatus quietly becoming decorative.

## Decision keys

A decision is answered by `AHC-####/key`, where the key is a permanent slug on
that capability's `design_decisions` entry. Permanent for the same reason
capability identifiers are: a rename breaks every profile that recorded an
answer.

**Keying is in progress.** The linter reports how many of the catalog's
decisions carry a key, and validates a profile's slug only against capabilities
that have been keyed. Until a capability is keyed, its decisions cannot be
answered in a machine-readable way — which is a gap in this catalog, stated
rather than hidden.
