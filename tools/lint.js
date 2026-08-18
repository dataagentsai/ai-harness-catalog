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

const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

const schema = JSON.parse(
  fs.readFileSync(path.join(ROOT, "schema/capability.schema.json"), "utf8")
);
const ajv = new Ajv({ allErrors: true, strict: false });
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
  for (const s of doc.see_also || []) {
    if (!ports.has(s) && !portFiles.includes(`${s}.yaml`)) {
      err(pf, `see_also references unknown port ${s}`);
    }
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
if (aacIds) console.log(`  assurance catalog reachable — ${aacIds.size} obligations, references checked`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`\nok\n`);
