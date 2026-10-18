"use strict";
(() => {
  const E = window.BYOC,
    $ = (id) => document.getElementById(id),
    list = E.assignments();
  let adventure = structuredClone(window.BYOC_EXAMPLE),
    session = null,
    fileKind = "save";
  function msg(t) {
    $("message").textContent = t;
  }
  function safe(fn) {
    return (...args) => {
      try {
        fn(...args);
      } catch (e) {
        msg(e.message);
      }
    };
  }
  function download(name, text, type = "application/json") {
    const blob = new Blob([text], { type }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function character() {
    return E.createCharacter({
      name: $("name").value.trim(),
      concept: $("concept").value.trim(),
      personality: $("personality").value,
      stats: list[Number($("assignment").value)].stats,
    });
  }
  function fillCharacter(c) {
    E.validateCharacter(c);
    $("name").value = c.name;
    $("concept").value = c.concept;
    $("personality").value = c.personality;
    $("assignment").value = String(
      list.findIndex((x) => E.canonical(x.stats) === E.canonical(c.stats)),
    );
  }
  list.forEach((a, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent =
      a.name +
      " — " +
      E.STATS.map(
        (k) => k + " " + (a.stats[k] >= 0 ? "+" : "") + a.stats[k],
      ).join(", ");
    $("assignment").append(o);
  });
  fillCharacter(window.BYOC_CHARACTER);
  function saveLocal() {
    try {
      localStorage.setItem("byoc-waybook-v1", E.exportSave(session));
      $("storage").textContent =
        "Local autosave updated. Export a save to keep a portable backup.";
    } catch {
      $("storage").textContent =
        "Local autosave unavailable or full. Please export your save.";
    }
  }
  function render() {
    $("adventureTitle").textContent = "Selected adventure: " + adventure.title;
    $("setup").hidden = !!session;
    $("game").hidden = !session;
    for (const id of ["save", "log", "jsonlog"]) $(id).disabled = !session;
    if (!session) return;
    const v = E.observe(session);
    $("status").textContent =
      v.character.name +
      " • " +
      v.character.personality +
      " • " +
      v.status.toUpperCase();
    $("revision").textContent =
      "Attempt " + v.attempt + " / revision " + v.revision;
    $("title").textContent = v.title;
    $("intro").textContent = session.adventure.introduction;
    $("sectionTitle").textContent = v.section.title;
    $("prompt").textContent = v.section.prompt;
    $("obstacle").textContent = v.section.obstacle;
    $("facts").textContent =
      "Stats: " +
      E.STATS.map((k) => k + " " + v.character.stats[k]).join(" | ") +
      "\nCircumstances: " +
      (v.circumstances
        .map(
          (c) =>
            c.name +
            " (" +
            c.stat +
            " " +
            c.modifier +
            ", " +
            c.remaining +
            " section visits left)",
        )
        .join("; ") || "none") +
      "\nStory items: " +
      (v.items.join(", ") || "none") +
      "\nCheckpoint: " +
      (v.checkpoint || "none");
    $("stat").replaceChildren();
    v.legalStats.forEach((k) => {
      const o = document.createElement("option");
      o.value = k;
      o.textContent = k;
      $("stat").append(o);
    });
    $("turn").hidden = v.status !== "playing";
    $("retry").hidden = !v.options.includes("retry");
    $("restart").hidden = !v.options.includes("restart");
    $("quit").hidden = !v.options.includes("quit");
    $("newCharacter").hidden = v.status === "playing";
    $("result").hidden = !v.lastResult;
    if (v.lastResult) {
      const r = v.lastResult;
      $("result").textContent =
        (r.success ? "SUCCESS" : "FAILURE") +
        " — " +
        r.stat +
        ": d6 " +
        r.die +
        " + modifier " +
        r.modifier +
        " = " +
        r.total +
        "\nYour approach: " +
        r.approach +
        "\n" +
        r.text;
    }
  }
  function act(type, extra = {}) {
    if (!session) throw Error("Begin or import an adventure first");
    const command = {
      id: "cmd-" + session.revision + "-" + crypto.randomUUID(),
      expectedRevision: session.revision,
      type,
      ...extra,
    };
    session = E.dispatch(session, command);
    saveLocal();
    render();
    msg("");
  }
  $("start").onclick = safe(() => {
    session = E.newSession(adventure, character());
    saveLocal();
    render();
    msg("Adventure started.");
  });
  $("turn").onsubmit = (e) => {
    e.preventDefault();
    safe(() => {
      act("check", {
        stat: $("stat").value,
        approach: $("approach").value.trim(),
      });
      $("approach").value = "";
    })();
  };
  for (const k of ["retry", "restart", "quit"])
    $(k).onclick = safe(() => act(k));
  $("newCharacter").onclick = () => {
    session = null;
    render();
    msg(
      "Your previous run remains in local autosave until you start a new one. Export first if you want to keep it.",
    );
  };
  $("save").onclick = safe(() =>
    download("byoc-save.json", E.exportSave(session)),
  );
  $("exportCharacter").onclick = safe(() =>
    download("byoc-character.json", JSON.stringify(character(), null, 2)),
  );
  $("log").onclick = safe(() =>
    download("byoc-adventure.txt", E.narrativeLog(session), "text/plain"),
  );
  $("jsonlog").onclick = safe(() =>
    download("byoc-log.json", JSON.stringify(E.exportLog(session), null, 2)),
  );
  $("resume").onclick = safe(() => {
    const t = localStorage.getItem("byoc-waybook-v1");
    if (!t) throw Error("No local autosave");
    session = E.importSave(t);
    adventure = session.adventure;
    render();
    msg("Resumed local autosave.");
  });
  for (const [button, kind] of [
    ["load", "save"],
    ["importAdventure", "adventure"],
    ["importCharacter", "character"],
  ])
    $(button).onclick = () => {
      fileKind = kind;
      $("file").value = "";
      $("file").click();
    };
  $("file").onchange = async () => {
    try {
      const f = $("file").files[0];
      if (!f) return;
      if (f.size > 20000000) throw Error("File limit is 20 MB");
      const t = await f.text();
      if (fileKind === "save") {
        session = E.importSave(t);
        adventure = session.adventure;
        saveLocal();
      } else if (fileKind === "adventure") {
        const a = JSON.parse(t);
        const check = E.validateAdventure(a);
        adventure = a;
        msg(check.warnings.join("\n"));
      } else fillCharacter(JSON.parse(t));
      render();
      if (fileKind !== "adventure") msg("Loaded " + f.name);
    } catch (e) {
      msg(e.message);
    }
  };
  $("example").onclick = () => {
    adventure = structuredClone(window.BYOC_EXAMPLE);
    render();
    msg("Example adventure selected.");
  };
  $("console").onsubmit = (e) => {
    e.preventDefault();
    safe(() => {
      const raw = $("command").value.trim(),
        parts = raw.split(/\s+/),
        cmd = parts.shift()?.toLowerCase();
      if (cmd === "look")
        $("output").textContent = JSON.stringify(
          session
            ? E.observe(session)
            : { message: "Create a character and begin an adventure." },
          null,
          2,
        );
      else if (cmd === "help")
        $("output").textContent =
          "look | check <mind|body|special> <your approach> | retry | restart | quit | save | log";
      else if (cmd === "check") {
        act("check", { stat: parts.shift(), approach: parts.join(" ") });
        $("output").textContent = JSON.stringify(E.observe(session), null, 2);
      } else if (["retry", "restart", "quit"].includes(cmd)) {
        act(cmd);
        $("output").textContent = JSON.stringify(E.observe(session), null, 2);
      } else if (cmd === "save") $("save").click();
      else if (cmd === "log") $("log").click();
      else throw Error("Unknown command. Type help.");
      $("command").value = "";
    })();
  };
  render();
})();
