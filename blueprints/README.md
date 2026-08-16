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
