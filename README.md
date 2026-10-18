# BYOC-WAYBOOK

Offline single-character storytelling for Bring Your Own Character RPG.
Game design: Nicholas Alexander Benson. Software developed with Dot Nova.

## Browser play
1. Select Code → Download ZIP on GitHub.
2. Extract the entire ZIP.
3. Open START.html in a modern browser.
4. Create or import a character. Load an adventure JSON or use The Last Lantern.
5. Pick a stat, describe your approach, and roll.

No account, server, installation, network connection or runtime dependencies.
Desktop browsers are the simplest route; mobile local-HTML support varies.
The optional text console supports look, check, retry, restart, quit, save and log.

## Rules
Mind / Body / Special. Twelve legal assignments:
- Specialist: +2, 0, 0
- Balanced: +1, +1, 0
- Wildcard: +2, +1, -1

Roll d6 + stat + applicable circumstances; clamp the combined modifier to -2…+2.
Four or more succeeds. Success and failure both prohibit that stat on the next
check. Always describe your approach; the description is flavor and never changes
the math or stat eligibility. Only your personality's prompt is shown.

Before-obstacle grants count the current section visit. After-roll grants start
next visit. Every visit counts, including revisits, regardless of chosen stat.
Rereading and saving never advance time. Grants happen once per attempt unless
repeatable. Reapplying the same circumstance refreshes rather than stacks it.
Fatal failures end an attempt; Finale successes win.

Save/resume preserves upcoming random results. Explicit restart/checkpoint retry
uses fresh randomness and preserves previous attempts in the log. Local autosave
is optional; export saves for portable backups.

## Headless play
Node 20+ is required only for the optional CLI and development, not browser play.

    node cli.mjs new examples/last-lantern.json examples/rowan.json my-save.json
    node cli.mjs look my-save.json
    node cli.mjs act my-save.json check mind I grow a living bridge.
    node cli.mjs log my-save.json

Agents should use the idempotent command-file interface:

    node cli.mjs command my-save.json command.json

A command file contains:
    {"id":"unique-1","expectedRevision":0,"type":"check","stat":"mind","approach":"I grow a bridge."}

Exact repeated IDs do not reapply actions. Conflicting IDs and stale revisions
reject. The CLI uses an exclusive lock and atomic rename. After a crash, inspect
a leftover .lock or .pending file before removing it; another process may own it.

See [agent guide](docs/AGENT-GUIDE.md), [formats](docs/FORMATS.md),
and [testing](docs/TESTING.md).

## Development
    npm run build
    npm test

Core/CLI tests need no dependency installation. The optional DOM test uses
jsdom if installed; see its instructions. The classic engine.js is generated
from src/engine.mjs, so browser and headless play share their mechanics.

## Privacy
No analytics, external fonts, accounts, AI API, or network requests.
Imported prose is rendered as text, not HTML. Saves embed adventure, character,
random tape and complete history. Share them deliberately.
Web Crypto supplies an unbiased random tape. The save checksum detects accidental
corruption, not deliberate editing or cheating. This is a local solo tool.

## License
[MIT](LICENSE) covers this new software, documentation and example.
The separately copyrighted BYOC RPG rulebook is not bundled or relicensed.
See [NOTICE](NOTICE.md). No D&D SRD or private Waybook archives are included.
