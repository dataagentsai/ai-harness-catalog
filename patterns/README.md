# Patterns — informative, and never normative

A capability says what must **exist**. A pattern is one shape that makes it
exist, described so a builder can recognise when to reach for it.

Two rules, both enforced by the linter:

1. **No pattern without a capability.** Every entry names at least one
   capability it discharges. A pattern that discharges nothing is craft — good
   craft, possibly — and craft is cited from software engineering rather than
   catalogued here. The method object, for instance, is not in this library: it
   made a 200-line procedure readable in the reference and it makes nothing
   *exist* that a capability requires.
2. **A pattern never adds an obligation.** If adopting one makes something newly
   required — a supervisor must own shared state, a compensation must be
   idempotent — that requirement is a capability, and the pattern discharges it
   rather than declaring it. Without this rule the library becomes the back door
   through which normative content re-enters, and the catalog stops being
   neutral about how you build.

**Blueprints reference patterns; capabilities never do.** A capability that
named a pattern would be choosing for every adopter, which is the thing the
`design_decisions` block exists to avoid.

## What an entry carries

```yaml
id: PAT-router-ahead-of-loop
family: orchestration          # orchestration · reasoning · context · software
discharges: [AHC-0100, AHC-0027]
reach_for_it_when: …           # the condition, not the benefit
cannot_run_safely_without: […] # the components that make it safe, by capability
costs: …                       # what you give up; an entry with no cost is an advert
seen_in: …                     # where it is known to work, if anywhere
```

`reach_for_it_when` is the field that earns the library's place. A catalogue of
patterns with their advantages is a textbook; the useful artifact says *when*,
and says what the pattern cannot run safely without — which is how a builder
discovers that the pattern they chose needs three capabilities they have not
built.

**Most patterns are not chosen.** For an agent with a specification, the greater
part is *entailed*: a deterministic route exists because the specification says
which requests are answerable without the model, an approval gate because an
operation's authority says a person decides. That derivation is the Pattern
View, and it belongs to the agent's own specification rather than here. This
library is what the derivation points at, plus the genuine trade-offs that no
statement forces.
