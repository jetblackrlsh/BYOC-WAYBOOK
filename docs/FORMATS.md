# Formats and API

Version 1. Unknown fields reject. IDs: 1–80 ASCII letters, numbers, hyphens or
underscores. Reserved prototype keys reject. Maximum import: 20 MB.

## Character
Required: schema=BYOCCharacter, version=1, name, concept, personality,
stats={mind,body,special}. Stats are exactly a permutation of [2,0,0],
[1,1,0], or [2,1,-1]. Copy examples/rowan.json.

## Adventure
Required: schema=BYOCAdventure, version=1, id, title, introduction, start,
circumstances array, sections array (1–1000).
Optional: author, continuationOf (previous adventure ID).

Circumstance: {id,name,stat,modifier,duration}.
Stat: mind/body/special/all. Modifier: integer -20…20 before the final clamp.
Duration: 1–1000 visits. These are authoring bounds.

Section: {id,title,prompts,obstacle,success,failure}.
Prompts contains heroic, villainous and chaotic text.
Optional: grants array, checkpoint boolean, fatal boolean, finale boolean.

Outcome: {text,next}, optional grants and items={add:[],remove:[]}.
Next is a section ID, WIN or GAME_OVER.
Fatal=true requires GAME_OVER failure. Finale=true requires WIN success.
Story items are recorded narrative inventory; they do not add bonuses or gate
stat choices. Use circumstances for mechanical effects.

Grant: {id,repeatable:false}; repeatable defaults false.
A grant's identity is its section, phase and array position. Separate grant
locations count separately, but a same-ID circumstance refreshes without stacking.
Saved adventures embed their content; edits to other files do not change a run.

Validation checks fields, graph destinations, personality prompts and reachable
victory; unreachable sections produce warnings. Intentional loops are allowed.
Validation is not a proof of literary quality or mathematical winnability.

## Shared API
ESM: import from src/engine.mjs. Browser: window.BYOC.
- assignments(), createCharacter(input), validateCharacter(character)
- validateAdventure(adventure), returning {warnings}
- newSession(adventure,character,{random?})
- observe(session), returning player-safe current state
- dispatch(session,command,{randomFactory?}), returning new state
- exportSave(session), importSave(serialized)
- exportLog(session), narrativeLog(session)
- freshRandom(), replayRandom(uint32Values) for tests
- newSequelSession(previous,adventure,options)

Commands require id, expectedRevision, type.
Check additionally requires stat and nonblank approach (max 8000 characters).
Other types: quit, retry, restart. Retry/restart require a finished/quit attempt.
Retry requires a checkpoint and restores its previous-stat and grant history.
Checkpoint snapshots are after section entry grants; restoring never duplicates
entry or refreshes grants.

Sequel options: items[], circumstances[] (IDs), previousStat boolean, random.
The previous adventure must be finished/quit; continuationOf must match.
Selected circumstance definitions must match exactly. Only remaining unexpired
visits carry over. Nothing carries by default. The browser Begin button starts
fresh; agents/custom hosts can use the sequel API.

## Save limits and integrity
100,000 commands/log entries/visits, 200 circumstance definitions, 1000 items.
Logs can reach their cap before command count does.
The FNV-1a checksum detects accidental corruption, not malicious editing.
This is local single-player software, not an anti-cheat authority.
