#!/usr/bin/env node
/*
 * Smoke-tests the built page's client script against a DOM stub that returns
 * null for ids with no markup — exactly as a browser does.
 *
 * Inherited from the assurance catalog, and for the reason recorded there: a
 * page shipped once with an empty catalog list because a control was
 * referenced in JS and never added to the markup, so attaching listeners threw
 * before render() ran. A stub that auto-creates every element passes that bug.
 * A harness more forgiving than the browser is worse than no harness.
 */
const fs = require("fs");
const s = fs.readFileSync(process.argv[2], "utf8");
const js = s.split("<script>").pop().split("</script>")[0];
const payload = JSON.parse(s.split("window.__AHC__ = ")[1].split("</script>")[0].replace(/;\s*$/, ""));
const present = new Set([...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const els = {};
const mk = (id) => {
  if (!present.has(id)) return null;              // <-- the whole point
  return els[id] || (els[id] = {
    id, innerHTML: "", textContent: "", value: "", checked: false, dataset: {},
    addEventListener(t, f) { (this._h = this._h || {})[t] = f; },
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    setAttribute() {}, scrollIntoView() {},
  });
};
/*
 * Two kinds of change to this stub, and only one is allowed. Giving it a
 * capability a real browser has — window.addEventListener, location,
 * element.querySelector — is accuracy. Making it return an element for an id
 * with no markup is forgiveness, and mk() below stays strict about that.
 */
global.window = {
  __AHC__: payload,
  addEventListener(t, f) { (this._h = this._h || {})[t] = f; },
  location: { hash: "" },
};
global.location = global.window.location;
global.document = { getElementById: mk, querySelectorAll: () => [] };
new Function("window", "document", js)(global.window, global.document);

const out = els["catalog-out"];
if (!out || !out.innerHTML.length) { console.error("FAIL: capability list is empty"); process.exit(1); }
for (const id of ["layer-grid", "arch-list", "ports-out", "matrix", "jointbl"]) {
  if (!els[id] || !els[id].innerHTML.length) { console.error(`FAIL: ${id} rendered nothing`); process.exit(1); }
}

console.log("cards:", (out.innerHTML.match(/class="cap"/g) || []).length, "| count:", els["count"].textContent);
console.log("join rows:", (els["jointbl"].innerHTML.match(/<tr/g) || []).length,
            "| obligations:", els["j-obs"].textContent);

// A shape filter must actually change the list; a tab that renders the same
// rows means the archetype tags never reached the payload.
els["tabs"]._h.click({ target: { closest: () => ({ dataset: { a: "A6" }, setAttribute() {} }) } });
console.log("A6 tab ->", els["count"].textContent);
els["mustonly"].checked = true; els["q"]._h.input();
console.log("MUST only ->", els["count"].textContent);
els["mustonly"].checked = false; els["layersel"].value = "L4"; els["layersel"]._h.change();
console.log("layer L4 ->", els["count"].textContent);
console.log("OK");
