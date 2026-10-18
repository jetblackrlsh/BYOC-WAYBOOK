# Verification

Run npm run build and npm test with Node 20+.

The suite covers all twelve assignments; personality-isolated prompts/logs;
thresholds, modifier caps and unbiased dice; mandatory flavor-only approaches;
alternating stats; circumstance durations, revisits and refreshes; idempotent
commands; immutable invalid actions; save/resume/corruption; wins/fatal failures;
checkpoint/restart history and new entropy; fresh characters and explicit sequel
carryover; graph validation; logs; classic-browser/headless parity; separate-process
CLI play and file-lock behavior.

## Browser boundary
The classic-script package contains no module fetches, CDNs or network calls.
It is designed for extracted START.html use without a server.
The development cloud browser rejects file: navigation. Its separate machine
also cannot connect to the workspace localhost preview. Direct-file visual
browser verification remains unverified here. DOM and VM tests are separate
evidence, not a claim of visual browser QA.
Local autosave may be blocked or quota-limited; exported saves remain portable.

## Scope
Version 1 does not promise that every authored adventure is balanced.
No party system, HP, damage subsystem, summon turns or embedded AI service.
Agents author JSON and execute explicit commands externally.
Story inventory is tracked without a separate equipment/gating system.

Release verification: 28 automated tests passed, including an exhaustive 216-case
assignment/stat/die matrix and 20 varied 30-command save/reload playthroughs.
Optional jsdom smoke passed startup, character creation, personality isolation,
text-injection safety, rolling, stat lockout, autosave fallback, console commands,
quit and checkpoint retry. This is DOM simulation, not a screenshot review.

To reproduce the optional DOM check:
    npm install --no-save --ignore-scripts jsdom@26.1.0
    node tools/dom-smoke.mjs
