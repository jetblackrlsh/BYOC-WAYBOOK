// Optional DOM simulation, not a visual-browser claim.
// npm install --no-save --ignore-scripts jsdom@26.1.0
// node tools/dom-smoke.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const { JSDOM, VirtualConsole } = await import(
  process.env.BYOC_JSDOM_MODULE || "jsdom"
);
const root = path.resolve(import.meta.dirname, ".."),
  errors = [],
  vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push(e.message));
const dom = await JSDOM.fromFile(path.join(root, "START.html"), {
  runScripts: "dangerously",
  resources: "usable",
  virtualConsole: vc,
  beforeParse(w) {
    w.structuredClone = structuredClone;
    Object.defineProperty(w, "crypto", { value: globalThis.crypto });
  },
});
await new Promise((resolve) =>
  dom.window.addEventListener("load", resolve, { once: true }),
);
const w = dom.window,
  d = w.document,
  $ = (id) => d.getElementById(id);
assert.equal(errors.length, 0, errors.join("\n"));
assert.equal($("assignment").options.length, 12);
$("name").value = "<img src=x onerror=alert(1)>";
$("personality").value = "villainous";
$("start").click();
assert.equal($("game").hidden, false);
assert.match($("prompt").textContent, /council offers a fortune/);
assert.ok(!$("prompt").textContent.includes("people who need your help"));
assert.equal(d.querySelectorAll("img").length, 0);
$("stat").value = "mind";
$("approach").value = "I grow a wooden crossing.";
$("turn").dispatchEvent(
  new w.Event("submit", { bubbles: true, cancelable: true }),
);
assert.match($("result").textContent, /I grow a wooden crossing/);
assert.ok(![...$("stat").options].some((o) => o.value === "mind"));
assert.match($("storage").textContent, /export your save/i);
$("command").value = "look";
$("console").dispatchEvent(
  new w.Event("submit", { bubbles: true, cancelable: true }),
);
assert.equal(JSON.parse($("output").textContent).revision, 1);
$("quit").click();
assert.match($("status").textContent, /QUIT/);
$("retry").click();
assert.match($("status").textContent, /PLAYING/);
assert.match($("revision").textContent, /Attempt 2/);
assert.equal(errors.length, 0, errors.join("\n"));
console.log(
  "DOM smoke passed: startup, character creation, personality isolation, text safety, roll, stat lockout, autosave fallback, console, quit and checkpoint retry.",
);
w.close();
