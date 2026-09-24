"use strict";
/*
 * `extends` — resolving a profile against the baseline it inherits.
 *
 * The schema has declared `extends` since the format was published and nothing
 * implemented it, so every adopter restated their whole stack in every profile.
 * Restated values drift: the reference agent's profile and the stack file it
 * was copied from disagreed on seven bindings and omitted a port entirely, and
 * nothing could notice because nothing had ever compared them.
 *
 * The schema says what this is for in one line, and it is the line the rules
 * below are derived from:
 *
 *   "An organisation publishes what it will not reopen per team; a system
 *    extends it. The diff between the two is the reviewable artifact."
 *
 * So resolution is not only a merge. A merge alone would let a system quietly
 * replace a baseline's choice, and the diff would stop being reviewable the
 * moment it stopped being visible. An override is therefore allowed and must
 * say why — the same shape as `accepted_gaps`, which has always required a
 * reason rather than permitting a bare assertion.
 *
 * ---------------------------------------------------------------------------
 * MERGE RULES, one line each
 * ---------------------------------------------------------------------------
 *   subject         the child's, whole. A system is not a variant of a
 *                   baseline's subject; it is its own thing on a shared stack.
 *   catalog         the child's if it pins one, else the baseline's.
 *   harness         per key, child wins. `loop` is normally inherited.
 *   decisions       per key, child wins. A system may answer a decision the
 *                   baseline left open, and may re-answer one it closed.
 *   thresholds      per key, child wins. Numbers belong to the system.
 *   bindings        per PORT, then per FIELD. A child may add `x_scopes` to a
 *                   port without restating its adapter — which is the whole
 *                   point, and the reason this is not a shallow merge.
 *   accepted_gaps   concatenated, child first. A baseline's gap does not stop
 *                   being a gap because a system inherited it.
 *   x_untested      concatenated.
 * ---------------------------------------------------------------------------
 *
 * Two findings come out of resolution rather than out of the schema, and both
 * are about the diff rather than about the result:
 *
 *   OVERRIDE WITHOUT A REASON is an error. A child that changes a bound port's
 *   `approach` or `adapter` has left the baseline, and leaving silently is how
 *   a fleet ends up on six stacks that all claim to be one.
 *
 *   RESTATING THE BASELINE is a warning. A child that repeats a value it would
 *   have inherited has written the line that goes stale, because nothing will
 *   ever tell it the baseline moved. Deleting it is the fix.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const OBJECT_KEYS = ["harness", "decisions", "thresholds"];
const LIST_KEYS = ["accepted_gaps", "x_untested"];

/** Fields whose change means the child has left the baseline. */
const IDENTITY_FIELDS = ["approach", "adapter"];

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Load a profile and everything it extends, nearest-last.
 *
 * `extends` is resolved relative to the file that declares it, so a baseline
 * may live in another repository and be reached by a relative path — which is
 * the normal case, since a stack is published once and used by many systems.
 */
function chain(file, seen = []) {
  const full = path.resolve(file);
  if (seen.includes(full)) {
    throw new Error(`extends loops: ${[...seen, full].map((f) => path.basename(f)).join(" -> ")}`);
  }
  if (!fs.existsSync(full)) {
    const from = seen.length ? ` (extended from ${path.basename(seen[seen.length - 1])})` : "";
    throw new Error(`no such profile: ${file}${from}`);
  }
  const doc = yaml.load(fs.readFileSync(full, "utf8")) || {};
  if (!doc.extends) return [{ file: full, doc }];
  const parent = path.resolve(path.dirname(full), doc.extends);
  return [...chain(parent, [...seen, full]), { file: full, doc }];
}

/** Merge one child onto one baseline. Neither argument is modified. */
function merge(base, child) {
  const out = { ...base, ...child };
  delete out.extends;

  for (const key of OBJECT_KEYS) {
    if (isObject(base[key]) || isObject(child[key])) {
      out[key] = { ...(base[key] || {}), ...(child[key] || {}) };
    }
  }
  for (const key of LIST_KEYS) {
    if (base[key] || child[key]) out[key] = [...(child[key] || []), ...(base[key] || [])];
  }

  // Bindings are the only two-level merge, and the level matters: a child that
  // wants to add `x_scopes` to a port must not have to restate the adapter it
  // is not changing.
  if (isObject(base.bindings) || isObject(child.bindings)) {
    const bindings = { ...(base.bindings || {}) };
    for (const [port, spec] of Object.entries(child.bindings || {})) {
      bindings[port] = isObject(bindings[port]) && isObject(spec)
        ? { ...bindings[port], ...spec }
        : spec;
    }
    out.bindings = bindings;
  }
  return out;
}

/**
 * What the child did to the baseline, as findings.
 *
 * Reported per adjacent pair rather than against the fully flattened result,
 * so a three-deep chain says which link changed a port rather than only that
 * something did.
 */
function diffIssues(base, child, label) {
  const E = [];
  const W = [];
  for (const [port, spec] of Object.entries(child.bindings || {})) {
    if (port.startsWith("x_") || !isObject(spec)) continue;
    const inherited = (base.bindings || {})[port];
    if (!isObject(inherited)) continue; // a port the baseline does not bind

    const changed = IDENTITY_FIELDS.filter(
      (f) => spec[f] !== undefined && spec[f] !== inherited[f]
    );
    if (changed.length) {
      if (!spec.x_why) {
        E.push(
          `${label}: overrides "${port}" (${changed
            .map((f) => `${f}: ${inherited[f]} -> ${spec[f]}`)
            .join(", ")}) without x_why — leaving the baseline is allowed, silently is not`
        );
      }
      continue;
    }
    const restated = IDENTITY_FIELDS.filter((f) => spec[f] !== undefined);
    if (restated.length && Object.keys(spec).every((k) => k.startsWith("x_") || IDENTITY_FIELDS.includes(k))) {
      W.push(
        `${label}: restates "${port}" (${restated.join(", ")}) exactly as the baseline has it — ` +
          `delete it, or it will not follow when the baseline moves`
      );
    }
  }
  return { E, W };
}

/**
 * Resolve a profile file. Returns the flattened document, the chain it came
 * from, and what the overriding looked like.
 */
function resolve(file) {
  const links = chain(file);
  let doc = links[0].doc;
  const E = [];
  const W = [];
  for (let i = 1; i < links.length; i++) {
    const label = path.basename(links[i].file);
    const found = diffIssues(doc, links[i].doc, label);
    E.push(...found.E);
    W.push(...found.W);
    doc = merge(doc, links[i].doc);
  }
  return { doc, chain: links.map((l) => l.file), errors: E, warnings: W };
}

module.exports = { resolve, merge, chain };

/* Run directly to see what a profile actually says once resolved. */
if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node tools/resolve.js <profile.yaml>");
    process.exit(2);
  }
  let out;
  try {
    out = resolve(target);
  } catch (err) {
    console.error(`  x ${err.message}`);
    process.exit(1);
  }
  out.warnings.forEach((m) => console.error(`  ! ${m}`));
  out.errors.forEach((m) => console.error(`  x ${m}`));
  if (out.chain.length > 1) {
    console.error(`  resolved through ${out.chain.map((f) => path.basename(f)).join(" <- ")}`);
  }
  console.log(yaml.dump(out.doc, { lineWidth: 100 }));
  process.exit(out.errors.length ? 1 : 0);
}
