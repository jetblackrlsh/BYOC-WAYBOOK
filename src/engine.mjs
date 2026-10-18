// Shared browser/headless BYOC engine. No dependencies, network, or executable content.
export const STATS = ["mind", "body", "special"],
  PERSONALITIES = ["heroic", "villainous", "chaotic"],
  VERSION = 1;
const clone = (x) => JSON.parse(JSON.stringify(x));
const fail = (m) => {
  throw new Error(m);
};
const obj = (x) => x && typeof x === "object" && !Array.isArray(x);
const str = (x, n = 4000) =>
  typeof x === "string" && x.trim().length > 0 && x.length <= n;
const id = (x) =>
  typeof x === "string" &&
  /^[a-zA-Z0-9_-]{1,80}$/.test(x) &&
  !["__proto__", "constructor", "prototype"].includes(x);
const int = (x, a, b) => Number.isSafeInteger(x) && x >= a && x <= b;
function keys(x, req, opt = []) {
  if (
    !obj(x) ||
    req.some((k) => !Object.hasOwn(x, k)) ||
    Object.keys(x).some((k) => !req.includes(k) && !opt.includes(k))
  )
    fail("Invalid fields: " + req.join(", "));
}
export function canonical(x) {
  return Array.isArray(x)
    ? "[" + x.map(canonical).join(",") + "]"
    : obj(x)
      ? "{" +
        Object.keys(x)
          .sort()
          .map((k) => JSON.stringify(k) + ":" + canonical(x[k]))
          .join(",") +
        "}"
      : JSON.stringify(x);
}
export function validateCharacter(c) {
  keys(c, ["schema", "version", "name", "concept", "personality", "stats"]);
  if (
    c.schema !== "BYOCCharacter" ||
    c.version !== 1 ||
    !str(c.name, 100) ||
    !str(c.concept, 2000) ||
    !PERSONALITIES.includes(c.personality)
  )
    fail("Invalid character");
  keys(c.stats, STATS);
  if (
    !["0,0,2", "0,1,1", "-1,1,2"].includes(
      STATS.map((k) => c.stats[k])
        .sort((a, b) => a - b)
        .join(","),
    )
  )
    fail("Use a Specialist, Balanced or Wildcard assignment");
  if (STATS.some((k) => !Number.isInteger(c.stats[k])))
    fail("Stats must be integers");
  return c;
}
export function createCharacter({ name, concept, personality, stats }) {
  return validateCharacter({
    schema: "BYOCCharacter",
    version: 1,
    name,
    concept,
    personality,
    stats: clone(stats),
  });
}
export function assignments() {
  const out = [];
  for (const [name, v] of [
    ["Specialist", [2, 0, 0]],
    ["Balanced", [1, 1, 0]],
    ["Wildcard", [2, 1, -1]],
  ]) {
    const seen = new Set();
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++)
        if (a !== b) {
          const stats = { mind: v[a], body: v[b], special: v[3 - a - b] },
            key = canonical(stats);
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ name, stats });
          }
        }
  }
  return out;
}
function grants(gs, a) {
  if (!Array.isArray(gs) || gs.length > 20) fail("Invalid grants");
  for (const g of gs) {
    keys(g, ["id"], ["repeatable"]);
    if (
      !a.circumstances.some((d) => d.id === g.id) ||
      (g.repeatable !== undefined && typeof g.repeatable !== "boolean")
    )
      fail("Invalid grant");
  }
}
function outcome(o, a) {
  keys(o, ["text", "next"], ["grants", "items"]);
  if (
    !str(o.text) ||
    (!["WIN", "GAME_OVER"].includes(o.next) &&
      !a.sections.some((s) => s.id === o.next))
  )
    fail("Invalid outcome destination");
  if (o.grants) grants(o.grants, a);
  if (o.items) {
    keys(o.items, [], ["add", "remove"]);
    for (const k of ["add", "remove"])
      if (
        o.items[k] !== undefined &&
        (!Array.isArray(o.items[k]) ||
          o.items[k].length > 100 ||
          o.items[k].some((x) => !str(x, 100)))
      )
        fail("Invalid items");
  }
}
export function validateAdventure(a) {
  keys(
    a,
    [
      "schema",
      "version",
      "id",
      "title",
      "introduction",
      "start",
      "circumstances",
      "sections",
    ],
    ["author", "continuationOf"],
  );
  if (
    a.schema !== "BYOCAdventure" ||
    a.version !== 1 ||
    !id(a.id) ||
    !str(a.title, 200) ||
    !str(a.introduction, 12000) ||
    !id(a.start) ||
    (a.author !== undefined && !str(a.author, 200))
  )
    fail("Invalid adventure header");
  if (a.continuationOf !== undefined && !id(a.continuationOf))
    fail("Invalid sequel identity");
  if (
    !Array.isArray(a.sections) ||
    !a.sections.length ||
    a.sections.length > 1000 ||
    new Set(a.sections.map((s) => s.id)).size !== a.sections.length
  )
    fail("Invalid or duplicate sections");
  if (
    !Array.isArray(a.circumstances) ||
    a.circumstances.length > 200 ||
    new Set(a.circumstances.map((d) => d.id)).size !== a.circumstances.length
  )
    fail("Invalid circumstances");
  for (const d of a.circumstances) {
    keys(d, ["id", "name", "stat", "modifier", "duration"]);
    if (
      !id(d.id) ||
      !str(d.name, 200) ||
      ![...STATS, "all"].includes(d.stat) ||
      !int(d.modifier, -20, 20) ||
      !int(d.duration, 1, 1000)
    )
      fail("Invalid circumstance");
  }
  for (const s of a.sections) {
    keys(
      s,
      ["id", "title", "prompts", "obstacle", "success", "failure"],
      ["grants", "checkpoint", "fatal", "finale"],
    );
    if (
      !id(s.id) ||
      ["WIN", "GAME_OVER"].includes(s.id) ||
      !str(s.title, 200) ||
      !str(s.obstacle, 12000)
    )
      fail("Invalid section");
    keys(s.prompts, PERSONALITIES);
    if (PERSONALITIES.some((p) => !str(s.prompts[p], 12000)))
      fail("Each personality requires its prompt");
    for (const k of ["checkpoint", "fatal", "finale"])
      if (s[k] !== undefined && typeof s[k] !== "boolean") fail("Invalid flag");
    if (s.grants) grants(s.grants, a);
    outcome(s.success, a);
    outcome(s.failure, a);
    if (s.fatal && s.failure.next !== "GAME_OVER")
      fail("Fatal failure must end the attempt");
    if (s.finale && s.success.next !== "WIN") fail("Finale success must win");
  }
  if (!a.sections.some((s) => s.id === a.start)) fail("Missing start");
  const seen = new Set(),
    queue = [a.start];
  let win = false;
  while (queue.length) {
    const k = queue.pop();
    if (k === "WIN") {
      win = true;
      continue;
    }
    if (k === "GAME_OVER" || seen.has(k)) continue;
    seen.add(k);
    const s = a.sections.find((s) => s.id === k);
    queue.push(s.success.next, s.failure.next);
  }
  if (!win) fail("No reachable victory");
  return {
    warnings: a.sections
      .filter((s) => !seen.has(s.id))
      .map((s) => "Unreachable section: " + s.id),
  };
}
export function freshRandom() {
  if (!globalThis.crypto?.getRandomValues)
    fail("Secure random generation unavailable");
  const v = new Uint32Array(1024);
  globalThis.crypto.getRandomValues(v);
  return { kind: "secure-tape", values: Array.from(v), cursor: 0, draws: 0 };
}
function validateRandom(r) {
  keys(r, ["kind", "values", "cursor", "draws"]);
  if (
    !["secure-tape", "replay"].includes(r.kind) ||
    !Array.isArray(r.values) ||
    r.values.length > 100000 ||
    r.values.some((v) => !int(v, 0, 4294967295)) ||
    !int(r.cursor, 0, r.values.length) ||
    !int(r.draws, 0, 10000000)
  )
    fail("Invalid random state");
}
export function replayRandom(values) {
  const r = { kind: "replay", values: [...values], cursor: 0, draws: 0 };
  validateRandom(r);
  return r;
}
function d6(r) {
  for (let i = 0; i < 10000; i++) {
    if (r.cursor >= r.values.length) {
      if (r.kind === "replay") fail("Replay entropy exhausted");
      const n = freshRandom();
      r.values = n.values;
      r.cursor = 0;
    }
    const v = r.values[r.cursor++];
    r.draws++;
    if (v < 4294967292) return (v % 6) + 1;
  }
  fail("Entropy rejection limit");
}
function log(s, e) {
  s.log.push({ sequence: s.log.length + 1, attempt: s.attempt, ...e });
}
function grant(s, g, key, after) {
  if (s.granted.includes(key) && !g.repeatable) return;
  if (!s.granted.includes(key)) s.granted.push(key);
  const d = s.adventure.circumstances.find((d) => d.id === g.id),
    starts = s.visit + Number(after),
    c = { id: d.id, starts, expires: starts + d.duration - 1 };
  s.circumstances = s.circumstances.filter((c) => c.id !== d.id);
  s.circumstances.push(c);
  log(s, {
    type: "circumstance",
    id: d.id,
    name: d.name,
    starts: c.starts,
    expires: c.expires,
  });
}
const SNAP = [
  "sectionId",
  "visit",
  "previousStat",
  "circumstances",
  "granted",
  "items",
];
function snapshot(s) {
  return Object.fromEntries(SNAP.map((k) => [k, clone(s[k])]));
}
function enter(s, node) {
  s.sectionId = node;
  s.visit++;
  s.circumstances = s.circumstances.filter((c) => c.expires >= s.visit);
  const n = s.adventure.sections.find((n) => n.id === node);
  log(s, {
    type: "section",
    id: node,
    visit: s.visit,
    title: n.title,
    prompt: n.prompts[s.character.personality],
    obstacle: n.obstacle,
  });
  (n.grants ?? []).forEach((g, i) => grant(s, g, node + ":enter:" + i, false));
  if (n.checkpoint) {
    s.checkpoint = snapshot(s);
    log(s, { type: "checkpoint", sectionId: node });
  }
}
export function newSession(
  adventure,
  character,
  { random = freshRandom() } = {},
) {
  validateAdventure(adventure);
  validateCharacter(character);
  validateRandom(random);
  const s = {
    schema: "BYOCSession",
    version: 1,
    adventure: clone(adventure),
    character: clone(character),
    revision: 0,
    attempt: 1,
    status: "playing",
    sectionId: adventure.start,
    visit: 0,
    previousStat: null,
    circumstances: [],
    granted: [],
    items: [],
    checkpoint: null,
    random: clone(random),
    log: [],
    receipts: [],
  };
  log(s, {
    type: "start",
    title: adventure.title,
    character: character.name,
    introduction: adventure.introduction,
  });
  enter(s, adventure.start);
  return validateSession(s);
}
function validateSnapshot(s, x) {
  keys(x, SNAP);
  if (
    !s.adventure.sections.some((n) => n.id === x.sectionId) ||
    !int(x.visit, 1, 100000) ||
    !(x.previousStat === null || STATS.includes(x.previousStat))
  )
    fail("Invalid progress");
  if (
    !Array.isArray(x.circumstances) ||
    x.circumstances.length > 200 ||
    new Set(x.circumstances.map((c) => c.id)).size !== x.circumstances.length
  )
    fail("Invalid active circumstances");
  for (const c of x.circumstances) {
    keys(c, ["id", "starts", "expires"]);
    if (
      !s.adventure.circumstances.some((d) => d.id === c.id) ||
      !int(c.starts, 1, 100001) ||
      !int(c.expires, c.starts, 101000) ||
      c.starts > x.visit + 1
    )
      fail("Invalid circumstance timing");
  }
  if (
    !Array.isArray(x.granted) ||
    x.granted.length > 60000 ||
    new Set(x.granted).size !== x.granted.length ||
    x.granted.some((k) => !str(k, 120))
  )
    fail("Invalid grants history");
  if (
    !Array.isArray(x.items) ||
    x.items.length > 1000 ||
    new Set(x.items).size !== x.items.length ||
    x.items.some((k) => !str(k, 100))
  )
    fail("Invalid inventory");
}
export function validateSession(s) {
  keys(s, [
    "schema",
    "version",
    "adventure",
    "character",
    "revision",
    "attempt",
    "status",
    "sectionId",
    "visit",
    "previousStat",
    "circumstances",
    "granted",
    "items",
    "checkpoint",
    "random",
    "log",
    "receipts",
  ]);
  if (
    s.schema !== "BYOCSession" ||
    s.version !== 1 ||
    !int(s.revision, 0, 100000) ||
    !int(s.attempt, 1, 100000) ||
    !["playing", "won", "lost", "quit"].includes(s.status)
  )
    fail("Invalid session");
  validateAdventure(s.adventure);
  validateCharacter(s.character);
  validateSnapshot(s, snapshot(s));
  validateRandom(s.random);
  if (s.checkpoint !== null) validateSnapshot(s, s.checkpoint);
  if (
    !Array.isArray(s.log) ||
    s.log.length > 100000 ||
    s.log.some(
      (e, i) =>
        !obj(e) ||
        e.sequence !== i + 1 ||
        !int(e.attempt, 1, s.attempt) ||
        !str(e.type, 60),
    )
  )
    fail("Invalid log");
  if (
    !Array.isArray(s.receipts) ||
    s.receipts.length !== s.revision ||
    new Set(s.receipts.map((r) => r.id)).size !== s.receipts.length
  )
    fail("Invalid receipts");
  for (const r of s.receipts) {
    keys(r, ["id", "command"]);
    if (!id(r.id) || !str(r.command, 16000)) fail("Invalid receipt");
  }
  return s;
}
export function observe(s) {
  validateSession(s);
  const n = s.adventure.sections.find((n) => n.id === s.sectionId);
  const conditions = s.circumstances
    .filter((c) => c.starts <= s.visit && c.expires >= s.visit)
    .map((c) => ({
      ...clone(s.adventure.circumstances.find((d) => d.id === c.id)),
      remaining: c.expires - s.visit + 1,
    }));
  return {
    revision: s.revision,
    attempt: s.attempt,
    status: s.status,
    title: s.adventure.title,
    character: clone(s.character),
    section: {
      id: n.id,
      title: n.title,
      prompt: n.prompts[s.character.personality],
      obstacle: n.obstacle,
    },
    previousStat: s.previousStat,
    legalStats:
      s.status === "playing" ? STATS.filter((k) => k !== s.previousStat) : [],
    circumstances: conditions,
    items: [...s.items],
    checkpoint: s.checkpoint?.sectionId ?? null,
    options:
      s.status === "playing"
        ? ["check", "quit"]
        : [
            "restart",
            ...(s.checkpoint ? ["retry"] : []),
            ...(s.status !== "quit" ? ["quit"] : []),
          ],
    lastResult: [...s.log].reverse().find((e) => e.type === "check") ?? null,
  };
}
export function dispatch(state, command, { randomFactory = freshRandom } = {}) {
  validateSession(state);
  keys(command, ["id", "expectedRevision", "type"], ["stat", "approach"]);
  if (
    !id(command.id) ||
    !int(command.expectedRevision, 0, 100000) ||
    !["check", "retry", "restart", "quit"].includes(command.type)
  )
    fail("Invalid command");
  const signature = canonical(command),
    old = state.receipts.find((r) => r.id === command.id);
  if (old) {
    if (old.command !== signature) fail("Conflicting command ID");
    return clone(state);
  }
  if (command.expectedRevision !== state.revision)
    fail("Stale revision; observe again");
  if (command.type === "check") {
    if (
      state.status !== "playing" ||
      !STATS.includes(command.stat) ||
      command.stat === state.previousStat ||
      !str(command.approach, 8000)
    )
      fail("Choose an available stat and describe your approach");
  } else {
    if (command.stat !== undefined || command.approach !== undefined)
      fail("Unexpected check fields");
    if (command.type === "quit" && state.status === "quit")
      fail("Already quit");
    if (
      ["retry", "restart"].includes(command.type) &&
      state.status === "playing"
    )
      fail("Quit or finish this attempt first");
    if (command.type === "retry" && !state.checkpoint) fail("No checkpoint");
  }
  const s = clone(state);
  if (command.type === "check") {
    const n = s.adventure.sections.find((n) => n.id === s.sectionId),
      stat = command.stat;
    const cs = s.circumstances
      .filter((c) => c.starts <= s.visit && c.expires >= s.visit)
      .map((c) => s.adventure.circumstances.find((d) => d.id === c.id))
      .filter((d) => d.stat === stat || d.stat === "all");
    const rawModifier =
        s.character.stats[stat] + cs.reduce((n, d) => n + d.modifier, 0),
      modifier = Math.max(-2, Math.min(2, rawModifier)),
      die = d6(s.random),
      total = die + modifier,
      success = total >= 4,
      o = success ? n.success : n.failure;
    s.previousStat = stat;
    log(s, {
      type: "check",
      sectionId: n.id,
      visit: s.visit,
      stat,
      approach: command.approach,
      die,
      rawModifier,
      modifier,
      total,
      success,
      circumstances: cs.map((d) => d.id),
      text: o.text,
    });
    (o.grants ?? []).forEach((g, i) =>
      grant(
        s,
        g,
        n.id + ":" + (success ? "success" : "failure") + ":" + i,
        true,
      ),
    );
    for (const item of o.items?.remove ?? [])
      s.items = s.items.filter((x) => x !== item);
    for (const item of o.items?.add ?? [])
      if (!s.items.includes(item)) s.items.push(item);
    if (o.next === "WIN" || o.next === "GAME_OVER") {
      s.status = o.next === "WIN" ? "won" : "lost";
      log(s, { type: s.status });
    } else enter(s, o.next);
  } else if (command.type === "quit") {
    s.status = "quit";
    log(s, { type: "quit" });
  } else {
    const r = randomFactory();
    validateRandom(r);
    s.random = clone(r);
    s.attempt++;
    log(s, { type: command.type, fromAttempt: s.attempt - 1 });
    s.status = "playing";
    if (command.type === "retry") {
      Object.assign(s, clone(s.checkpoint));
      log(s, {
        type: "checkpoint-restored",
        sectionId: s.sectionId,
        visit: s.visit,
      });
    } else {
      s.sectionId = s.adventure.start;
      s.visit = 0;
      s.previousStat = null;
      s.circumstances = [];
      s.granted = [];
      s.items = [];
      s.checkpoint = null;
      enter(s, s.adventure.start);
    }
  }
  s.revision++;
  s.receipts.push({ id: command.id, command: signature });
  return validateSession(s);
}
function checksum(t) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++)
    h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, "0");
}
export function exportSave(s) {
  validateSession(s);
  const payload = clone(s);
  return JSON.stringify(
    {
      schema: "BYOCSave",
      version: 1,
      checksum: checksum(canonical(payload)),
      payload,
    },
    null,
    2,
  );
}
export function importSave(t) {
  if (typeof t !== "string" || t.length > 20000000) fail("Save exceeds 20 MB");
  const e = JSON.parse(t);
  keys(e, ["schema", "version", "checksum", "payload"]);
  if (
    e.schema !== "BYOCSave" ||
    e.version !== 1 ||
    e.checksum !== checksum(canonical(e.payload))
  )
    fail("Unsupported or corrupted save");
  return clone(validateSession(e.payload));
}
export function exportLog(s) {
  validateSession(s);
  return {
    schema: "BYOCAdventureLog",
    version: 1,
    title: s.adventure.title,
    character: clone(s.character),
    events: clone(s.log),
  };
}
export function narrativeLog(s) {
  validateSession(s);
  return (
    "# " +
    s.adventure.title +
    "\n\n" +
    s.character.name +
    ": " +
    s.character.concept +
    "\n\n" +
    s.log
      .map((e) => {
        const p = "[Attempt " + e.attempt + "] ";
        if (e.type === "section")
          return p + e.title + "\n" + e.prompt + "\n" + e.obstacle;
        if (e.type === "check")
          return (
            p +
            e.approach +
            "\n" +
            e.stat +
            ": d6 " +
            e.die +
            ", modifier " +
            e.modifier +
            ", total " +
            e.total +
            ": " +
            (e.success ? "SUCCESS" : "FAILURE") +
            ".\n" +
            e.text
          );
        return p + e.type + (e.name ? " — " + e.name : "");
      })
      .join("\n\n")
  );
}

// Explicitly linked adventures may request selected carryover; ordinary newSession resets it.
export function newSequelSession(
  previous,
  adventure,
  {
    items = [],
    circumstances = [],
    previousStat = false,
    random = freshRandom(),
  } = {},
) {
  validateSession(previous);
  validateAdventure(adventure);
  if (previous.status === "playing")
    fail("Finish or quit the previous adventure first");
  if (adventure.continuationOf !== previous.adventure.id)
    fail("Adventure is not an explicit sequel");
  if (
    !Array.isArray(items) ||
    new Set(items).size !== items.length ||
    items.some((x) => !previous.items.includes(x))
  )
    fail("Invalid carried items");
  if (
    !Array.isArray(circumstances) ||
    new Set(circumstances).size !== circumstances.length ||
    typeof previousStat !== "boolean"
  )
    fail("Invalid carryover choices");
  const s = newSession(adventure, previous.character, { random });
  for (const key of circumstances) {
    const old = previous.circumstances.find((c) => c.id === key),
      definition = previous.adventure.circumstances.find((d) => d.id === key),
      next = adventure.circumstances.find((d) => d.id === key);
    if (!old || !next || canonical(definition) !== canonical(next))
      fail("Carried circumstance definition must match");
    const remaining = old.expires - previous.visit;
    if (remaining > 0) {
      s.circumstances = s.circumstances.filter((c) => c.id !== key);
      s.circumstances.push({ id: key, starts: 1, expires: remaining });
    }
  }
  s.items = [...new Set([...s.items, ...items])];
  if (previousStat) s.previousStat = previous.previousStat;
  if (s.checkpoint) s.checkpoint = snapshot(s);
  log(s, {
    type: "sequel",
    fromAdventure: previous.adventure.id,
    items: [...items],
    circumstances: [...circumstances],
    previousStat,
  });
  return validateSession(s);
}
