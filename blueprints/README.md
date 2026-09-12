# Blueprints — Phase 3

One page per archetype, A1 through A10. The view that answers *"for this shape,
what do I need, how is it arranged, and what must I decide?"*

Each blueprint is mostly **generated** from capability tags:

- **Requirements** — capabilities tagged with this archetype, split MUST /
  SHOULD / MAY. Equally useful: what is *absent*, so nobody builds control-loop
  machinery for a shape that has no loop.
- **Design** — the `design_decisions` of those capabilities, collated.
- **Discharges** — which assurance obligations this shape's harness makes
  verifiable, and which remain uncovered.

Only two parts are hand-written per archetype: the **architecture narrative**
and its **diagram** — where the seams fall for this shape, and which position
owns what.

**Written from a decomposed implementation, never beside one.** A narrative
composed from the capabilities alone describes an architecture nobody has built,
and its seams are always in the places that are easy to write about. The A6 page
was extracted on 12 September 2026 from a reference agent whose every seam has
tests against it, and several of its paragraphs exist because something there
was a defect first.

| Archetype | Page | From |
|---|---|---|
| A6 · Tool-Using Agent | [A6-tool-using-agent.md](A6-tool-using-agent.md) | the customer-support reference agent |
