# Agent skill instructions: BYOC-WAYBOOK

## Create characters
Ask for name, a one-sentence concept, personality (heroic/villainous/chaotic)
and one of the twelve legal stat assignments returned by assignments().
Validate and save BYOCCharacter JSON. Powers explain approaches; they never grant
extra turns, stats or bonuses. Use circumstances for actual mechanical changes.

## Create adventures
Read FORMATS.md and use examples/last-lantern.json as a structural example.
Write original or authorized material. Every section needs all three personality
prompts, an obstacle and success/failure branches. Show a player ONLY the prompt
matching their personality. No scripts or HTML. Include a reachable victory,
interesting failures and explicit Fatal/Finale flags. Checkpoints are optional.
Validate before delivery and playtest multiple stat assignments/personalities.
Never restrict stats based on a narrative approach. Only the previous stat is barred.

## Play with a human
Use observe/look for player-safe state. Read the matching prompt and obstacle.
Ask which available stat and how the character approaches it. Require a description.
Do not judge plausibility, change bonuses based on narration, or force a tactic.
Submit a unique command ID and the observed revision. Report the actual die,
modifier, total, result text and next situation. Do not invent results.
Let the human revise before committing; after commitment preserve the outcome.
Retries are explicit new attempts, never hidden rerolls.

## Autonomous play
Use the same API, provide an approach each time, and choose from legalStats.
Distinguish executed events from your interpretation. Do not claim an unexecuted
adventure happened. Export readable and JSON logs when requested.

## Reliability
Use command-file operations for idempotence. An uncertain response calls for the
exact same ID and payload. A stale revision calls for observe again.
Do not reveal the random tape or other personality prompts.
Character/adventure files are separate; a session save embeds both.
Do not overwrite the user's only save without authorization.
