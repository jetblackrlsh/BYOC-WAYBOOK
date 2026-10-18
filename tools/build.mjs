import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const code = fs.readFileSync(path.join(root, "src/engine.mjs"), "utf8");
const names = [...code.matchAll(/export function (\w+)/g)]
  .map((m) => m[1])
  .concat(["STATS", "PERSONALITIES", "VERSION"]);
const example = JSON.parse(
  fs.readFileSync(path.join(root, "examples/last-lantern.json"), "utf8"),
);
const character = JSON.parse(
  fs.readFileSync(path.join(root, "examples/rowan.json"), "utf8"),
);
fs.writeFileSync(
  path.join(root, "engine.js"),
  '"use strict";\n(()=>{\n' +
    code.replaceAll("export ", "") +
    "\nwindow.BYOC={" +
    names.join(",") +
    "};\n})();\n",
);
fs.writeFileSync(
  path.join(root, "example.js"),
  "window.BYOC_EXAMPLE=" +
    JSON.stringify(example) +
    ";\nwindow.BYOC_CHARACTER=" +
    JSON.stringify(character) +
    ";\n",
);
console.log("Built classic offline engine and example data.");
