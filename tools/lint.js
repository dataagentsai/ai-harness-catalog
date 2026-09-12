#!/usr/bin/env node
/*
 * Capability linter. Runs in CI on every change.
 *
 * Beyond schema validation this enforces the three disciplines that keep the
 * catalog a specification rather than a framework:
 *
 *   1. Identifiers are permanent. No reuse, no gaps, no renumbering.
 *   2. Normative text names no products. Products belong only in the
 *      informative realization layer, which versions separately.
 *   3. THE BOUNDARY. A `requirement` may not state a verification obligation —
 *      that sentence belongs in the assurance catalog. And a capability marked
 *      `see_aac` may not carry build options of its own.
 *
 * Rule 3 is the one that matters. This catalog is far more prone to drifting
 * into being a framework than the assurance catalog ever was, and the drift
 * always starts with a capability that quietly explains how to test itself.
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const Ajv = require("ajv/dist/2020");

const ROOT = path.join(__dirname, "..");
const load = (p) => yaml.load(fs.readFileSync(path.join(ROOT, p), "utf8"));

const pkgVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;

const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

const schema = JSON.parse(
  fs.readFileSync(path.join(ROOT, "schema/capability.schema.json"), "utf8")
);
const ajv = new Ajv({ allErrors: true, strict: false });
require("ajv-formats")(ajv);   // date, so a review date has to be one
const validate = ajv.compile(schema);

const portSchemaPath = path.join(ROOT, "schema/port.schema.json");
const validatePort = fs.existsSync(portSchemaPath)
  ? ajv.compile(JSON.parse(fs.readFileSync(portSchemaPath, "utf8")))
  : null;

const arch = load("taxonomy/archetypes.yaml");
const layersDoc = load("taxonomy/layers.yaml");
const constrDoc = load("taxonomy/construction.yaml");

const ARCH_IDS = new Set(arch.archetypes.map((a) => a.id));
const LAYER_IDS = new Set(layersDoc.layers.map((l) => l.id));
const POS_IDS = new Set(constrDoc.positions.map((p) => p.id));
const APPROACHES = new Set(constrDoc.approaches.map((a) => a.id));

/*
 * Products that must never appear in normative text. Naming a vendor in a
 * requirement turns a neutral specification into a recommendation and dates
 * the document the moment the market moves.
 */
const PRODUCTS = [
  "langchain", "langgraph", "langsmith", "langfuse", "llamaindex", "braintrust",
  "phoenix", "ragas", "deepeval", "promptfoo", "litellm", "portkey", "helicone",
  "kong", "envoy", "apigee", "openai", "anthropic", "claude", "gpt-4", "gpt-5",
  "gemini", "llama", "mistral", "bedrock", "vertex ai", "azure", "databricks",
  "mlflow", "temporal", "crewai", "autogen", "semantic kernel", "pydantic",
  "instructor", "outlines", "presidio", "lakera", "garak", "pyrit", "opentelemetry",
  "pytest", "vitest", "redis", "postgres", "kubernetes", "istio",
];

/*
 * Verification language. Checked against `requirement` ONLY — a failure_mode
 * or a design tension may legitimately discuss testing, and the title of a
 * capability about the eval seam obviously may too.
 *
 * If a requirement says something must be tested, asserted, measured or
 * scored, it is an assurance obligation wearing a construction costume. Move
 * it to the assurance catalog and cite it back with `discharges`.
 */
const VERIFICATION = [
  "is tested", "are tested", "be tested", "test suite", "test case",
  "asserted", "assertion", "is measured", "are measured", "be measured",
  "is verified", "are verified", "be verified", "is evaluated", "are evaluated",
  "be evaluated", "is scored", "are scored", "be scored", "benchmark",
  "regression suite", "coverage of",
];

// ---------------------------------------------------------------- capabilities
const dir = path.join(ROOT, "capabilities");
const files = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort()
  : [];
const byId = new Map();

for (const f of files) {
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(path.join(dir, f), "utf8"));
  } catch (e) {
    err(f, `unparseable: ${e.message}`);
    continue;
  }

  if (!validate(doc)) {
    for (const e of validate.errors) err(f, `schema ${e.instancePath || "/"} ${e.message}`);
    continue;
  }
  if (`${doc.id}.yaml` !== f) err(f, `filename does not match id ${doc.id}`);
  if (byId.has(doc.id)) err(f, `duplicate id ${doc.id}`);
  byId.set(doc.id, doc);

  // -- taxonomy references resolve
  for (const a of doc.archetypes) if (!ARCH_IDS.has(a)) err(f, `unknown archetype ${a}`);
  for (const l of doc.layers) if (!LAYER_IDS.has(l)) err(f, `unknown layer ${l}`);
  for (const p of doc.positions) if (!POS_IDS.has(p)) err(f, `unknown position ${p}`);

  // -- core capabilities enumerate every archetype, so consumers never resolve inheritance
  if (doc.core && doc.archetypes.length !== ARCH_IDS.size) {
    err(f, `core: true but lists ${doc.archetypes.length} of ${ARCH_IDS.size} archetypes`);
  }
  if (!doc.core && doc.archetypes.length === ARCH_IDS.size) {
    warn(f, `lists every archetype but core is false — should this be core?`);
  }

  // -- discipline 2: no products in normative text
  const normative = [
    doc.title,
    doc.requirement,
    doc.failure_mode,
    ...(doc.design_decisions || []).flatMap((d) => [d.question, d.tension, d.resolution || ""]),
  ].join(" ").toLowerCase();
  for (const p of PRODUCTS) {
    if (new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(normative)) {
      err(f, `product name "${p}" in normative text — name a position or an approach class instead`);
    }
  }

  // -- discipline 3a: THE BOUNDARY. A requirement may not state a verification obligation.
  const req = doc.requirement.toLowerCase();
  for (const v of VERIFICATION) {
    if (req.includes(v)) {
      err(
        f,
        `verification language "${v}" in requirement — this is an assurance obligation, ` +
          `not a construction one. State it in the assurance catalog and cite it in discharges.`
      );
    }
  }

  // -- discipline 3b: a see_aac capability adds a constraint, never options
  if (doc.realization_policy === "see_aac") {
    if (!doc.realization_note) err(f, `see_aac requires realization_note`);
    if (!doc.discharges || doc.discharges.length === 0) {
      err(f, `see_aac requires at least one discharges reference — that is what it points at`);
    }
  }

  // -- a capability with nothing to decide is a principle, not a component
  if (doc.level === "MUST" && !(doc.design_decisions || []).length) {
    warn(f, `MUST with no design_decisions — is this a component, or a principle?`);
  }
}

// ---------------------------------------------------------------- identifiers
const ids = [...byId.keys()].sort();
if (ids.length) {
  const nums = ids.map((i) => parseInt(i.slice(4), 10));
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) {
      warn("identifiers", `gap between AHC-${String(nums[i - 1]).padStart(4, "0")} and ${ids[i]}`);
    }
  }
  for (const [id, doc] of byId) {
    for (const s of doc.see_also || []) {
      if (!byId.has(s)) err(`${id}.yaml`, `see_also references unknown ${s}`);
    }
    for (const s of doc.superseded_by || []) {
      if (!byId.has(s)) err(`${id}.yaml`, `superseded_by references unknown ${s}`);
    }
  }
}

// -------------------------------------------------------------------- ports
/*
 * A port is a seam, not a partition of the catalog. Most capabilities are
 * structural and have no port at all, so an unserved capability is reported as
 * information, never as a fault.
 *
 * The two rules worth enforcing are the ones that keep a port a specification:
 * it names no product, and it says what stays on the harness side. A port whose
 * kernel_owns is empty is a client library with a YAML file attached.
 */
const portDir = path.join(ROOT, "ports");
const portFiles = fs.existsSync(portDir)
  ? fs.readdirSync(portDir).filter((f) => f.endsWith(".yaml")).sort()
  : [];
const ports = new Map();
const servedCaps = new Set();

for (const pf of portFiles) {
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(path.join(portDir, pf), "utf8"));
  } catch (e) {
    err(pf, `unparseable: ${e.message}`);
    continue;
  }
  if (validatePort && !validatePort(doc)) {
    for (const e of validatePort.errors) err(pf, `schema ${e.instancePath || "/"} ${e.message}`);
    continue;
  }
  if (`${doc.port}.yaml` !== pf) err(pf, `filename does not match port name ${doc.port}`);
  if (ports.has(doc.port)) err(pf, `duplicate port ${doc.port}`);
  ports.set(doc.port, doc);

  for (const l of doc.layers) if (!LAYER_IDS.has(l)) err(pf, `unknown layer ${l}`);
  for (const a of doc.requires_archetypes || []) {
    if (!ARCH_IDS.has(a)) err(pf, `unknown archetype ${a}`);
  }
  for (const c of doc.serves) {
    if (!byId.has(c)) err(pf, `serves unknown capability ${c}`);
    servedCaps.add(c);
  }
  for (const inv of doc.invariants) {
    if (inv.capability && !byId.has(inv.capability)) {
      err(pf, `invariant cites unknown capability ${inv.capability}`);
    }
  }

  // A port is normative text: the no-products rule applies here too.
  const portText = [
    doc.summary, doc.kernel_owns, doc.supplied_outside, doc.substitution_test, doc.notes || "",
    ...doc.operations.map((o) => o.intent),
    ...doc.invariants.flatMap((i) => [i.must, i.because]),
  ].join(" ").toLowerCase();
  for (const p of PRODUCTS) {
    if (new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(portText)) {
      err(pf, `product name "${p}" in a port — a port names a class of thing, never a product`);
    }
  }

  // The seam must have a harness side. Without one it is a wrapper.
  if (!doc.kernel_owns || doc.kernel_owns.trim().length < 30) {
    err(pf, `kernel_owns is empty — a seam with nothing on the harness side is a client library`);
  }

  /*
   * Tier has to be earned. A core port is one every shape binds, so it must
   * serve at least one core capability — otherwise the simplest archetype is
   * being asked to wire up machinery with no capability behind it. This caught
   * `state`, which serves nothing but archetype deltas.
   */
  const servedDocs = doc.serves.map((c) => byId.get(c)).filter(Boolean);
  if (doc.tier === "core" && servedDocs.length && !servedDocs.some((c) => c.core)) {
    err(pf, `tier: core but every capability it serves is an archetype delta — this is an extension port`);
  }

  /*
   * And the other direction: a delta served by a port that no shape the port
   * claims would ever need. Overlap is not enough to complain about — a
   * capability tagged [A5, A7, A9] is legitimately served by a seam that only
   * claims A7, because the other two shapes reach it through a different one.
   * Zero overlap is the real signal: the port is serving something for nobody.
   */
  if (doc.tier === "extension") {
    const required = new Set(doc.requires_archetypes || []);
    for (const c of servedDocs.filter((c) => !c.core)) {
      if (!c.archetypes.some((a) => required.has(a))) {
        warn(pf, `serves ${c.id}, which belongs to ${c.archetypes.join("/")} — no shape this port claims needs it`);
      }
    }
  }
  for (const s of doc.see_also || []) {
    if (!ports.has(s) && !portFiles.includes(`${s}.yaml`)) {
      err(pf, `see_also references unknown port ${s}`);
    }
  }
}

// ----------------------------------------------------------------- profiles
/*
 * A profile is an adopter's artifact and normally lives in their repository.
 * The examples here exist so the format is exercised by the same build that
 * publishes it — a schema nobody has ever validated a document against is a
 * hopeful document.
 *
 * These checks are deliberately unremarkable. They are what a `plan` command
 * would do, in thirty lines and with no dependency beyond a YAML parser, which
 * is the point: the format has to be usable by tooling nobody here wrote.
 */
const profileSchemaPath = path.join(ROOT, "schema/profile.schema.json");
const validateProfile = fs.existsSync(profileSchemaPath)
  ? ajv.compile(JSON.parse(fs.readFileSync(profileSchemaPath, "utf8")))
  : null;

function profileIssues(doc, prf) {
  const E = [], W = [];
  const e = (m) => E.push(`${prf}: ${m}`);
  const w = (m) => W.push(`${prf}: ${m}`);

  if (validateProfile && !validateProfile(doc)) {
    for (const x of validateProfile.errors) e(`schema ${x.instancePath || "/"} ${x.message}`);
    return { E, W };
  }

  const shapes = new Set(doc.subject.archetypes);
  for (const a of shapes) if (!ARCH_IDS.has(a)) e(`unknown archetype ${a}`);
  if (doc.catalog.ahc !== pkgVersion) {
    w(`pins catalog ${doc.catalog.ahc} but this checkout is ${pkgVersion}`);
  }

  // Which capabilities this system owes, and which seams that implies.
  const owed = [...byId.values()].filter((c) => c.archetypes.some((a) => shapes.has(a)));
  const needed = [...ports.values()].filter(
    (p) => p.tier === "core" || (p.requires_archetypes || []).some((a) => shapes.has(a))
  );

  for (const p of needed) {
    if (!doc.bindings[p.port]) e(`port "${p.port}" is needed by ${[...shapes].join("/")} and is not bound`);
  }
  for (const name of Object.keys(doc.bindings)) {
    if (name.startsWith("x_")) continue;
    if (!ports.has(name)) { e(`binds unknown port "${name}"`); continue; }
    if (!needed.includes(ports.get(name))) {
      w(`binds "${name}", which no declared shape needs — machinery with no capability behind it`);
    }
  }

  // A shape with a control loop has to say who owns it. That is catalog
  // knowledge rather than schema knowledge, so it is checked here.
  const looped = ["A6", "A7", "A9"].filter((a) => shapes.has(a));
  if (looped.length && !(doc.harness && doc.harness.loop)) {
    e(`declares ${looped.join("/")} but does not say who owns the control loop`);
  }

  for (const key of Object.keys(doc.decisions)) {
    if (key.startsWith("x_")) continue;
    const cid = key.split("/")[0];
    if (!byId.has(cid)) { e(`decision "${key}" references unknown ${cid}`); continue; }
    if (!owed.includes(byId.get(cid))) w(`answers "${key}", which no declared shape owes`);
    // Only checkable once the capability's decisions carry keys. Until then the
    // slug half of the identifier is unverifiable, which the report says out loud.
    const keyed = (byId.get(cid).design_decisions || []).filter((d) => d.key);
    if (keyed.length && !keyed.some((d) => d.key === key.split("/")[1])) {
      e(`decision "${key}" is not one ${cid} raises — it asks: ${keyed.map((d) => d.key).join(", ")}`);
    }
  }
  for (const g of doc.accepted_gaps) {
    if (!byId.has(g.capability)) e(`accepted gap references unknown ${g.capability}`);
    else if (!owed.includes(byId.get(g.capability))) {
      w(`accepts a gap on ${g.capability}, which no declared shape owes`);
    }
  }
  return { E, W };
}

const exDir = path.join(ROOT, "examples");
const profileFiles = fs.existsSync(exDir)
  ? fs.readdirSync(exDir).filter((f) => f.endsWith(".profile.yaml")).sort()
  : [];
let profilesChecked = 0;

for (const prf of profileFiles) {
  const { E, W } = profileIssues(yaml.load(fs.readFileSync(path.join(exDir, prf), "utf8")), prf);
  E.forEach((m) => errors.push(m));
  W.forEach((m) => warnings.push(m));
  if (!E.length) profilesChecked++;
}

/*
 * Fixtures that must FAIL. A check nobody has watched fail is not a check, and
 * these are cheap enough that there is no excuse for not having them: each file
 * under examples/invalid/ is a profile broken in one specific way, and the build
 * fails if the linter has stopped noticing.
 */
const badDir = path.join(exDir, "invalid");
const badFiles = fs.existsSync(badDir)
  ? fs.readdirSync(badDir).filter((f) => f.endsWith(".profile.yaml")).sort()
  : [];
for (const bf of badFiles) {
  const { E } = profileIssues(yaml.load(fs.readFileSync(path.join(badDir, bf), "utf8")), `invalid/${bf}`);
  if (!E.length) {
    err(`invalid/${bf}`, `is meant to be rejected and passed — a check has gone quiet`);
  }
}

// ------------------------------------------------------- realization discipline
/*
 * Realizations are informative and may name products — the only layer that may.
 * The one hard rule is that a see_aac capability carries none, because its
 * options already exist in the assurance catalog and duplicating them is how
 * the fast-moving layer ends up written twice and maintained once.
 */
const realDir = path.join(ROOT, "realizations");
const realFiles = fs.existsSync(realDir)
  ? fs.readdirSync(realDir).filter((f) => f.endsWith(".yaml"))
  : [];
for (const rf of realFiles) {
  const doc = yaml.load(fs.readFileSync(path.join(realDir, rf), "utf8"));
  for (const [cid, entry] of Object.entries(doc.capabilities || {})) {
    const cap = byId.get(cid);
    if (!cap) { err(rf, `realization for unknown capability ${cid}`); continue; }
    if (cap.realization_policy === "see_aac" && (entry.options || []).length) {
      err(rf, `${cid} is see_aac but carries ${entry.options.length} options — point at the assurance catalog instead`);
    }
    for (const o of entry.options || []) {
      if (!APPROACHES.has(o.approach)) err(rf, `${cid}: unknown approach "${o.approach}"`);
      if (o.mechanism) {
        err(rf, `${cid}: "mechanism" is the assurance catalog's axis — use position and approach here`);
      }
    }
  }
}

// ------------------------------------------------------------ pattern discipline
/*
 * Patterns are informative, like realizations. Two rules: every pattern names a
 * capability it discharges — one that discharges nothing is craft, and craft is
 * cited rather than catalogued — and it points at capabilities that exist.
 */
const patDir = path.join(ROOT, "patterns");
const patFiles = fs.existsSync(patDir)
  ? fs.readdirSync(patDir).filter((f) => f.endsWith(".yaml"))
  : [];
const FAMILIES = new Set(["orchestration", "reasoning", "context", "software"]);
const patternIds = new Set();
for (const pf of patFiles) {
  const doc = yaml.load(fs.readFileSync(path.join(patDir, pf), "utf8"));
  for (const p of doc.patterns || []) {
    if (!p.id || !/^PAT-[a-z0-9-]+$/.test(p.id || "")) err(pf, `bad pattern id "${p.id}"`);
    if (patternIds.has(p.id)) err(pf, `${p.id} appears twice`);
    patternIds.add(p.id);
    if (!FAMILIES.has(p.family)) err(pf, `${p.id}: unknown family "${p.family}"`);
    if (!(p.discharges || []).length) {
      err(pf, `${p.id} discharges nothing — a pattern that makes no capability exist is craft, and craft is cited`);
    }
    for (const cid of p.discharges || []) {
      if (!byId.get(cid)) err(pf, `${p.id}: discharges unknown capability ${cid}`);
    }
    for (const field of ["reach_for_it_when", "cannot_run_safely_without", "costs"]) {
      if (!p[field]) err(pf, `${p.id} has no ${field}`);
    }
  }
}

// ------------------------------------------------- cross-catalog reference check
/*
 * discharges must point at obligations that actually exist. This runs only when
 * a checkout of the assurance catalog is reachable — the repo must lint
 * standalone, so an unreachable sibling is a warning, never an error.
 */
const aacPath =
  process.env.AAC_CATALOG_PATH || path.join(ROOT, "..", "ai-assurance-catalog", "catalog");
let aacIds = null;
if (fs.existsSync(aacPath)) {
  aacIds = new Set(
    fs.readdirSync(aacPath).filter((f) => f.endsWith(".yaml")).map((f) => f.slice(0, -5))
  );
} else {
  warn("crosswalk", `assurance catalog not found at ${aacPath} — discharges references unchecked`);
}

let dischargeCount = 0;
const dischargedAac = new Set();
for (const [id, doc] of byId) {
  for (const a of doc.discharges || []) {
    dischargeCount++;
    dischargedAac.add(a);
    if (aacIds && !aacIds.has(a)) err(`${id}.yaml`, `discharges unknown obligation ${a}`);
  }
  if (!(doc.discharges || []).length) {
    warn(`${id}.yaml`, `discharges nothing — a capability that makes no obligation verifiable may not belong here`);
  }
}

// ---------------------------------------------------------------- archetype pin
/*
 * The archetype vocabulary is owned by the assurance catalog and copied here.
 * A silent fork would break the join between the two catalogs, so drift is
 * reported loudly.
 */
if (fs.existsSync(path.join(aacPath, "..", "taxonomy", "archetypes.yaml"))) {
  const upstream = yaml.load(
    fs.readFileSync(path.join(aacPath, "..", "taxonomy", "archetypes.yaml"), "utf8")
  );
  const up = upstream.archetypes.map((a) => `${a.id}:${a.name}`).join("|");
  const here = arch.archetypes.map((a) => `${a.id}:${a.name}`).join("|");
  if (up !== here) {
    err("taxonomy/archetypes.yaml", "drifted from the assurance catalog — re-copy, do not edit here");
  }
}

// ---------------------------------------------------------------- report
const layerHist = {};
for (const doc of byId.values()) for (const l of doc.layers) layerHist[l] = (layerHist[l] || 0) + 1;

console.log(`\nAI Harness Catalog — lint`);
console.log(`  capabilities   ${byId.size}`);
console.log(`  core           ${[...byId.values()].filter((d) => d.core).length}`);
console.log(`  layers covered ${Object.keys(layerHist).length} of ${LAYER_IDS.size}`);
console.log(`  discharges     ${dischargeCount} references to ${dischargedAac.size} distinct obligations`);
if (ports.size) {
  const core = [...ports.values()].filter((p) => p.tier === "core").length;
  console.log(`  ports          ${ports.size} (${core} core, ${ports.size - core} by archetype)`);
  console.log(`  seam coverage  ${servedCaps.size} capabilities cross a port; ${byId.size - servedCaps.size} are structural`);
}
const ddTotal = [...byId.values()].reduce((n, c) => n + (c.design_decisions || []).length, 0);
const ddKeyed = [...byId.values()].reduce((n, c) => n + (c.design_decisions || []).filter((d) => d.key).length, 0);
console.log(`  decisions      ${ddKeyed} of ${ddTotal} carry a key and can be answered in a profile`);
if (profileFiles.length) console.log(`  profiles       ${profilesChecked} of ${profileFiles.length} example profile(s) valid against the catalog`);
if (aacIds) console.log(`  assurance catalog reachable — ${aacIds.size} obligations, references checked`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
// ---- guidance: commentary must point at something, and only at fields it owns.
// A file named for an id that does not exist renders nowhere and reports
// nothing — a check that can never fire.
const GUIDE_FIELDS = new Set(["id", "plain", "why", "example", "detect", "not_this"]);
const guideDirL = path.join(ROOT, "guidance");
let guided = 0;
if (fs.existsSync(guideDirL)) {
  for (const f of fs.readdirSync(guideDirL).filter((x) => x.endsWith(".yaml")).sort()) {
    const g = yaml.load(fs.readFileSync(path.join(guideDirL, f), "utf8"));
    if (!g || !g.id) { errors.push(`guidance/${f} has no id`); continue; }
    if (g.id !== f.replace(/\.yaml$/, "")) errors.push(`guidance/${f} declares ${g.id}`);
    if (!byId.has(g.id)) { errors.push(`guidance/${f} explains ${g.id}, which is not in the catalog`); continue; }
    for (const k of Object.keys(g)) if (!GUIDE_FIELDS.has(k)) errors.push(`guidance/${f}: unknown field ${k}`);
    for (const n of g.not_this || []) {
      if (!byId.has(n.id)) errors.push(`guidance/${f}: not_this cites ${n.id}, which does not exist`);
    }
    // Commentary must not carry normative text — a second authority that can
    // disagree with the catalog is exactly what guidance/ is arranged to prevent.
    if ("requirement" in g) errors.push(`guidance/${f} carries a requirement — the catalog owns that`);
    guided += 1;
  }
}
if (guided) console.log(`guidance: ${guided} explained, ${byId.size - guided} not yet`);

if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`\nok\n`);
