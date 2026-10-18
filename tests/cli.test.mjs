import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
function run(args) {
  return spawnSync(process.execPath, ["cli.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
  });
}
test("separate-process CLI can create, play, reload and export a run", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "byoc-")),
    save = path.join(dir, "save.json");
  try {
    let r = run([
      "new",
      "examples/last-lantern.json",
      "examples/rowan.json",
      save,
    ]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).revision, 0);
    assert.equal(
      run(["new", "examples/last-lantern.json", "examples/rowan.json", save])
        .status,
      1,
    );
    r = run(["act", save, "check", "mind", "I grow a bridge."]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).revision, 1);
    r = run(["look", save]);
    assert.equal(JSON.parse(r.stdout).previousStat, "mind");
    assert.equal(run(["act", save, "check", "mind", "Repeat."]).status, 1);
    assert.match(run(["log", save]).stdout, /I grow a bridge/);
    assert.equal(run(["validate", save]).status, 0);
    fs.writeFileSync(save + ".lock", "held");
    assert.equal(run(["act", save, "quit"]).status, 1);
    assert.ok(fs.existsSync(save + ".lock"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
