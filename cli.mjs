#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import * as E from "./src/engine.mjs";
const [action, ...args] = process.argv.slice(2);
const read = (p) => {
  if (fs.statSync(p).size > 20000000) throw Error("File exceeds 20 MB");
  return fs.readFileSync(p, "utf8");
};
function writeNew(file, data) {
  fs.writeFileSync(file, data, { flag: "wx" });
}
function change(file, fn) {
  const lock = file + ".lock";
  let fd;
  try {
    fd = fs.openSync(lock, "wx");
    const state = E.importSave(read(file)),
      next = fn(state),
      temp = file + ".pending";
    fs.writeFileSync(temp, E.exportSave(next), { flag: "wx" });
    fs.renameSync(temp, file);
    return next;
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
      fs.unlinkSync(lock);
    }
  }
}
try {
  let result;
  if (action === "new") {
    if (args.length !== 3)
      throw Error("new adventure.json character.json save.json");
    const s = E.newSession(
      JSON.parse(read(args[0])),
      JSON.parse(read(args[1])),
    );
    writeNew(args[2], E.exportSave(s));
    result = E.observe(s);
  } else if (action === "look") {
    result = E.observe(E.importSave(read(args[0])));
  } else if (action === "command") {
    if (args.length !== 2) throw Error("command save.json command.json");
    const c = JSON.parse(read(args[1]));
    result = E.observe(change(args[0], (s) => E.dispatch(s, c)));
  } else if (action === "act") {
    const [file, type, stat, ...words] = args;
    result = E.observe(
      change(file, (s) =>
        E.dispatch(s, {
          id: crypto.randomUUID(),
          expectedRevision: s.revision,
          type,
          ...(type === "check" ? { stat, approach: words.join(" ") } : {}),
        }),
      ),
    );
  } else if (action === "validate") {
    const a = JSON.parse(read(args[0]));
    result =
      a.schema === "BYOCCharacter"
        ? (E.validateCharacter(a), { valid: true })
        : a.schema === "BYOCAdventure"
          ? { valid: true, ...E.validateAdventure(a) }
          : (E.importSave(read(args[0])), { valid: true });
  } else if (action === "log") {
    const s = E.importSave(read(args[0]));
    if (args[1] === "--json") result = E.exportLog(s);
    else {
      console.log(E.narrativeLog(s));
      process.exit(0);
    }
  } else {
    console.log(
      "BYOC-WAYBOOK headless CLI\nnew adventure.json character.json save.json\nlook save.json\nact save.json check mind Describe your approach\nact save.json retry|restart|quit\ncommand save.json command.json\nvalidate file.json\nlog save.json [--json]",
    );
    process.exit(action ? 1 : 0);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exitCode = 1;
}
