import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as E from "../src/engine.mjs";
const adventure = JSON.parse(
  fs.readFileSync(new URL("../examples/last-lantern.json", import.meta.url)),
);
const character = JSON.parse(
  fs.readFileSync(new URL("../examples/rowan.json", import.meta.url)),
);
const copy = (x) => structuredClone(x);
const start = (values = [5, 5, 5, 5, 5]) =>
  E.newSession(adventure, character, { random: E.replayRandom(values) });
const act = (s, stat = "mind", approach = "I imagine a solution.") =>
  E.dispatch(s, {
    id: "c" + s.revision,
    expectedRevision: s.revision,
    type: "check",
    stat,
    approach,
  });
const cmd = (s, type) => ({
  id: "c" + s.revision,
  expectedRevision: s.revision,
  type,
});
test("all twelve standard stat permutations validate", () => {
  const xs = E.assignments();
  assert.equal(xs.length, 12);
  for (const x of xs) E.validateCharacter({ ...character, stats: x.stats });
  assert.throws(() =>
    E.validateCharacter({
      ...character,
      stats: { mind: 2, body: 2, special: 2 },
    }),
  );
});
for (const personality of E.PERSONALITIES)
  test("only " + personality + " prompt is exposed", () => {
    const s = E.newSession(
        adventure,
        { ...character, personality },
        { random: E.replayRandom([]) },
      ),
      v = E.observe(s);
    assert.equal(v.section.prompt, adventure.sections[0].prompts[personality]);
    for (const p of E.PERSONALITIES.filter((x) => x !== personality))
      assert.ok(!JSON.stringify(v).includes(adventure.sections[0].prompts[p]));
    assert.ok(
      !JSON.stringify(E.exportLog(s)).includes(
        adventure.sections[0].prompts[
          E.PERSONALITIES.find((p) => p !== personality)
        ],
      ),
    );
  });
test("success uses actual d6 and threshold four", () => {
  const s = act(start([2]));
  assert.equal(E.observe(s).lastResult.total, 4);
  assert.equal(s.sectionId, "bridge");
  assert.equal(s.previousStat, "mind");
});
test("failure also locks previous stat", () => {
  const s = act(start([0]));
  assert.equal(s.sectionId, "reeds");
  assert.throws(() => act(s, "mind"));
  assert.deepEqual(E.observe(s).legalStats, ["body", "special"]);
});
test("approach required but descriptions never affect arithmetic", () => {
  assert.throws(() => act(start(), "mind", " "));
  const a = act(start([2]), "mind", "I teleport across."),
    b = act(start([2]), "mind", "I count the stones.");
  assert.equal(E.observe(a).lastResult.total, E.observe(b).lastResult.total);
  assert.equal(a.sectionId, b.sectionId);
});
test("modifier cap includes base stat and all circumstances", () => {
  const a = copy(adventure);
  a.circumstances = [
    { id: "boost", name: "Big boost", stat: "all", modifier: 20, duration: 2 },
  ];
  a.sections.forEach((s) => {
    delete s.grants;
    delete s.success.grants;
    delete s.failure.grants;
  });
  a.sections[0].grants = [{ id: "boost" }];
  const s = act(E.newSession(a, character, { random: E.replayRandom([0]) }));
  assert.equal(E.observe(s).lastResult.rawModifier, 21);
  assert.equal(E.observe(s).lastResult.modifier, 2);
  assert.equal(E.observe(s).lastResult.success, false);
  a.circumstances[0].modifier = -20;
  const n = act(E.newSession(a, character, { random: E.replayRandom([5]) }));
  assert.equal(E.observe(n).lastResult.modifier, -2);
  assert.equal(E.observe(n).lastResult.success, true);
});
test("rejection sampling avoids modulo bias", () => {
  const s = act(start([4294967295, 5]));
  assert.equal(E.observe(s).lastResult.die, 6);
  assert.equal(s.random.draws, 2);
});
test("after-roll grant starts next section and expires by visits", () => {
  let s = act(start());
  assert.equal(
    E.observe(s).circumstances.find((c) => c.id === "chart").remaining,
    3,
  );
  s = act(s, "body");
  assert.equal(
    E.observe(s).circumstances.find((c) => c.id === "chart").remaining,
    2,
  );
  s = act(s, "special");
  assert.equal(
    E.observe(s).circumstances.find((c) => c.id === "chart").remaining,
    1,
  );
});
test("before-roll grant applies now and expires on revisits regardless of chosen stat", () => {
  const a = copy(adventure);
  a.sections[0].grants = [{ id: "chart" }];
  a.sections[0].success = { text: "Again.", next: "quay" };
  a.sections[0].failure = { text: "Again.", next: "quay" };
  // Keep a reachable win through the failure branch while exercising success revisits.
  a.sections[0].failure.next = "bridge";
  let s = E.newSession(a, character, { random: E.replayRandom([5, 5, 5, 5]) });
  assert.equal(E.observe(s).circumstances[0].remaining, 3);
  s = act(s, "body");
  s = act(s, "special");
  assert.equal(E.observe(s).circumstances[0].remaining, 1);
  s = act(s, "body");
  assert.equal(E.observe(s).circumstances.length, 0);
});
test("repeatable grants refresh without stacking copies", () => {
  const a = copy(adventure);
  a.sections[0].grants = [{ id: "chart", repeatable: true }];
  a.sections[0].success = { text: "Again.", next: "quay" };
  let s = E.newSession(a, character, { random: E.replayRandom([5, 5]) });
  s = act(s);
  assert.equal(s.circumstances.length, 1);
  assert.equal(E.observe(s).circumstances[0].remaining, 3);
});
test("exact command retry is idempotent and conflicting IDs reject", () => {
  const s = start(),
    c = {
      id: "once",
      expectedRevision: 0,
      type: "check",
      stat: "mind",
      approach: "Cross.",
    },
    next = E.dispatch(s, c);
  assert.deepEqual(E.dispatch(next, c), next);
  assert.throws(() => E.dispatch(next, { ...c, approach: "Changed." }));
  assert.throws(() => E.dispatch(next, { ...c, id: "new" }));
});
test("invalid commands leave caller state and randomness unchanged", () => {
  const s = start(),
    before = copy(s);
  assert.throws(() =>
    E.dispatch(s, {
      id: "bad",
      expectedRevision: 0,
      type: "check",
      stat: "luck",
      approach: "Try.",
    }),
  );
  assert.deepEqual(s, before);
});
test("save/resume preserves future rolls, history and content", () => {
  const s = act(start([5, 0]));
  const r = E.importSave(E.exportSave(s));
  assert.deepEqual(act(s, "body"), act(r, "body"));
  const e = JSON.parse(E.exportSave(s));
  e.payload.visit++;
  assert.throws(() => E.importSave(JSON.stringify(e)));
  e.version = 2;
  assert.throws(() => E.importSave(JSON.stringify(e)));
});
test("victory and fatal failure finish an attempt", () => {
  let s = start([5, 5, 5, 5]);
  for (const stat of ["mind", "body", "special", "mind"]) s = act(s, stat);
  assert.equal(s.status, "won");
  assert.throws(() => act(s, "body"));
  let f = start([5, 5, 5, 0]);
  for (const stat of ["mind", "body", "special", "mind"]) f = act(f, stat);
  assert.equal(f.status, "lost");
});
test("checkpoint retry restores progress and uses fresh random tape, preserving prior logs", () => {
  let s = start([5, 5, 5, 0]);
  for (const stat of ["mind", "body", "special", "mind"]) s = act(s, stat);
  const logs = s.log.length;
  const r = E.dispatch(s, cmd(s, "retry"), {
    randomFactory: () => E.replayRandom([4, 5]),
  });
  assert.equal(r.status, "playing");
  assert.equal(r.sectionId, "tower");
  assert.equal(r.previousStat, "body");
  assert.equal(r.attempt, 2);
  assert.deepEqual(r.random.values, [4, 5]);
  assert.ok(r.log.length > logs);
  assert.equal(r.revision, s.revision + 1);
});
test("restart clears circumstances/items/stat history and preserves previous attempt logs", () => {
  let s = act(start());
  s = E.dispatch(s, cmd(s, "quit"));
  const r = E.dispatch(s, cmd(s, "restart"), {
    randomFactory: () => E.replayRandom([1]),
  });
  assert.equal(r.previousStat, null);
  assert.equal(r.visit, 1);
  assert.equal(r.circumstances.length, 0);
  assert.equal(r.attempt, 2);
  assert.ok(r.log.some((e) => e.type === "quit"));
});
test("character reused in a new adventure starts without session state", () => {
  const c = copy(character);
  const s = act(start());
  const n = E.newSession(adventure, s.character, {
    random: E.replayRandom([]),
  });
  assert.equal(n.previousStat, null);
  assert.deepEqual(n.items, []);
  assert.deepEqual(n.character, c);
});
test("adventure rejects missing prompts, bad edges, scripts, no win, duplicate IDs and invalid fatal outcomes", () => {
  for (const change of [
    (a) => delete a.sections[0].prompts.heroic,
    (a) => (a.sections[0].success.next = "missing"),
    (a) => (a.sections[0].script = "alert(1)"),
    (a) =>
      a.sections.forEach((s) => {
        s.success.next = "GAME_OVER";
        delete s.finale;
      }),
    (a) => a.sections.push(copy(a.sections[0])),
    (a) => (a.sections[0].fatal = true),
  ]) {
    const a = copy(adventure);
    change(a);
    assert.throws(() => E.validateAdventure(a));
  }
});
test("readable and JSON logs preserve approaches and results", () => {
  const s = act(start(), "mind", "I weave a living bridge.");
  assert.match(E.narrativeLog(s), /I weave a living bridge/);
  assert.ok(
    E.exportLog(s).events.some((e) => e.type === "check" && e.die === 6),
  );
});
test("classic browser bundle matches the headless core", () => {
  const context = { window: {}, structuredClone, crypto: globalThis.crypto };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(new URL("../engine.js", import.meta.url), "utf8"),
    context,
  );
  const B = context.window.BYOC,
    s = B.newSession(adventure, character, { random: B.replayRandom([5]) });
  const result = B.dispatch(s, {
    id: "c0",
    expectedRevision: 0,
    type: "check",
    stat: "mind",
    approach: "I imagine a solution.",
  });
  assert.equal(JSON.stringify(result), JSON.stringify(act(start([5]))));
});
test("fresh secure randomness supplies valid independent tapes", () => {
  const a = E.freshRandom(),
    b = E.freshRandom();
  assert.equal(a.values.length, 1024);
  assert.notDeepEqual(a.values, b.values);
});
test("explicit sequel carries only requested compatible state", () => {
  let p = act(start());
  p = act(p, "body");
  p = E.dispatch(p, cmd(p, "quit"));
  const a = copy(adventure);
  a.id = "sequel";
  a.continuationOf = adventure.id;
  const s = E.newSequelSession(p, a, {
    items: ["Brass access token"],
    circumstances: ["chart"],
    previousStat: true,
    random: E.replayRandom([]),
  });
  assert.deepEqual(s.items, ["Brass access token"]);
  assert.equal(s.previousStat, "body");
  assert.equal(
    E.observe(s).circumstances.find((c) => c.id === "chart").remaining,
    1,
  );
  assert.throws(() => E.newSequelSession(p, adventure));
  const clean = E.newSequelSession(p, a, { random: E.replayRandom([]) });
  assert.equal(clean.previousStat, null);
  assert.deepEqual(clean.items, []);
});
test("all 216 assignment/stat/die combinations obey the same success formula", () => {
  let checked = 0;
  for (const assignment of E.assignments())
    for (const stat of E.STATS)
      for (let die = 1; die <= 6; die++) {
        const s = E.newSession(
          adventure,
          { ...character, stats: assignment.stats },
          { random: E.replayRandom([die - 1]) },
        );
        const next = act(s, stat),
          r = E.observe(next).lastResult,
          modifier = Math.max(-2, Math.min(2, assignment.stats[stat]));
        assert.equal(r.die, die);
        assert.equal(r.modifier, modifier);
        assert.equal(r.success, die + modifier >= 4);
        checked++;
      }
  assert.equal(checked, 216);
});
test("twenty varied bounded playthroughs remain valid through save/reload and retries", () => {
  for (let run = 0; run < 20; run++) {
    let s = E.newSession(
      adventure,
      {
        ...character,
        personality: E.PERSONALITIES[run % 3],
        stats: E.assignments()[run % 12].stats,
      },
      {
        random: E.replayRandom(
          Array.from({ length: 200 }, (_, i) => (i * 7 + run) % 6),
        ),
      },
    );
    for (let turn = 0; turn < 30; turn++) {
      const v = E.observe(s);
      if (s.status === "playing")
        s = act(
          s,
          v.legalStats[(turn + run) % v.legalStats.length],
          "I adapt my plan to the situation.",
        );
      else
        s = E.dispatch(s, cmd(s, s.checkpoint ? "retry" : "restart"), {
          randomFactory: () =>
            E.replayRandom(
              Array.from({ length: 200 }, (_, i) => (i + turn) % 6),
            ),
        });
      s = E.importSave(E.exportSave(s));
      E.validateSession(s);
    }
  }
});
test("quit without a checkpoint offers restart but no checkpoint retry", () => {
  const a = copy(adventure);
  a.sections.forEach((n) => delete n.checkpoint);
  let s = E.newSession(a, character, { random: E.replayRandom([]) });
  s = E.dispatch(s, cmd(s, "quit"));
  assert.ok(!E.observe(s).options.includes("retry"));
  assert.throws(() => E.dispatch(s, cmd(s, "retry")));
});
