# Realizations — Phase 4

How each capability actually gets built, across the six approaches in
`taxonomy/construction.yaml`: in-house, framework, open-source, platform,
gateway, cloud-native.

**Informative, and the only layer where products may be named.** Versioned
separately from `capabilities/` precisely because it will go stale.

Two rules the linter enforces:

1. A capability with `realization_policy: see_aac` carries **zero** options
   here. Its machinery is already enumerated in the assurance catalog and
   duplicating it means maintaining the fastest-rotting layer twice.
2. An option may not carry a `mechanism` field. `M1`–`M7` is the assurance
   catalog's axis — verification machinery. Options here carry `position` and
   `approach`: where the component sits, and who supplies it.

**Authored last, in one dated pass.** Writing realizations alongside each
capability means writing them two or three times before the catalog stabilises.
