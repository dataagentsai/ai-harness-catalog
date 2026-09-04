#!/usr/bin/env node
/*
 * Renders the catalog to a single self-contained HTML page.
 *
 * The YAML in capabilities/ and taxonomy/ is the master. This file produces a
 * build artifact; nothing in site/ should ever be edited by hand.
 *
 * Horizontal code only: this reads the catalog and writes a document. It does
 * not evaluate anything, it ships no component, and it must never grow into
 * one — see docs/THE-AAC-BOUNDARY.md.
 *
 * The page carries one job the READMEs cannot: a reader arriving cold has to
 * be able to tell the two catalogs apart before anything else on the page
 * means much. Section 1 exists for that and nothing else.
 */
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.join(__dirname, "..");
const load = (p) => yaml.load(fs.readFileSync(path.join(ROOT, p), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

const arch = load("taxonomy/archetypes.yaml");
const layersDoc = load("taxonomy/layers.yaml");
const constrDoc = load("taxonomy/construction.yaml");

const portDir = path.join(ROOT, "ports");
const ports = !fs.existsSync(portDir)
  ? []
  : fs
      .readdirSync(portDir)
      .filter((f) => f.endsWith(".yaml"))
      .sort()
      .map((f) => yaml.load(fs.readFileSync(path.join(portDir, f), "utf8")))
      .filter((p) => p.status === "active");

const caps = fs
  .readdirSync(path.join(ROOT, "capabilities"))
  .filter((f) => f.endsWith(".yaml"))
  .sort()
  .map((f) => yaml.load(fs.readFileSync(path.join(ROOT, "capabilities", f), "utf8")))
  .filter((c) => c.status === "active");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const trim = (s) => String(s || "").trim();

// Non-normative commentary, keyed by id. The catalog stays the authority; this
// only answers questions *about* a requirement, never restates one. `why` is
// usually absent here because a capability already carries `failure_mode`.
const guideDir = path.join(ROOT, "guidance");
const guidance = {};
if (fs.existsSync(guideDir)) {
  for (const f of fs.readdirSync(guideDir).filter((x) => x.endsWith(".yaml")).sort()) {
    const g = yaml.load(fs.readFileSync(path.join(guideDir, f), "utf8"));
    guidance[g.id] = {
      plain: trim(g.plain || ""), why: trim(g.why || ""), example: trim(g.example || ""),
      detect: trim(g.detect || ""),
      not_this: (g.not_this || []).map((n) => ({ id: n.id, why: trim(n.why) })),
    };
  }
}

const data = {
  guidance,
  version: pkg.version,
  archetypes: arch.archetypes,
  layers: layersDoc.layers,
  positions: constrDoc.positions,
  approaches: constrDoc.approaches,
  levels: constrDoc.levels,
  ports: ports.map((p) => ({
    port: p.port,
    tier: p.tier,
    dir: p.direction,
    layers: p.layers,
    arch: p.requires_archetypes || [],
    summary: trim(p.summary),
    serves: p.serves,
    owns: trim(p.kernel_owns),
    outside: trim(p.supplied_outside),
    ops: p.operations.map((o) => ({ n: o.name, i: trim(o.intent), opt: !!o.optional })),
    inv: p.invariants.map((i) => ({
      must: trim(i.must),
      why: trim(i.because),
      cap: i.capability || "",
      how: i.checkable || "",
    })),
    swap: trim(p.substitution_test),
    notes: trim(p.notes),
  })),
  caps: caps.map((c) => ({
    id: c.id,
    level: c.level,
    layers: c.layers,
    pos: c.positions,
    arch: c.archetypes,
    core: !!c.core,
    title: trim(c.title),
    req: trim(c.requirement),
    fail: trim(c.failure_mode),
    disc: c.discharges || [],
    dd: (c.design_decisions || []).map((d) => ({
      q: trim(d.question),
      t: trim(d.tension),
      r: trim(d.resolution),
    })),
    policy: c.realization_policy,
    note: trim(c.realization_note),
    see: c.see_also || [],
  })),
};

const tensions = data.caps.reduce((n, c) => n + c.dd.length, 0);
const dischargeRefs = data.caps.reduce((n, c) => n + c.disc.length, 0);
const obligations = new Set(data.caps.flatMap((c) => c.disc));

/*
 * The palette is the assurance catalog's, with one deliberate change: the
 * accent. The two pages are meant to read as siblings — same type, same
 * furniture — while never being mistaken for each other at a glance.
 */
const CSS = `
:root{
  --paper:#F1F2ED; --surface:#FBFBF8; --sunk:#E9EBE3;
  --ink:#141917; --ink-2:#4E5852; --ink-3:#7C8781;
  --rule:#D3D7CC; --rule-2:#C0C6B8;
  --accent:#2B4E6D; --accent-soft:#DCE4EC;
  --alt:#2C5D4A; --alt-soft:#DDE8E1;
  --must:#9E3B22; --should:#8A6608; --may:#5F6B65;
  --must-bg:#F4E2DC; --should-bg:#F2EAD3; --may-bg:#E6E9E3;
  --serif:ui-serif,Charter,"Iowan Old Style","Source Serif Pro",Georgia,serif;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
  --sans:system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --paper:#0E1211; --surface:#151A18; --sunk:#111614;
  --ink:#E6EAE4; --ink-2:#A2ADA6; --ink-3:#78837D;
  --rule:#28302C; --rule-2:#333D38;
  --accent:#8FB6D6; --accent-soft:#18242E;
  --alt:#74B294; --alt-soft:#1A2A22;
  --must:#E2896C; --should:#D2A63F; --may:#94A19A;
  --must-bg:#2B1A15; --should-bg:#2A2313; --may-bg:#1D2320;
}}
:root[data-theme="dark"]{
  --paper:#0E1211; --surface:#151A18; --sunk:#111614;
  --ink:#E6EAE4; --ink-2:#A2ADA6; --ink-3:#78837D;
  --rule:#28302C; --rule-2:#333D38;
  --accent:#8FB6D6; --accent-soft:#18242E;
  --alt:#74B294; --alt-soft:#1A2A22;
  --must:#E2896C; --should:#D2A63F; --may:#94A19A;
  --must-bg:#2B1A15; --should-bg:#2A2313; --may-bg:#1D2320;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--serif);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:0 28px}
.prose{max-width:68ch}
p{margin:0 0 1em}
a{color:var(--accent);text-underline-offset:3px}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
code{font-family:var(--mono);font-size:.86em;background:var(--sunk);padding:.1em .35em;border-radius:3px}
pre{font-family:var(--mono);font-size:12.5px;line-height:1.6;background:var(--surface);border:1px solid var(--rule);padding:16px 18px;overflow-x:auto;margin:22px 0;color:var(--ink-2)}
pre b{color:var(--ink);font-weight:600}
.mast{border-bottom:1px solid var(--rule);background:var(--surface)}
.mast .wrap{padding-top:52px;padding-bottom:40px}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:0 0 20px;display:flex;gap:14px;flex-wrap:wrap}
.eyebrow span:not(:first-child){color:var(--ink-3)}
h1{font-family:var(--mono);font-weight:600;font-size:clamp(30px,4.6vw,48px);line-height:1.08;letter-spacing:-.025em;margin:0 0 22px;text-wrap:balance;max-width:20ch}
.standfirst{font-size:20px;line-height:1.5;color:var(--ink-2);max-width:62ch;margin:0 0 28px}
.meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:var(--rule);border:1px solid var(--rule);margin-top:32px}
.meta-grid div{background:var(--surface);padding:12px 14px}
.meta-grid dt{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin:0 0 4px}
.meta-grid dd{margin:0;font-family:var(--mono);font-size:13px}
nav.toc{position:sticky;top:0;z-index:40;background:var(--paper);border-bottom:1px solid var(--rule);overflow-x:auto}
nav.toc .wrap{display:flex;padding-top:0;padding-bottom:0}
nav.toc ol{list-style:none;display:flex;gap:0;margin:0;padding:0;min-width:max-content}
nav.toc a{display:block;font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;color:var(--ink-2);padding:13px 16px 12px;border-bottom:2px solid transparent;white-space:nowrap}
nav.toc a:hover{color:var(--ink);border-bottom-color:var(--rule-2)}
nav.toc li:first-child a{padding-left:0}
section{padding:56px 0;border-bottom:1px solid var(--rule);scroll-margin-top:46px}
.snum{font-family:var(--mono);font-size:11px;letter-spacing:.16em;color:var(--accent);text-transform:uppercase;display:block;margin-bottom:12px}
h2{font-family:var(--mono);font-weight:600;font-size:clamp(21px,2.6vw,28px);letter-spacing:-.015em;margin:0 0 18px;text-wrap:balance}
h3{font-family:var(--mono);font-weight:600;font-size:16px;margin:0}
h4{font-family:var(--mono);font-weight:600;font-size:14px;margin:30px 0 10px;letter-spacing:.02em}
.lede{font-size:19px;color:var(--ink-2);max-width:64ch;margin:0 0 26px}
.note{border-left:3px solid var(--accent);background:var(--surface);padding:16px 20px;margin:26px 0;max-width:68ch}
.note p:last-child{margin-bottom:0}
.note .tag{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);display:block;margin-bottom:6px}
.note.alt{border-left-color:var(--alt)}
.note.alt .tag{color:var(--alt)}
.tbl-scroll{overflow-x:auto;margin:22px 0;border:1px solid var(--rule);background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:560px;font-family:var(--sans);font-size:14px}
th{font-family:var(--mono);font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);text-align:left;padding:11px 14px;border-bottom:1px solid var(--rule);font-weight:600}
td{padding:11px 14px;border-bottom:1px solid var(--rule);vertical-align:top;color:var(--ink-2);line-height:1.5}
tr:last-child td{border-bottom:none}
td.k{font-family:var(--mono);font-size:12.5px;color:var(--ink);white-space:nowrap;font-weight:600}
td strong{color:var(--ink)}
.twoup{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--rule);border:1px solid var(--rule);margin:28px 0}
@media(max-width:760px){.twoup{grid-template-columns:1fr}}
.twoup .card{background:var(--surface);padding:22px 24px}
.twoup .card .kicker{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 8px}
.twoup .card.aac .kicker{color:var(--alt)}
.twoup .card h3{margin:0 0 10px;font-size:17px}
.twoup .card p{font-size:15.5px;color:var(--ink-2);margin:0 0 12px}
.twoup .card .oneline{font-family:var(--mono);font-size:13px;color:var(--ink);background:var(--sunk);padding:9px 12px;margin:0 0 14px;border-left:2px solid var(--accent)}
.twoup .card.aac .oneline{border-left-color:var(--alt)}
.twoup .card ul{margin:0 0 14px;padding-left:0;list-style:none}
.twoup .card li{font-family:var(--sans);font-size:14px;color:var(--ink-2);padding:5px 0 5px 20px;position:relative;line-height:1.5}
.twoup .card li::before{content:"—";position:absolute;left:0;color:var(--ink-3);font-family:var(--mono);font-size:12px}
.twoup .card .repo{font-family:var(--mono);font-size:12px}
.layer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1px;background:var(--rule);border:1px solid var(--rule);margin:28px 0}
.layer{background:var(--surface);padding:15px 17px}
.layer .lid{font-family:var(--mono);font-size:11px;color:var(--accent);letter-spacing:.1em}
.layer strong{display:block;font-family:var(--mono);font-size:14px;margin:3px 0 6px;color:var(--ink)}
.layer p{margin:0;font-family:var(--sans);font-size:13.5px;line-height:1.5;color:var(--ink-2)}
.layer .owns{display:block;margin-top:8px;font-family:var(--mono);font-size:11px;color:var(--ink-3)}
.layer .lcount{float:right;font-family:var(--mono);font-size:11px;color:var(--ink-3)}
.arch-list{display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);margin-top:28px}
.arch{background:var(--surface);padding:18px 20px;display:grid;grid-template-columns:64px 1fr auto;gap:18px;align-items:start}
.arch .aid{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--accent);padding-top:2px}
.arch .abody strong{display:block;font-family:var(--mono);font-size:15px;margin-bottom:4px}
.arch .abody p{margin:0;font-size:15.5px;color:var(--ink-2);line-height:1.55;max-width:60ch}
.arch .abody em{color:var(--ink-3);font-style:normal;font-family:var(--mono);font-size:12.5px;display:block;margin-top:6px}
.arch .acount{font-family:var(--mono);font-size:11px;color:var(--ink-3);text-align:right;white-space:nowrap;padding-top:4px}
.arch .acount b{display:block;font-size:19px;color:var(--ink)}
@media(max-width:660px){.arch{grid-template-columns:1fr;gap:8px}.arch .acount{text-align:left}}
.controls{position:sticky;top:44px;z-index:30;background:var(--paper);padding:14px 0 12px;border-bottom:1px solid var(--rule)}
.tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.tabs button{font-family:var(--mono);font-size:11.5px;cursor:pointer;background:var(--surface);color:var(--ink-2);border:1px solid var(--rule);padding:6px 11px;border-radius:2px}
.tabs button:hover{border-color:var(--rule-2);color:var(--ink)}
.tabs button[aria-selected="true"]{background:var(--accent);border-color:var(--accent);color:var(--surface)}
.filterbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.filterbar input[type=search]{font-family:var(--sans);font-size:13.5px;padding:7px 11px;flex:1 1 230px;background:var(--surface);border:1px solid var(--rule);color:var(--ink);border-radius:2px}
.filterbar select{font-family:var(--mono);font-size:11.5px;padding:6px 9px;background:var(--surface);border:1px solid var(--rule);color:var(--ink);border-radius:2px}
.filterbar label{font-family:var(--mono);font-size:11.5px;color:var(--ink-2);display:flex;gap:6px;align-items:center;cursor:pointer;white-space:nowrap}
.filterbar .count{font-family:var(--mono);font-size:11.5px;color:var(--ink-3);margin-left:auto}
.grouphdr{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;padding:34px 0 12px;border-bottom:1px solid var(--rule-2)}
.grouphdr .gid{font-family:var(--mono);font-size:11px;letter-spacing:.14em;color:var(--accent);text-transform:uppercase}
.grouphdr .ghint{font-family:var(--mono);font-size:11.5px;color:var(--ink-3);margin-left:auto}
.caps{display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);border-top:none}
.cap{background:var(--surface);padding:16px 18px;display:grid;grid-template-columns:1fr 268px;gap:26px}
@media(max-width:820px){.cap{grid-template-columns:1fr;gap:12px}}
.cap .lhs{min-width:0}
.capline{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px}
.cid{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--ink)}
.lvl{font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;padding:2px 6px;border-radius:2px;font-weight:600}
.lvl.MUST{color:var(--must);background:var(--must-bg)}
.lvl.SHOULD{color:var(--should);background:var(--should-bg)}
.lvl.MAY{color:var(--may);background:var(--may-bg)}
.cap h5{margin:0 0 5px;font-family:var(--serif);font-size:17px;font-weight:600;line-height:1.4;color:var(--ink)}
.cap p.req{margin:0;font-size:15px;line-height:1.55;color:var(--ink-2);max-width:58ch}
/* Guidance. Quieter than the requirement on purpose — commentary must never
   compete with the normative text for the eye. */
.guide{margin-top:12px;border-top:1px dashed var(--rule);padding-top:10px}
.guide>summary{cursor:pointer;font:600 12px/1.4 var(--sans);letter-spacing:.03em;
  text-transform:uppercase;color:var(--accent);list-style:none;display:inline-flex;
  align-items:center;gap:6px;padding:2px 0}
.guide>summary::-webkit-details-marker{display:none}
.guide>summary::before{content:"\u203A";display:inline-block;transition:transform .15s ease;font-size:15px}
.guide[open]>summary::before{transform:rotate(90deg)}
.guide>summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px}
.gbody{margin-top:10px;padding:12px 14px;background:var(--sunk);border-radius:6px}
.gpart{margin-bottom:14px}
.gpart:last-of-type{margin-bottom:8px}
.glabel{display:block;font:600 11px/1.4 var(--sans);letter-spacing:.06em;
  text-transform:uppercase;color:var(--ink-3);margin-bottom:4px}
.gpart p{margin:0 0 7px;font:15px/1.62 var(--serif);color:var(--ink-2);max-width:64ch}
.gpart p:last-child{margin-bottom:0}
.gnot{display:flex;gap:10px;margin-bottom:8px}
.gnot a{font:600 12px/1.9 var(--mono);color:var(--accent);text-decoration:none;flex:0 0 auto}
.gnot a:hover{text-decoration:underline}
.gnot p{font-size:14px}
.gfoot{margin:0;padding-top:8px;border-top:1px solid var(--rule);
  font:11px/1.5 var(--sans);color:var(--ink-3)}
.chip.guidechip{background:transparent;border-color:var(--ink-3);color:var(--ink-3);cursor:default}
.fail{margin-top:10px;font-size:14px;line-height:1.55;color:var(--ink-3);max-width:58ch;border-left:2px solid var(--rule-2);padding-left:12px}
.fail b{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--must);display:block;margin-bottom:3px}
.rhs{border-left:1px solid var(--rule);padding-left:22px;display:flex;flex-direction:column;gap:9px}
@media(max-width:820px){.rhs{border-left:none;border-top:1px dashed var(--rule);padding-left:0;padding-top:12px}}
.slot{display:grid;grid-template-columns:52px 1fr;gap:9px;align-items:start}
.slot .sk{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);padding-top:3px}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.chip{font-family:var(--mono);font-size:11px;padding:2px 7px;border-radius:2px;background:var(--accent-soft);color:var(--accent);border:1px solid transparent;cursor:help;white-space:nowrap}
.chip.n{background:var(--sunk);color:var(--ink-2);border-color:var(--rule)}
.chip.aac{background:var(--alt-soft);color:var(--alt);text-decoration:none;cursor:pointer}
.chip.prim{background:transparent;border-color:var(--accent);color:var(--accent)}
.dd{margin-top:12px;border-top:1px dashed var(--rule);padding-top:10px}
.dd summary{font-family:var(--mono);font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--accent);cursor:pointer;list-style:none}
.dd summary::-webkit-details-marker{display:none}
.dd summary::before{content:"▸ ";font-size:9px}
.dd[open] summary::before{content:"▾ "}
.dd ol{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:14px}
.dd li{max-width:64ch}
.dd .q{font-family:var(--mono);font-size:13px;color:var(--ink);display:block;margin-bottom:5px}
.dd .t{font-size:14.5px;line-height:1.55;color:var(--ink-2);display:block}
.dd .r{font-size:14px;line-height:1.55;color:var(--ink-2);display:block;margin-top:5px;padding-left:12px;border-left:2px solid var(--accent)}
.dd .r::before{content:"default — ";font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.dd .seeaac{font-size:14px;color:var(--ink-2);margin-top:10px;display:block}
.empty{background:var(--surface);border:1px solid var(--rule);padding:34px;text-align:center;font-family:var(--mono);font-size:13px;color:var(--ink-3)}
.matrix{overflow-x:auto;margin:26px 0;border:1px solid var(--rule);background:var(--surface)}
.matrix table{min-width:860px;font-family:var(--mono);font-size:12px}
.matrix th.rot{white-space:nowrap;font-size:9.5px;padding:11px 6px;text-align:center}
.matrix td{text-align:center;padding:7px 6px;font-variant-numeric:tabular-nums}
.matrix td:first-child,.matrix th:first-child{text-align:left;padding-left:14px;white-space:nowrap}
.matrix td:first-child{color:var(--ink);font-weight:600}
.cell{display:inline-block;min-width:22px;padding:2px 0;border-radius:2px}
.cell.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.cell.off{color:var(--ink-3);opacity:.4}
#joinbar{display:flex;flex-wrap:wrap;gap:6px;margin:22px 0 4px}
#joinbar button{font-family:var(--mono);font-size:11.5px;cursor:pointer;background:var(--surface);color:var(--ink-2);border:1px solid var(--rule);padding:6px 11px;border-radius:2px}
#joinbar button:hover{border-color:var(--rule-2);color:var(--ink)}
#joinbar button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--surface)}
#jointbl table{min-width:640px}
ul.plain{margin:16px 0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:12px;max-width:68ch}
ul.plain li{position:relative;padding-left:26px;color:var(--ink-2);font-size:16px;line-height:1.55}
ul.plain li::before{content:"—";position:absolute;left:0;top:0;color:var(--accent);font-family:var(--mono);font-size:13px;line-height:1.9}
ul.plain li strong{color:var(--ink)}
.phases{display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);margin:26px 0}
.phase{background:var(--surface);padding:14px 18px;display:grid;grid-template-columns:96px 1fr 92px;gap:16px;align-items:baseline}
@media(max-width:660px){.phase{grid-template-columns:1fr;gap:4px}}
.phase .pid{font-family:var(--mono);font-size:12px;color:var(--ink);font-weight:600}
.phase .pbody{font-size:15px;color:var(--ink-2);line-height:1.5}
.phase .pstate{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;text-align:right}
.phase .pstate.done{color:var(--alt)}
.phase .pstate.todo{color:var(--ink-3)}
.ports{display:grid;gap:1px;background:var(--rule);border:1px solid var(--rule);margin:28px 0}
.port{background:var(--surface);padding:18px 20px}
.portline{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap;margin-bottom:7px}
.portline .pname{font-family:var(--mono);font-size:15px;font-weight:600;color:var(--ink)}
.port p.psum{margin:0 0 12px;font-size:15.5px;line-height:1.55;color:var(--ink-2);max-width:64ch}
.split{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--rule);border:1px solid var(--rule);margin:0 0 12px}
@media(max-width:720px){.split{grid-template-columns:1fr}}
.split div{background:var(--surface);padding:12px 14px}
.split dt{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin:0 0 5px}
.split dd{margin:0;font-size:14px;line-height:1.5;color:var(--ink-2)}
.port .ops{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.port .op{font-family:var(--mono);font-size:11px;padding:2px 7px;border-radius:2px;background:var(--sunk);color:var(--ink-2);border:1px solid var(--rule);cursor:help}
.port .op.opt{opacity:.7;font-style:italic}
.port details.inv{border-top:1px dashed var(--rule);padding-top:10px}
.port details.inv summary{font-family:var(--mono);font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--accent);cursor:pointer;list-style:none}
.port details.inv summary::-webkit-details-marker{display:none}
.port details.inv summary::before{content:"▸ ";font-size:9px}
.port details.inv[open] summary::before{content:"▾ "}
.port details.inv ul{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}
.port details.inv li{max-width:64ch}
.port .must{font-family:var(--mono);font-size:13px;color:var(--ink);display:block;margin-bottom:4px}
.port .why{font-size:14.5px;line-height:1.55;color:var(--ink-2);display:block}
.port .swap{margin-top:10px;font-size:14px;line-height:1.55;color:var(--ink-2);border-left:2px solid var(--accent);padding-left:12px;max-width:64ch}
.port .swap::before{content:"substitution test — ";font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.chip.how{background:transparent;border-color:var(--rule-2);color:var(--ink-3)}
@media(max-width:660px){.phase .pstate{text-align:left}}
footer{padding:40px 0 64px;color:var(--ink-3);font-family:var(--mono);font-size:12px;line-height:1.7}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

const CLIENT = `
const D = window.__AHC__;
const AAC_REPO = "https://github.com/dataagentsai/ai-assurance-catalog/blob/main/catalog/";
const LAYER_NAME = Object.fromEntries(D.layers.map(l => [l.id, l.name]));
const POS_NAME = Object.fromEntries(D.positions.map(p => [p.id, p.name]));
const ARCH_NAME = Object.fromEntries(D.archetypes.map(a => [a.id, a.name]));
const core = D.caps.filter(c => c.core);
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
const chip = (cls, txt, title) => \`<span class="chip \${cls}" title="\${esc(title)}">\${esc(txt)}</span>\`;

document.getElementById("m-caps").textContent = D.caps.length;
document.getElementById("m-core").textContent = core.length;
document.getElementById("m-layers").textContent =
  new Set(D.caps.flatMap(c => c.layers)).size + " of " + D.layers.length;
document.getElementById("m-arch").textContent = D.archetypes.length;
document.getElementById("m-dd").textContent = D.caps.reduce((n,c) => n + c.dd.length, 0);
document.getElementById("m-disc").textContent = new Set(D.caps.flatMap(c => c.disc)).size;

// ---- Section 2: the sixteen layers, with how many capabilities each owns ----
document.getElementById("layer-grid").innerHTML = D.layers.map(l => {
  const n = D.caps.filter(c => c.layers.includes(l.id)).length;
  return \`<div class="layer"><span class="lcount">\${n}</span><span class="lid">\${l.id}</span>
    <strong>\${esc(l.name)}</strong><p>\${esc(l.summary)}</p>
    <span class="owns">owns — \${esc(l.owns)}</span></div>\`;
}).join("");

// ---- Section 3: the ten shapes, with the count each ADDS on top of core ----
document.getElementById("arch-list").innerHTML = D.archetypes.map(a => {
  const n = D.caps.filter(c => !c.core && c.arch.includes(a.id)).length;
  return \`<div class="arch"><div class="aid">\${a.id}</div>
    <div class="abody"><strong>\${esc(a.name)}</strong><p>\${esc(a.summary)}</p>
    <em>\${a.examples.map(esc).join(" · ")}</em></div>
    <div class="acount"><b>\${n}</b>added capabilities</div></div>\`;
}).join("");

// ---- Section 5: the seams ----
document.getElementById("m-ports").textContent = D.ports.length;
const CAPTITLE = Object.fromEntries(D.caps.map(c => [c.id, c.title]));
document.getElementById("ports-out").innerHTML = D.ports.map(p => \`<div class="port" id="port-\${p.port}">
  <div class="portline">
    <span class="pname">\${p.port}</span>
    <span class="chip \${p.tier === "core" ? "" : "n"}" title="\${p.tier === "core" ? "Every harness has this seam" : "Pulled in by archetype"}">\${p.tier}</span>
    \${p.arch.map(a => chip("n", a, ARCH_NAME[a])).join("")}
    \${p.dir === "exported" ? chip("prim","exported","The harness offers this seam rather than calling out through it") : ""}
    \${p.layers.map(l => chip("n", l, LAYER_NAME[l])).join("")}
  </div>
  <p class="psum">\${esc(p.summary)}</p>
  <div class="split">
    <div><dt>Harness side owns</dt><dd>\${esc(p.owns)}</dd></div>
    <div><dt>Supplied outside</dt><dd>\${esc(p.outside)}</dd></div>
  </div>
  <div class="ops">\${p.ops.map(o => \`<span class="op \${o.opt ? "opt" : ""}" title="\${esc(o.i)}\${o.opt ? " (optional)" : ""}">\${o.n}\${o.opt ? " ?" : ""}</span>\`).join("")}</div>
  <div class="chips" style="margin-bottom:4px">\${p.serves.map(c => \`<a class="chip" href="#\${c}" title="\${esc(CAPTITLE[c] || "")}">\${c}</a>\`).join("")}</div>
  <details class="inv"><summary>\${p.inv.length} invariants across this seam</summary><ul>\${
    p.inv.map(i => \`<li><span class="must">\${esc(i.must)}</span>
      <span class="why">\${esc(i.why)}</span>
      <span class="chips" style="margin-top:5px">\${i.cap ? \`<a class="chip" href="#\${i.cap}">\${i.cap}</a>\` : ""}\${i.how ? chip("how", i.how + " check", "How an adopter could establish this holds") : ""}</span></li>\`).join("")
  }</ul>
  <div class="swap">\${esc(p.swap)}</div>
  \${p.notes ? \`<p style="margin-top:10px;font-size:14px;color:var(--ink-3);max-width:64ch">\${esc(p.notes)}</p>\` : ""}
  </details>
</div>\`).join("");

const served = new Set(D.ports.flatMap(p => p.serves));
document.getElementById("p-served").textContent = served.size;
document.getElementById("p-structural").textContent = D.caps.length - served.size;
document.getElementById("p-core").textContent = D.ports.filter(p => p.tier === "core").length;

// ---- Section 6: the catalog ----
const tabs = document.getElementById("tabs");
tabs.innerHTML = [\`<button role="tab" data-a="ALL" aria-selected="true">All \${D.caps.length}</button>\`,
  \`<button role="tab" data-a="CORE" aria-selected="false">Core · every shape</button>\`]
  .concat(D.archetypes.map(a => \`<button role="tab" data-a="\${a.id}" aria-selected="false">\${a.id} · \${esc(a.name)}</button>\`)).join("");

const layerSel = document.getElementById("layersel");
layerSel.innerHTML = \`<option value="ALL">Every layer</option>\` +
  D.layers.map(l => \`<option value="\${l.id}">\${l.id} · \${esc(l.name)}</option>\`).join("");

let sel = "ALL";
const q = document.getElementById("q"), mustonly = document.getElementById("mustonly"),
      ddonly = document.getElementById("ddonly");

function ddHTML(c){
  const bits = [];
  if (c.dd.length) {
    bits.push(\`<ol>\${c.dd.map(d => \`<li>
      <span class="q">\${esc(d.q)}</span>
      <span class="t">\${esc(d.t)}</span>
      \${d.r ? \`<span class="r">\${esc(d.r)}</span>\` : ""}
    </li>\`).join("")}</ol>\`);
  }
  if (c.policy === "see_aac" && c.note) {
    bits.push(\`<span class="seeaac"><b>Build options live in the assurance catalog.</b> \${esc(c.note)}</span>\`);
  }
  if (!bits.length) return "";
  const label = c.dd.length
    ? \`\${c.dd.length} decision\${c.dd.length === 1 ? "" : "s"} you have to make\`
    : "Where the build options live";
  return \`<details class="dd"><summary>\${label}</summary>\${bits.join("")}</details>\`;
}

// Collapsed by default, and below the requirement rather than above it:
// commentary that pushed the normative text down the page would teach people to
// skip it.
function guideHTML(id){
  const g = (D.guidance||{})[id];
  if (!g) return "";
  const para = (s) => s.split(/\\n\\s*\\n/).map(p => \`<p>\${esc(p.trim())}</p>\`).join("");
  const part = (label, body) => body ? \`<div class="gpart"><span class="glabel">\${label}</span><div>\${para(body)}</div></div>\` : "";
  const others = (g.not_this||[]).map(n =>
    \`<div class="gnot"><a href="#\${n.id}">\${n.id}</a><div>\${para(n.why)}</div></div>\`).join("");
  return \`<details class="guide">
    <summary>Explain this one</summary>
    <div class="gbody">
      \${part("In plain words", g.plain)}
      \${part("Why it exists", g.why)}
      \${part("What going wrong looks like", g.example)}
      \${part("How you would know", g.detect)}
      \${others ? \`<div class="gpart"><span class="glabel">What this is <em>not</em></span><div class="gnots">\${others}</div></div>\` : ""}
      <p class="gfoot">Commentary, not the requirement. The text above is the authority.</p>
    </div></details>\`;
}

function capHTML(c){
  return \`<article class="cap" id="\${c.id}">
    <div class="lhs"><div class="capline">
      <span class="cid">\${c.id}</span>
      \${c.core ? chip("","core","Owed by every archetype") : c.arch.map(a => chip("", a, ARCH_NAME[a])).join("")}
      <span class="lvl \${c.level}">\${c.level}</span>
      \${c.layers.map(l => chip("n", l, LAYER_NAME[l])).join("")}
      \${c.dd.length ? chip("prim", c.dd.length + " decisions", "Design tensions surfaced by this capability") : ""}
      \${(D.guidance||{})[c.id] ? \`<span class="chip guidechip" title="A plain-language explanation is available below">explained</span>\` : ""}
    </div>
    <h5>\${esc(c.title)}</h5>
    <p class="req">\${esc(c.req)}</p>
    <div class="fail"><b>What breaks without it</b>\${esc(c.fail)}</div>
    \${guideHTML(c.id)}\${ddHTML(c)}</div>
    <div class="rhs">
      <div class="slot"><span class="sk">Where</span><span class="chips">\${
        c.pos.map((p,i) => chip(i === 0 ? "prim" : "n", p, POS_NAME[p] + (i === 0 ? " — primary position" : " — backstop or alternative"))).join("")
      }</span></div>
      <div class="slot"><span class="sk">Layer</span><span class="chips">\${
        c.layers.map(l => chip("", LAYER_NAME[l], l)).join("")
      }</span></div>
      <div class="slot"><span class="sk">Makes verifiable</span><span class="chips">\${
        c.disc.length
          ? c.disc.map(o => \`<a class="chip aac" href="\${AAC_REPO}\${o}.yaml" title="Assurance obligation discharged by this capability">\${o}</a>\`).join("")
          : chip("n","none cited","No assurance obligation cites this capability yet")
      }</span></div>
      \${c.see.length ? \`<div class="slot"><span class="sk">See also</span><span class="chips">\${
        c.see.map(s => \`<a class="chip n" href="#\${s}" title="Related capability">\${s}</a>\`).join("")
      }</span></div>\` : ""}
    </div></article>\`;
}

function render(){
  const term = q.value.trim().toLowerCase();
  const layer = layerSel.value || "ALL";   // empty before the options land
  const pass = c => {
    if (mustonly.checked && c.level !== "MUST") return false;
    if (ddonly.checked && !c.dd.length) return false;
    if (layer !== "ALL" && !c.layers.includes(layer)) return false;
    if (term && !(c.id + " " + c.title + " " + c.req + " " + c.fail + " " + c.disc.join(" ")).toLowerCase().includes(term)) return false;
    return true;
  };
  let out = ""; const seen = new Set();
  const groups = sel === "ALL"
    ? [["CORE", "Core — owed by every shape", core]].concat(D.archetypes.map(a => [a.id, a.name, D.caps.filter(c => !c.core && c.arch.includes(a.id))]))
    : sel === "CORE"
      ? [["CORE", "Core — owed by every shape", core]]
      // The shape's OWN deltas lead. Putting the inherited core block first
      // makes selecting a shape look like the filter did nothing.
      : [[sel, ARCH_NAME[sel], D.caps.filter(c => !c.core && c.arch.includes(sel))],
         ["CORE", "Core — owed by every shape", core]];

  for (const [gid, gname, list0] of groups){
    const list = list0.filter(pass);
    if (!list.length) continue;
    list.forEach(c => seen.add(c.id));
    const inherited = sel !== "ALL" && sel !== "CORE" && gid === "CORE";
    out += \`<div class="grouphdr"><span class="gid">\${gid}</span><h3>\${esc(gname)}</h3>
      <span class="ghint">\${inherited ? "inherited in full by " + sel + " — every shape owes these" : list.length + " capabilit" + (list.length === 1 ? "y" : "ies")}</span></div>
      <div class="caps">\${list.map(capHTML).join("")}</div>\`;
  }
  document.getElementById("catalog-out").innerHTML = out || '<div class="empty">No capability matches that filter.</div>';
  const rows = (out.match(/class="cap"/g) || []).length;
  document.getElementById("count").textContent =
    seen.size + " capabilit" + (seen.size === 1 ? "y" : "ies") + (rows !== seen.size ? \` · \${rows} rows\` : "");
}

tabs.addEventListener("click", e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  sel = b.dataset.a;
  [...tabs.querySelectorAll("button")].forEach(x => x.setAttribute("aria-selected", x === b ? "true" : "false"));
  render();
});
// Checkboxes and selects emit both events; listening for one only is a coin
// flip across browsers.
[q, mustonly, ddonly, layerSel].forEach(el => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});
render();

// A link to #AHC-0055 should behave like a page about AHC-0055: find it even if
// the current filter hides it, open its explanation, and put it on screen.
// Without this a shared link lands on whatever filter was last used.
function reveal(){
  const id = decodeURIComponent(location.hash.slice(1));
  if (!/^AHC-\\d{4}$/.test(id)) return;
  const target = document.getElementById(id);
  if (!target){
    const clean = sel === "ALL" && !q.value && !mustonly.checked && !ddonly.checked
                  && layerSel.value === "ALL";
    if (clean) return;                       // genuinely absent, not filtered away
    sel = "ALL"; q.value = ""; mustonly.checked = ddonly.checked = false;
    layerSel.value = "ALL";
    render();
    return reveal();
  }
  const guide = target.querySelector("details.guide");
  if (guide) guide.open = true;
  target.scrollIntoView({block: "start"});
}
window.addEventListener("hashchange", reveal);
reveal();

// ---- Section 7: coverage matrix, archetype x layer ----
const rows = D.archetypes.map(a => [a.id + " " + a.name, D.caps.filter(c => !c.core && c.arch.includes(a.id))]);
rows.push(["CORE (all shapes)", core]);
let mt = \`<table><thead><tr><th>Archetype</th>\${D.layers.map(l => \`<th class="rot" title="\${esc(l.name)}">\${l.id}</th>\`).join("")}<th class="rot">total</th></tr></thead><tbody>\`;
for (const [label, list] of rows){
  const counts = D.layers.map(l => list.filter(c => c.layers.includes(l.id)).length);
  mt += \`<tr><td>\${esc(label)}</td>\${counts.map(n => \`<td><span class="cell \${n?"on":"off"}">\${n||"·"}</span></td>\`).join("")}<td><span class="cell on">\${list.length}</span></td></tr>\`;
}
document.getElementById("matrix").innerHTML = mt + "</tbody></table>";

// ---- Section 8: the join, read from the assurance side ----
const byObligation = {};
for (const c of D.caps) for (const o of c.disc) (byObligation[o] = byObligation[o] || []).push(c);
const OBS = Object.keys(byObligation).sort();
document.getElementById("j-obs").textContent = OBS.length;
document.getElementById("j-refs").textContent = D.caps.reduce((n,c) => n + c.disc.length, 0);
document.getElementById("j-orphans").textContent = D.caps.filter(c => !c.disc.length).length;

let joinSel = "ALL";
const joinbar = document.getElementById("joinbar");
const oneOnly = () => OBS.filter(o => byObligation[o].length === 1);
const manyOnly = () => OBS.filter(o => byObligation[o].length > 1);
joinbar.innerHTML = [
  \`<button data-j="ALL" aria-pressed="true">All \${OBS.length} obligations</button>\`,
  \`<button data-j="MANY" aria-pressed="false">Needs several capabilities · \${manyOnly().length}</button>\`,
  \`<button data-j="ONE" aria-pressed="false">Single capability · \${oneOnly().length}</button>\`,
].join("");
joinbar.addEventListener("click", e => {
  const b = e.target.closest("button[data-j]"); if (!b) return;
  joinSel = b.dataset.j;
  [...joinbar.querySelectorAll("button")].forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  renderJoin();
});
function renderJoin(){
  const list = joinSel === "ONE" ? oneOnly() : joinSel === "MANY" ? manyOnly() : OBS;
  const body = list.map(o => {
    const caps = byObligation[o];
    return \`<tr><td class="k"><a class="chip aac" href="\${AAC_REPO}\${o}.yaml">\${o}</a></td>
      <td><span class="chips">\${caps.map(c => \`<a class="chip" href="#\${c.id}" title="\${esc(c.title)}">\${c.id}</a>\`).join("")}</span></td>
      <td>\${esc(caps.map(c => c.title).join(" · "))}</td></tr>\`;
  }).join("");
  document.getElementById("jointbl").innerHTML =
    \`<table><thead><tr><th style="width:110px">Obligation</th><th style="width:210px">Discharged by</th><th>What has to exist for it to be checkable</th></tr></thead><tbody>\${body}</tbody></table>\`;
}
renderJoin();
`;

const layerRows = data.layers
  .map((l) => `<tr><td class="k">${l.id}</td><td><strong>${esc(l.name)}</strong></td><td>${esc(l.summary)}</td><td>${esc(l.owns)}</td></tr>`)
  .join("");
const posRows = data.positions
  .map((p) => `<tr><td class="k">${p.id}</td><td><strong>${esc(p.name)}</strong></td><td>${esc(p.summary)}</td></tr>`)
  .join("");
const apRows = data.approaches
  .map((a) => `<tr><td class="k">${a.id}</td><td><strong>${esc(a.name)}</strong></td><td>${esc(a.summary)}</td></tr>`)
  .join("");
const levelRows = data.levels
  .map((l) => `<tr><td class="k"><span class="lvl ${l.id}">${l.id}</span></td><td>${esc(l.summary)}</td></tr>`)
  .join("");

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Harness Catalog — what an agentic harness must contain</title>
<meta name="description" content="A specification of the harness an AI application needs: ${data.caps.length} capabilities across 16 layers and 10 architecture archetypes, each mapped to the assurance obligations it makes verifiable. A specification, not a framework.">
<style>${CSS}</style>
</head><body>
<header class="mast"><div class="wrap">
  <p class="eyebrow"><span>Working draft ${data.version}</span><span>Generated from capabilities/</span><span>CC BY 4.0</span></p>
  <h1>AI Harness Catalog</h1>
  <p class="standfirst">What a harness for an AI application must contain — by architecture archetype, mapped to the assurance obligations each part makes verifiable.</p>
  <div class="prose">
    <p>Two catalogs sit either side of one line. The <strong>AI Assurance Catalog (AAC)</strong> publishes the test obligations an AI application owes: what must be <em>true</em> of it. This one, the <strong>AI Harness Catalog (AHC)</strong>, publishes the machinery those obligations assume: what must <em>exist</em> in order for any of them to be checkable at all.</p>
    <p>Read enough assurance obligations and a phrase starts recurring — <em>“enforced by the harness”</em>, <em>“outside the model's control”</em>. That phrase is a dangling reference. This catalog is the referent.</p>
  </div>
  <dl class="meta-grid">
    <div><dt>Capabilities</dt><dd id="m-caps">—</dd></div>
    <div><dt>Core (all shapes)</dt><dd id="m-core">—</dd></div>
    <div><dt>Harness layers</dt><dd id="m-layers">—</dd></div>
    <div><dt>Archetypes</dt><dd id="m-arch">—</dd></div>
    <div><dt>Design tensions</dt><dd id="m-dd">—</dd></div>
    <div><dt>Obligations discharged</dt><dd id="m-disc">—</dd></div>
  </dl>
</div></header>
<nav class="toc" aria-label="Sections"><div class="wrap"><ol>
  <li><a href="#two">The two catalogs</a></li>
  <li><a href="#harness">What a harness is</a></li>
  <li><a href="#archetypes">Ten shapes</a></li>
  <li><a href="#axes">Construction axes</a></li>
  <li><a href="#ports">The seams</a></li>
  <li><a href="#catalog">The catalog</a></li>
  <li><a href="#matrix">Coverage matrix</a></li>
  <li><a href="#join">The join to AAC</a></li>
  <li><a href="#using">Using it</a></li>
  <li><a href="#roadmap">Roadmap</a></li>
</ol></div></nav>
<main>

<section id="two"><div class="wrap">
  <div class="prose"><span class="snum">Section 1 — Orientation</span>
  <h2>AAC and AHC, in one page</h2>
  <p class="lede">Two repositories, one boundary. Neither is complete alone, and merging them would make one of the two redundant.</p>
  <p>They are separate because they answer different questions. An obligation nobody knows how to build is a principle; a component nobody knows how to check is a hope. Keeping them apart is what lets each stay short.</p></div>

  <div class="twoup">
    <div class="card aac">
      <p class="kicker">Sibling catalog</p>
      <h3>AAC — AI Assurance Catalog</h3>
      <p class="oneline">States what must be <strong>true</strong>.</p>
      <p>108 test obligations for AI applications, tagged by which architecture archetype owes them, which class of machinery can produce a verdict, at which lifecycle stage, and whether failure blocks a release.</p>
      <ul>
        <li>Unit — an <strong>obligation</strong></li>
        <li>Asks — is it right?</li>
        <li>Answer is — a verdict</li>
        <li>Axes — mechanism × stage</li>
        <li>Fails when — a test does not pass</li>
      </ul>
      <p class="repo"><a href="https://github.com/dataagentsai/ai-assurance-catalog">github.com/dataagentsai/ai-assurance-catalog</a></p>
    </div>
    <div class="card">
      <p class="kicker">This catalog</p>
      <h3>AHC — AI Harness Catalog</h3>
      <p class="oneline">States what must <strong>exist</strong>.</p>
      <p>${data.caps.length} harness capabilities across 16 layers, tagged by which shapes need them, where in a system they can physically live, and — the substance — the design decisions their builder is forced to make.</p>
      <ul>
        <li>Unit — a <strong>capability</strong></li>
        <li>Asks — what do I build?</li>
        <li>Answer is — a component</li>
        <li>Axes — layer × position</li>
        <li>Fails when — a component does not exist</li>
      </ul>
      <p class="repo"><a href="https://github.com/dataagentsai/ai-harness-catalog">github.com/dataagentsai/ai-harness-catalog</a></p>
    </div>
  </div>

  <div class="prose">
  <h4>A worked pair</h4>
  <p>The assurance catalog says, in AAC-0055: <em>maximum steps, wall-clock and token budget are enforced by the harness — not requested in the prompt — and the stop path is tested including its partial-result behaviour.</em></p>
  <p>Note <em>“enforced by the harness.”</em> The obligation cannot say where that counter lives, what the caller receives at cutoff, or whether the budget is enforced in the loop or at the gateway — those are construction questions, and answering them inside an assurance catalog would turn it into a framework manual. So a capability here states what the loop must contain, and cites <code>discharges: [AAC-0055]</code> back.</p>

  <div class="note"><span class="tag">The rule, in one line</span>
  <p><strong>AAC states what must be <em>true</em>. AHC states what must <em>exist</em>.</strong> Properties, verified ⟷ components, built. Every “does this belong here?” question reduces to that sentence, and the linter enforces it mechanically: a requirement containing verification language — <em>tested</em>, <em>asserted</em>, <em>measured</em>, <em>scored</em> — is a build error, because that sentence belongs in the other repository.</p></div>

  <h4>What one capability looks like</h4>
  <p>Three fields carry the weight. <code>failure_mode</code> is what justifies the capability existing — a vague one means it is a principle, not a component. <code>design_decisions</code> is the substance; a decision with nothing genuinely traded away is not a decision. <code>discharges</code> is the join, and it runs both ways: an obligation no capability discharges is a hole in this catalog.</p>
  <pre><b>id</b>: AHC-0004
<b>level</b>: MUST
<b>layers</b>: [L2]              # model invocation
<b>positions</b>: [P3, P2]       # harness library, gateway backstop
<b>title</b>: One choke point for every model call
<b>requirement</b>: &gt;-
  Every model invocation in the system passes through a single component.
  Provider SDKs are constructed in that one place and nowhere else, and the
  set of reachable models is enumerable from it.
<b>failure_mode</b>: &gt;-
  Once a second call path exists, every subsequent capability in this catalog
  acquires a hole. Cost accounting undercounts, spans go missing, the policy
  point is bypassed, and the model allow-list is advisory.
<b>discharges</b>: [AAC-0011, AAC-0100, AAC-0098, AAC-0094]     # <b>&lt;- the join</b>
<b>design_decisions</b>:
  - <b>question</b>: In-process choke point, gateway, or both?
    <b>tension</b>: &gt;-
      In-process sees types, caller identity and business context, but governs
      only code that imports it. A gateway covers everything on the network
      path and knows none of that context.
    <b>resolution</b>: &gt;-
      Both, with the split made explicit. Write it down; the failure mode is
      each side assuming the other did it.</pre>

  <h4>Conceptual now, physical later</h4>
  <p>Everything published today is <strong>conceptual and portable</strong>: what must exist, what breaks without it, and what you must decide. Nothing here names a product in normative text, and nothing here ships a component.</p>
  <p>The physical layers come later and deliberately so — <em>realizations</em> (how each capability actually gets built, the only place products may appear) and <em>reference skeletons</em> (runnable, copied rather than imported). Products are the fastest-rotting layer; authoring them alongside each capability means writing them two or three times before the catalog stabilises. See the <a href="#roadmap">roadmap</a>.</p>

  <div class="note"><span class="tag">The tripwire</span>
  <p>AHC describes what a component must do and what breaks without it. <strong>It never ships the component.</strong> If anything under <code>references/</code> is ever published as an importable dependency rather than a skeleton to copy, the boundary has been crossed — and every capability in the catalog becomes an advertisement for that library.</p></div>

  <h4>The dependency direction</h4>
  <p>One-directional: <strong>AHC → AAC</strong>. This catalog cites assurance identifiers; the assurance catalog contains no reference to this one and does not need to know it exists. That protects the neutral half — assurance guidance competes with nobody, and construction guidance competes with every framework's documentation.</p>
  </div>
</div></section>

<section id="harness"><div class="wrap">
  <div class="prose"><span class="snum">Section 2 — The harness</span>
  <h2>Everything that is neither the model nor your business logic</h2>
  <p class="lede">The deterministic scaffolding that turns a model into a system. Sixteen layers, and that count is the argument.</p>
  <p>Observability is L11 and the eval harness is L12. That they are two of sixteen is the point of this catalog: teams routinely build those two, and call the harness done. Layers are tags, not a tree — a capability frequently spans two, because context assembly is also a cost concern and tool dispatch is also an authorization concern.</p></div>
  <div class="layer-grid" id="layer-grid"></div>
  <div class="tbl-scroll"><table style="min-width:820px"><thead><tr><th style="width:56px">Layer</th><th style="width:190px">Name</th><th>What it covers</th><th style="width:210px">Owns</th></tr></thead><tbody>${layerRows}</tbody></table></div>
</div></section>

<section id="archetypes"><div class="wrap">
  <div class="prose"><span class="snum">Section 3 — Taxonomy</span>
  <h2>Ten shapes, and what each one adds</h2>
  <p class="lede">The archetype vocabulary is owned by the assurance catalog and pinned here, so the two catalogs join on the same ten shapes.</p>
  <p>Boundaries are drawn by two questions only — who owns control flow, and what the output touches. Not by domain, sector or model size, because those do not change what you have to build. Every shape owes the <strong>core</strong> block in full; the count on each row is what is genuinely <em>new</em> about that shape, which is why this is ${data.caps.length} capabilities and not several hundred.</p></div>
  <div class="arch-list" id="arch-list"></div>
</div></section>

<section id="axes"><div class="wrap">
  <div class="prose"><span class="snum">Section 4 — Construction axes</span>
  <h2>Where it lives, and who supplies it</h2>
  <p class="lede">Deliberately not the assurance catalog's axes. That one organises by mechanism and stage — verification axes. This one organises by position and approach.</p>
  <p><strong>Position is this catalog's spine.</strong> It is the axis architects actually argue about, and the same capability at a different position is a different system: a budget enforced in the loop and a budget enforced at the gateway catch different failures and miss different ones. On every capability, the first position listed is primary; the rest are backstops.</p></div>
  <div class="tbl-scroll"><table><thead><tr><th style="width:74px">Code</th><th style="width:170px">Position</th><th>What it can see, and what it cannot stop</th></tr></thead><tbody>${posRows}</tbody></table></div>
  <div class="prose"><p><strong>Approach</strong> answers who supplies the machinery. Five of the six are the assurance catalog's vocabulary, kept identical so an adopter filters both catalogs the same way. <code>framework</code> is the one deliberate addition: “adopt an agent framework or build the loop” is the defining harness question and has no assurance-side equivalent.</p></div>
  <div class="tbl-scroll"><table><thead><tr><th style="width:110px">Code</th><th style="width:190px">Approach</th><th>What you get, and what you inherit</th></tr></thead><tbody>${apRows}</tbody></table></div>
  <div class="prose"><p>Levels follow RFC 2119 usage and bind only within an adopting organisation.</p></div>
  <div class="tbl-scroll"><table><thead><tr><th style="width:110px">Level</th><th>Meaning</th></tr></thead><tbody>${levelRows}</tbody></table></div>
  <div class="note"><span class="tag">The threshold boundary</span>
  <p>Sharpest line in the catalog. <em>“A token budget is enforced by the assembly function and its application is recorded”</em> — a capability. <em>“The token budget is 100,000”</em> — never. The number belongs to the adopting organisation, and any value published here would be wrong for almost everyone.</p></div>
</div></section>

<section id="ports"><div class="wrap">
  <div class="prose"><span class="snum">Section 5 — The seams</span>
  <h2>Where the harness meets what it does not own</h2>
  <p class="lede">A capability says what must exist. A port says where the harness meets something it did not build, and what must hold across that meeting whoever implements it.</p>
  <p>The catalog is portable because it names no products, and the cost of that is a gap: a reader agrees that every model call needs one choke point and still has to invent the boundary between their code and a provider's library — and everyone invents a different one. Ports are that missing vocabulary, declared as data so an interface can be generated in any language without this repository ever shipping a package.</p>
  <p><strong>A port is not a partition of the catalog.</strong> Most capabilities are structural and cross no seam at all. Two fields carry the weight: <code>kernel_owns</code>, which states what stays on the harness side and is therefore not an implementation's to decide — a seam with nothing on the harness side is a client library, and the linter fails the build for it — and the <em>substitution test</em>, which is how you tell a port from one vendor's API with a wrapper on it.</p></div>
  <dl class="meta-grid">
    <div><dt>Ports</dt><dd id="m-ports">—</dd></div>
    <div><dt>Core — every harness</dt><dd id="p-core">—</dd></div>
    <div><dt>Capabilities crossing a seam</dt><dd id="p-served">—</dd></div>
    <div><dt>Structural, no seam</dt><dd id="p-structural">—</dd></div>
  </dl>
  <div class="ports" id="ports-out"></div>
  <div class="prose"><p style="font-size:15px;color:var(--ink-3)">Operations are stated by intent, never by signature — no types, no language, no error taxonomy. Those belong to a generated interface, which is downstream of this catalog. A trailing <code>?</code> marks an operation an implementation may legitimately not offer, in which case the harness needs a declared path for its absence.</p></div>
</div></section>

<section id="catalog"><div class="wrap">
  <div class="prose"><span class="snum">Section 6 — The catalog</span>
  <h2>Capabilities, in plain English</h2>
  <p class="lede">Select a shape. Core is always owed; the archetype block is what that shape adds on top.</p>
  <p>Each entry states what must exist, what breaks without it, where it can live, the obligations it makes verifiable, and — behind the disclosure — the decisions whoever builds it is forced to make.</p></div>
  <div class="controls">
    <div class="tabs" id="tabs" role="tablist" aria-label="Archetype"></div>
    <div class="filterbar">
      <input type="search" id="q" placeholder="Filter by keyword, identifier or obligation…" aria-label="Filter capabilities">
      <select id="layersel" aria-label="Filter by harness layer"></select>
      <label><input type="checkbox" id="mustonly"> MUST only</label>
      <label><input type="checkbox" id="ddonly"> Has design decisions</label>
      <span class="count" id="count"></span>
    </div>
  </div>
  <div id="catalog-out"></div>
</div></section>

<section id="matrix"><div class="wrap">
  <div class="prose"><span class="snum">Section 7 — Coverage matrix</span>
  <h2>Which shapes need which layers</h2>
  <p class="lede">Archetype deltas only; the core row is listed separately since it would otherwise appear in every column.</p>
  <p>Read this as a design-review heat map. A dense cell is where that shape's harness work actually is. An empty cell for a layer you know you need means either the classification is wrong, or the requirement was already covered by core.</p></div>
  <div class="matrix" id="matrix"></div>
</div></section>

<section id="join"><div class="wrap">
  <div class="prose"><span class="snum">Section 8 — The join</span>
  <h2>Read from the assurance side</h2>
  <p class="lede">The same relation inverted: for each assurance obligation, what has to exist before anyone can check it.</p>
  <p>This is the table that makes the pair useful at design review. An obligation with several capabilities behind it is one where the test is cheap and the construction is not. The join is also a completeness check in both directions — an obligation no capability discharges is a hole here, and a capability citing nothing is a component with no stated assurance consequence.</p></div>
  <dl class="meta-grid">
    <div><dt>Obligations reached</dt><dd id="j-obs">—</dd></div>
    <div><dt>Discharge references</dt><dd id="j-refs">—</dd></div>
    <div><dt>Capabilities citing none</dt><dd id="j-orphans">—</dd></div>
  </dl>
  <div id="joinbar"></div>
  <div class="tbl-scroll" id="jointbl"></div>
  <div class="prose"><p style="font-size:15px;color:var(--ink-3)">Obligation identifiers link to the assurance catalog's source. They are owned there, permanent, and stable in both directions.</p></div>
</div></section>

<section id="using"><div class="wrap prose">
  <span class="snum">Section 9 — Using it</span>
  <h2>Turning the catalog into an architecture</h2>
  <ul class="plain">
    <li><strong>Classify the system.</strong> Decompose it into archetypes — most real systems are two or three. The classification is the assumption everything else rests on, and the thing most likely to be wrong.</li>
    <li><strong>Take the union.</strong> Core, plus the deltas for each shape present. That list is the harness you owe, before anyone has argued about a framework.</li>
    <li><strong>Pick a position for each.</strong> Loop, gateway, tool boundary, state store. This is where the real architecture argument lives, and writing the answer down is most of the value of the catalog.</li>
    <li><strong>Answer the design decisions.</strong> Each capability names the tensions its builder cannot avoid. An unanswered one is not neutral — it gets answered by default, usually by whichever framework was adopted first.</li>
    <li><strong>Record what you will not build.</strong> A skipped MUST becomes an explicit accepted risk with an owner and a review date. An honest gap beats a green diagram.</li>
    <li><strong>Cite identifiers in code.</strong> One identifier in one place — a module docstring, an architecture decision record, a review checklist. That costs nothing and requires no buy-in to the rest of the catalog.</li>
  </ul>
  <pre># <b>AHC-0004</b> — all model calls route through this client, nothing constructs a
# provider SDK directly. See docs/adr/0012-model-client.md
class ModelClient: ...</pre>
  <p>Identifiers are flat and permanent. Layer, position and archetype are metadata on a capability, never part of its identity — so re-tagging never breaks a citation, nothing is ever deleted, and renumbering is never correct.</p>
</div></section>

<section id="roadmap"><div class="wrap">
  <div class="prose"><span class="snum">Section 10 — Roadmap</span>
  <h2>What is normative today, and what comes next</h2>
  <p class="lede">The normative catalog is complete. What remains is the physical half — how each capability actually gets built, and skeletons to copy.</p></div>
  <div class="phases">
    <div class="phase"><span class="pid">Phase 0</span><span class="pbody">Taxonomy, schema, and a linter carrying both boundary rules.</span><span class="pstate done">done</span></div>
    <div class="phase"><span class="pid">Phase 1</span><span class="pbody">The core layer — the capabilities every shape owes regardless of architecture.</span><span class="pstate done">done</span></div>
    <div class="phase"><span class="pid">Phase 2</span><span class="pbody">Archetype deltas for all ten shapes — what is genuinely new about each.</span><span class="pstate done">done</span></div>
    <div class="phase"><span class="pid">Phase 3</span><span class="pbody">Blueprints — requirements, architecture and design assembled per archetype into ten pages.</span><span class="pstate todo">next</span></div>
    <div class="phase"><span class="pid">Phase 4</span><span class="pbody">Realizations — how each capability gets built, authored in one dated pass. The only layer where products may be named.</span><span class="pstate todo">planned</span></div>
    <div class="phase"><span class="pid">Phase 5</span><span class="pbody">Reference skeletons — three, one per control-flow tier. Copied, never imported.</span><span class="pstate todo">planned</span></div>
    <div class="phase"><span class="pid">Phase 6</span><span class="pbody">Bidirectional coverage against the assurance catalog — every obligation discharged, every capability cited.</span><span class="pstate done">done</span></div>
  </div>
  <div class="prose"><p>Phase 4 is deliberately last. Products rot faster than anything else in the catalog, and authoring them alongside each capability means writing them two or three times before the specification stabilises.</p></div>
</div></section>
</main>
<footer><div class="wrap prose">
  <p>AI Harness Catalog ${data.version} · ${data.caps.length} capabilities · ${tensions} design tensions · ${dischargeRefs} discharge references to ${obligations.size} obligations.<br>
  Generated from <code>capabilities/</code> — do not edit this page by hand.<br>
  Specification CC BY 4.0 · tooling Apache 2.0 · identifiers are stable and citable from architecture decision records and code.<br>
  Sibling: <a href="https://github.com/dataagentsai/ai-assurance-catalog">AI Assurance Catalog</a> · source: <a href="https://github.com/dataagentsai/ai-harness-catalog">github.com/dataagentsai/ai-harness-catalog</a></p>
</div></footer>
<script>window.__AHC__ = ${JSON.stringify(data)};</script>
<script>${CLIENT}</script>
</body></html>
`;

/*
 * Every getElementById in the client script must have matching markup. A
 * missing id is not cosmetic: the null deref throws before render() is ever
 * called, so the page shows its headings and no content at all. This has
 * happened once in the sibling repository; the check exists so it cannot
 * happen here.
 */
{
  const wanted = [...CLIENT.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
  const missing = [...new Set(wanted)].filter((id) => !html.includes(`id="${id}"`));
  if (missing.length) {
    console.error(`render: client script looks up ids with no markup: ${missing.join(", ")}`);
    process.exit(1);
  }
}

fs.mkdirSync(path.join(ROOT, "site"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "site", "index.html"), html);
console.log(
  `rendered ${data.caps.length} capabilities -> site/index.html (${(html.length / 1024).toFixed(0)} KB)`
);
