# pordee-codex

Codex plugin ที่ตรวจภาษา prompt อัตโนมัติ:

- ภาษาไทย: ตอบไทยกระชับแบบ Pordee
- English: concise technical English แบบ caveman
- code, command, path, URL, identifier และ error message คงเดิม
- งาน security, irreversible action, ordered procedure, review และ commit ใช้ข้อความปกติที่ชัดเจน

รุ่น Codex ของ [pordee-pen-caveman](https://github.com/khunpoyzian/pordee-pen-caveman) สำหรับ Codex `UserPromptSubmit` hooks.

## Requirements

- Codex ที่รองรับ plugins และ hooks
- Node.js 18+

## Install from this repo

```bash
node install.js codex
```

ถ้าต้องการบังคับ `ultra` ทุกแชทใหม่ทุก turn จนกว่าจะลบ global hook:

```bash
node install.js codex --force-ultra
```

ถ้าต้องการติดตั้งทั้ง Claude และ Codex พร้อมกัน:

```bash
node install.js both
```

Installer จะ add repo นี้เป็น marketplace และติดตั้ง `pordee-codex` ให้เลย

Codex ค้น hook จาก `hooks/hooks.json` อัตโนมัติ ไม่ต้องแก้ `~/.codex/config.toml` เอง

## Install from GitHub

```text
codex plugin marketplace add khunpoyzian/pordee-pen-caveman
codex plugin add pordee-codex@pordee-codex
```

เริ่ม thread ใหม่ 1 ครั้งเพื่อให้ Codex โหลด skill และ hook ชุดใหม่

## Usage

ปกติไม่ต้องสั่งอะไร plugin เลือกโหมดจากภาษาของ prompt.

Manual prompts:

| Prompt | Result |
|---|---|
| `พอดี`, `พูดสั้นๆ`, `/pordee` | Thai full |
| `พอดี lite`, `/pordee lite` | Thai lite |
| `พูดปกติ`, `หยุดพอดี`, `/pordee stop` | normal for this turn |
| `/caveman lite\|full\|ultra` | English selected level |
| `normal mode`, `/caveman stop` | normal for this turn |

เรียก skill โดยตรงได้ด้วย `$pordee`.

`--force-ultra` เป็นคนละโหมดกับ plugin ปกติ:

- Thai -> บังคับสั้นสุดแบบห้วนได้
- English -> บังคับ caveman ultra
- `normal mode` หรือ `stop caveman` จากข้อความผู้ใช้จะไม่ปิด จนกว่าจะเอา entry ออกจาก `~/.codex/hooks.json`

## Test

```powershell
npm test
```

## Known difference from the Claude version

`/pordee-stats` ยังไม่รวมในรุ่นนี้ เพราะ Claude transcript paths และ usage log format ใช้กับ Codex โดยตรงไม่ได้.

## License

MIT. ดู `LICENSE` และ `NOTICE`.
