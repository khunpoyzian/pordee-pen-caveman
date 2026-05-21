# pordee-pen-caveman

> พิมไทย → ตอบไทยกระชับ &nbsp;·&nbsp; Type English → terse English reply &nbsp;·&nbsp; สลับอัตโนมัติ ไม่ต้องสั่ง

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Claude%20Code-plugin-7c3aed.svg)](https://claude.ai/code)

A Claude Code plugin that fuses [**caveman**](https://github.com/JuliusBrussee/caveman) (English terse mode) with [**pordee**](https://github.com/kerlos/pordee) (Thai terse mode) and adds a `lang-auto-switch` hook that picks the right mode per prompt — no manual toggling.

---

## Why this fork

`caveman` strips English filler so Claude answers like a smart caveman (~75% fewer output tokens).
`pordee` does the same for Thai — trimming ครับ/ค่ะ/อาจจะ/น่าจะ and other particles (~60-75% fewer tokens).

Each works well on its own, but running them together is awkward: you have to type `/caveman` or `/pordee` every time you switch language. Most Claude Code users type in English but slip into Thai for domain-specific requirements (or when a word just won't come in English).

This fork solves that. The `lang-auto-switch` hook inspects every `UserPromptSubmit` event and injects the matching rule set into context **before** Claude responds.

## How it works

```
┌──────────────────┐    UserPromptSubmit    ┌────────────────────┐
│  Your prompt     │ ─────────────────────► │  lang-auto-switch  │
└──────────────────┘                        └──────────┬─────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────────────┐
                          │                            │                            │
                          ▼                            ▼                            ▼
                  ┌───────────────┐           ┌─────────────────┐          ┌─────────────────┐
                  │ Manual trigger│           │   Thai prose    │          │ English prose   │
                  │  /pordee,     │           │   detected      │          │   detected      │
                  │  /caveman,    │           ├─────────────────┤          ├─────────────────┤
                  │  พอดี, etc.   │           │  pordee rules   │          │  caveman rules  │
                  └───────┬───────┘           └────────┬────────┘          └────────┬────────┘
                          │                            │                            │
                          └────────────────────────────┴────────────────────────────┘
                                                       │
                                                       ▼
                                            ┌────────────────────┐
                                            │ Context injected   │
                                            │ for this turn      │
                                            └────────────────────┘
```

The hook runs locally. No API call, no telemetry, no server.

### Detection algorithm

For each prompt the hook:

1. Strips fenced code blocks (` ``` … ``` `), inline code (`` `…` ``), and URLs — these don't represent how the user is speaking.
2. Counts Thai characters in `U+0E00–U+0E7F` and Latin characters in `A-Z`/`a-z`.
3. Looks at the **first alpha character** to decide whether the prompt opens in Thai or English.
4. Applies a script-aware threshold:

| Opening | Thai share required | Reason |
| --- | --- | --- |
| Starts with Thai | ≥ 10% of alpha chars | User addresses Claude in Thai; English usually appears only as technical terms. |
| Starts with English | ≥ 40% of alpha chars **and** ≥ 3 Thai chars | A trailing Thai confirmation tag like *ใช่ไหม* shouldn't flip the mode. |

Manual triggers always win over auto-detection.

## Install

Requirements: [Node.js 18+](https://nodejs.org) and [Claude Code](https://claude.ai/code).

```bash
git clone https://github.com/khunpoyzian/pordee-pen-caveman.git
cd pordee-pen-caveman
node install.js
```

The installer:

- Copies `lang-auto-switch.js` to `~/.claude/hooks/`.
- Prepends the hook to `UserPromptSubmit` in `~/.claude/settings.json` (idempotent — re-running won't duplicate).
- If `caveman` is already installed, sets its `defaultMode` to `off` so this hook owns per-turn mode selection.

Restart Claude Code once and you're done.

### Verify the install

```bash
npm test          # runs the lang-auto-switch test suite
```

## Manual overrides

The hook auto-detects, but explicit triggers always take precedence within a turn.

| You type | Result |
| --- | --- |
| `/pordee` &nbsp;·&nbsp; `พอดี` &nbsp;·&nbsp; `พอดีโหมด` &nbsp;·&nbsp; `พูดสั้นๆ` | Force Thai terse mode (full) |
| `/pordee lite` | Force Thai terse mode (lite) |
| `/pordee stop` &nbsp;·&nbsp; `หยุดพอดี` &nbsp;·&nbsp; `พูดปกติ` | Disable Thai mode |
| `/caveman` &nbsp;·&nbsp; `talk like caveman` | Force English terse mode (full) |
| `/caveman lite` &nbsp;·&nbsp; `/caveman ultra` | Force English terse mode at the chosen level |
| `/caveman stop` &nbsp;·&nbsp; `stop caveman` &nbsp;·&nbsp; `normal mode` | Disable English mode |

### Levels

| Level | Behaviour |
| --- | --- |
| `lite` | Trims filler and pleasantries, keeps full grammar — suitable for professional writing. |
| `full` (default) | Drops particles, uses fragments, follows the `[thing] [action] [reason]. [next].` pattern. |
| `ultra` (caveman only) | Telegraph style — minimum words, technical terms exact. |

Switch with `/pordee lite|full` or `/caveman lite|full|ultra`.

## Before / after

**Thai prompt — *"ทำไม React component re-render?"***

| Normal | pordee lite | pordee full |
| --- | --- | --- |
| `~80 tokens` | `~45 tokens · 44% saved` | `~22 tokens · 73% saved` |
| "แน่นอนครับ ผมยินดีจะอธิบายให้นะครับ จริงๆ แล้วเหตุผลที่ React component ของคุณ re-render นั้น น่าจะเกิดจากการที่คุณส่ง object reference ใหม่เป็น prop ในทุกครั้งที่ component ถูก render ซึ่งทำให้ React มองว่า prop เปลี่ยน และทำการ re-render component ลูก ดังนั้นคุณอาจจะลองใช้ useMemo เพื่อ memoize object นั้นดูครับ" | "React component re-render เพราะส่ง object reference ใหม่เป็น prop ทุกครั้งที่ render ทำให้ React มองว่า prop เปลี่ยน และ re-render component ลูก ลองใช้ useMemo เพื่อ memoize object นั้น" | "Object ref ใหม่ทุก render. Inline object prop = ref ใหม่ = re-render. ห่อด้วย `useMemo`." |

**English prompt — *"Why does my React component re-render?"***

| Normal | caveman full |
| --- | --- |
| "Of course! I'd be happy to explain. The reason your React component is re-rendering is likely because you're passing a new object reference as a prop on every render, which causes React to see the prop as changed and re-render the child component. You should consider wrapping the object in useMemo to memoize it." | "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`." |

See more examples in [pordee README](https://github.com/kerlos/pordee) and [caveman README](https://github.com/JuliusBrussee/caveman).

## Auto-clarity

The hook stays out of the way when terseness would be dangerous. For these prompts the active terse mode is temporarily suppressed so Claude responds in full sentences:

- Security warnings (`⚠️`, "danger", "vulnerability")
- Irreversible commands (`DROP TABLE`, `rm -rf`, `git push --force`, `git reset --hard`, `git branch -D`)
- Multi-step procedures where step order matters
- You explicitly ask to slow down: `อะไรนะ`, `พูดอีกที`, `อธิบายชัดๆ`, `ขยายความ`

Terse mode resumes on the next turn.

## State and files

| Path | Purpose |
| --- | --- |
| `~/.pordee/state.json` | Current pordee mode: `{ enabled, level, version, lastChanged }`. Read by the statusline and stats command. |
| `~/.claude/.caveman-active` | Caveman level flag (`lite` / `full` / `ultra`). Removed when caveman is off. |
| `~/.claude/hooks/lang-auto-switch.js` | Installed copy of the hook. |
| `~/.claude/settings.json` | Hook registration under `hooks.UserPromptSubmit`. |

Environment overrides:

- `PORDEE_HOME` — override the directory for `state.json` (defaults to `~/.pordee`).
- `CLAUDE_CONFIG_DIR` — override the Claude directory (defaults to `~/.claude`).

## Stats

`/pordee-stats` reports the tokens saved in the current session.

```
พอดี Stats
──────────────────────────────────
Session:  ...projects/demo/session.jsonl
Turns:    12
──────────────────────────────────
Output tokens:         8,450
Cache-read tokens:     2,100
──────────────────────────────────
Est. without pordee:   21,667
Est. tokens saved:     13,217 (~61%)
Est. saved (USD):      ~$0.198
```

| Command | Effect |
| --- | --- |
| `/pordee-stats` | Stats for the current session |
| `/pordee-stats --share` | One-line summary suitable for paste |
| `/pordee-stats --all` | Lifetime totals |
| `/pordee-stats --since 7d` | Rolling window (e.g. `24h`, `7d`) |

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No mode switching at all | Hook not registered after install. | Open `~/.claude/settings.json` and confirm `lang-auto-switch.js` appears under `hooks.UserPromptSubmit`. Restart Claude Code. |
| Both pordee and caveman rules appear in one turn | An older `pordee-mode-tracker` or `caveman-mode-tracker` is still registered. | Remove duplicate hooks from `settings.json`. Only `lang-auto-switch.js` should be present. |
| Thai prompt still answered in long English | Threshold edge case — try a longer Thai sentence, or force with `พอดี`. | Open an issue with the exact prompt so the detection can be tuned. |
| `/pordee lite` runs but mode shows `full` | Pre-fork bug. | Make sure the installed `lang-auto-switch.js` matches this repo's `hooks/lang-auto-switch.js`. |

## Uninstall

```bash
# Remove the hook entry from ~/.claude/settings.json (under hooks.UserPromptSubmit)
# Then delete the installed files:
rm ~/.claude/hooks/lang-auto-switch.js
rm -rf ~/.pordee
rm ~/.claude/.caveman-active   # if present
```

Restart Claude Code to apply.

## Limitations

- Claude Code v1 only.
- Detection covers Thai vs Latin scripts. Japanese, Chinese, Korean prose will fall back to caveman (English) mode.
- The detection heuristic is character-based, not semantic — pathological inputs (large code blocks pasted with one Thai word) can still surprise it. Use the manual triggers when in doubt.

## Development

```bash
git clone https://github.com/khunpoyzian/pordee-pen-caveman.git
cd pordee-pen-caveman
npm install         # only if you add dependencies; none required at runtime
node --test tests/test_lang_auto_switch.js
```

Tests cover language detection edge cases, trigger classification, level parsing, and end-to-end hook invocation against a temp `PORDEE_HOME`.

## Credits

- [**caveman**](https://github.com/JuliusBrussee/caveman) by Julius Brussee — English terse-mode foundation.
- [**pordee**](https://github.com/kerlos/pordee) by Vatunyoo Suwannapisit — Thai terse-mode foundation.
- `lang-auto-switch` hook in this fork is original code that performs the detect-and-switch logic.

## License

[MIT](LICENSE)
