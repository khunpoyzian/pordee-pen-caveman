# pordee-pen-caveman

> พิมไทย → ตอบไทยกระชับ &nbsp;·&nbsp; พิม English → ตอบ English สั้น &nbsp;·&nbsp; สลับอัตโนมัติ ไม่ต้องสั่ง

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Claude%20Code-plugin-7c3aed.svg)](https://claude.ai/code)

Plugin สำหรับ Claude Code ที่รวม [**caveman**](https://github.com/JuliusBrussee/caveman) (โหมดตอบ English สั้น) กับ [**pordee**](https://github.com/kerlos/pordee) (โหมดตอบไทยสั้น) ไว้ในตัวเดียว แล้วเพิ่ม `lang-auto-switch` hook ที่ตรวจภาษาของ prompt อัตโนมัติ แล้วเลือกโหมดให้เอง

Repo นี้ยังรวม Codex plugin สำหรับใช้งานกับ Codex desktop/CLI ไว้ที่ `plugins/pordee-codex/` ด้วย

---

## ทำไมต้อง pordee-pen-caveman

`caveman` ตัด filler ของ English ทำให้ Claude ตอบสั้นแบบ smart caveman ลด output token ~75%
`pordee` ทำแบบเดียวกันกับไทย ตัด ครับ/ค่ะ/อาจจะ/น่าจะ ทิ้ง ลด token ~60-75%

ทั้ง 2 ตัวแยกกันทำงานได้ดี แต่ใช้พร้อมกันลำบาก เพราะต้องพิม `/caveman` หรือ `/pordee` เองทุกครั้งที่สลับภาษา นักพัฒนาคนไทยส่วนใหญ่พิม English เป็นหลัก แต่บางจังหวะนึก keyword ภาษาอังกฤษไม่ออก หรืออธิบาย requirement ที่เป็น domain ไทย ก็พิมไทยปนเข้ามา

fork นี้แก้ตรงนั้น `lang-auto-switch` hook ทำงานทุกครั้งที่ user ส่ง prompt และ inject กฎของโหมดที่ถูกต้องเข้า context ก่อน Claude จะตอบ

## ทำงานยังไง

```
┌──────────────────┐    UserPromptSubmit    ┌────────────────────┐
│   Prompt ที่พิม  │ ─────────────────────► │  lang-auto-switch  │
└──────────────────┘                        └──────────┬─────────┘
                                                       │
                          ┌────────────────────────────┼────────────────────────────┐
                          │                            │                            │
                          ▼                            ▼                            ▼
                  ┌───────────────┐           ┌─────────────────┐          ┌─────────────────┐
                  │ Manual trigger│           │   ภาษาไทย       │          │   ภาษา English  │
                  │  /pordee,     │           ├─────────────────┤          ├─────────────────┤
                  │  /caveman,    │           │  pordee rules   │          │  caveman rules  │
                  │  พอดี ฯลฯ     │           └────────┬────────┘          └────────┬────────┘
                  └───────┬───────┘                    │                            │
                          │                            │                            │
                          └────────────────────────────┴────────────────────────────┘
                                                       │
                                                       ▼
                                            ┌────────────────────┐
                                            │ Inject เข้า context│
                                            │ ของ turn นั้น      │
                                            └────────────────────┘
```

Hook ทำงาน local ทั้งหมด ไม่มี API ไม่มี telemetry ไม่มี server

### Algorithm ตรวจภาษา

ทุก prompt hook จะ:

1. ตัด code block ที่อยู่ใน ` ``` … ``` `, inline code (`` `…` ``), และ URL ออก เพราะไม่ใช่ภาษาที่ user "พูด"
2. นับ Thai char ใน range `U+0E00–U+0E7F` และ Latin char `A-Z`/`a-z`
3. ดูตัวอักษรตัวแรกของ prompt ว่าเป็น Thai หรือ English เพื่อรู้ว่า user เริ่มประโยคด้วยภาษาอะไร
4. ใช้ threshold ที่ปรับตามภาษาเริ่ม:

| ขึ้นต้นด้วย | สัดส่วน Thai ที่ต้องมี | เหตุผล |
| --- | --- | --- |
| ภาษาไทย | ≥ 10% ของ alpha char | user พูดไทยอยู่แล้ว English ที่ปนเข้ามาส่วนใหญ่เป็น technical term |
| English | ≥ 40% ของ alpha char **และ** Thai ≥ 3 ตัว | Thai ตามท้ายประโยคแบบ "ใช่ไหม" ไม่ควรพลิกเป็นโหมดไทย |

Manual trigger ชนะการตรวจอัตโนมัติเสมอ

## ติดตั้ง

ต้องมี [Node.js 18+](https://nodejs.org) และ [Claude Code](https://claude.ai/code)

```bash
git clone https://github.com/khunpoyzian/pordee-pen-caveman.git
cd pordee-pen-caveman
node install.js
```

Installer จะ:

- copy `lang-auto-switch.js` ไป `~/.claude/hooks/`
- เพิ่ม hook เข้า `UserPromptSubmit` ใน `~/.claude/settings.json` (รันซ้ำได้ ไม่ซ้ำ entry)
- ถ้ามี `caveman` ติดตั้งอยู่ จะตั้ง `defaultMode` เป็น `off` ให้ hook นี้คุมโหมดต่อ turn เอง

restart Claude Code 1 ครั้ง พร้อมใช้

## ใช้กับ Codex

Repo เดียวกันนี้มี Codex plugin แยกไว้ที่ `plugins/pordee-codex/`

```bash
codex plugin marketplace add khunpoyzian/pordee-pen-caveman
codex plugin add pordee-codex@pordee-codex
```

จากนั้นเปิด thread ใหม่ แล้วใช้ `/hooks` เพื่อ review และ trust hook ครั้งแรก

รายละเอียดของฝั่ง Codex ดูใน `plugins/pordee-codex/README.md`

### ทดสอบหลังติดตั้ง

```bash
npm test
```

## Manual override

Hook ตรวจอัตโนมัติ แต่ trigger ที่พิมเองชนะเสมอใน turn นั้น

| พิม | ผล |
| --- | --- |
| `/pordee` &nbsp;·&nbsp; `พอดี` &nbsp;·&nbsp; `พอดีโหมด` &nbsp;·&nbsp; `พูดสั้นๆ` | บังคับโหมดไทยกระชับ (full) |
| `/pordee lite` | บังคับโหมดไทยกระชับ (lite) |
| `/pordee stop` &nbsp;·&nbsp; `หยุดพอดี` &nbsp;·&nbsp; `พูดปกติ` | ปิดโหมดไทย |
| `/caveman` &nbsp;·&nbsp; `talk like caveman` | บังคับโหมด English กระชับ (full) |
| `/caveman lite` &nbsp;·&nbsp; `/caveman ultra` | บังคับโหมด English ที่ระดับที่เลือก |
| `/caveman stop` &nbsp;·&nbsp; `stop caveman` &nbsp;·&nbsp; `normal mode` | ปิดโหมด English |

### Level

| ระดับ | พฤติกรรม |
| --- | --- |
| `lite` | ตัด filler และคำสุภาพ แต่ grammar ครบ เหมาะกับงานที่ต้องอ่านเป็นทางการ |
| `full` (default) | ตัด particle ใช้ fragment ตาม pattern `[ของ] [ทำ] [เหตุผล]. [ขั้นต่อ].` |
| `ultra` (เฉพาะ caveman) | สั้นที่สุด ใกล้ telegraph technical term ตรงตัว |

สลับ: `/pordee lite|full` หรือ `/caveman lite|full|ultra`

## ก่อน / หลัง

**Prompt ไทย — *"ทำไม React component re-render?"***

| ปกติ | pordee lite | pordee full |
| --- | --- | --- |
| `~80 token` | `~45 token · ประหยัด 44%` | `~22 token · ประหยัด 73%` |
| "แน่นอนครับ ผมยินดีจะอธิบายให้นะครับ จริงๆ แล้วเหตุผลที่ React component ของคุณ re-render นั้น น่าจะเกิดจากการที่คุณส่ง object reference ใหม่เป็น prop ในทุกครั้งที่ component ถูก render ซึ่งทำให้ React มองว่า prop เปลี่ยน และทำการ re-render component ลูก ดังนั้นคุณอาจจะลองใช้ useMemo เพื่อ memoize object นั้นดูครับ" | "React component re-render เพราะส่ง object reference ใหม่เป็น prop ทุกครั้งที่ render ทำให้ React มองว่า prop เปลี่ยน และ re-render component ลูก ลองใช้ useMemo เพื่อ memoize object นั้น" | "Object ref ใหม่ทุก render. Inline object prop = ref ใหม่ = re-render. ห่อด้วย `useMemo`." |

**Prompt English — *"Why does my React component re-render?"***

| ปกติ | caveman full |
| --- | --- |
| "Of course! I'd be happy to explain. The reason your React component is re-rendering is likely because you're passing a new object reference as a prop on every render, which causes React to see the prop as changed and re-render the child component. You should consider wrapping the object in useMemo to memoize it." | "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`." |

ดูตัวอย่างเพิ่มที่ [pordee README](https://github.com/kerlos/pordee) และ [caveman README](https://github.com/JuliusBrussee/caveman)

## Auto-clarity

บางจังหวะการตอบสั้นอันตราย hook จะหยุดโหมดกระชับชั่วคราว ตอบเต็มประโยค จบแล้วกลับมา:

- security warning (`⚠️`, "danger", "vulnerability")
- คำสั่งย้อนกลับไม่ได้ (`DROP TABLE`, `rm -rf`, `git push --force`, `git reset --hard`, `git branch -D`)
- ขั้นตอนหลายสเต็ปที่ลำดับสำคัญ
- user พิม `อะไรนะ`, `พูดอีกที`, `อธิบายชัดๆ`, `ขยายความ`

โหมดกระชับกลับมาทำงานใน turn ถัดไป

## ไฟล์ที่เกี่ยวข้อง

| Path | หน้าที่ |
| --- | --- |
| `~/.pordee/state.json` | สถานะ pordee ปัจจุบัน: `{ enabled, level, version, lastChanged }` อ่านโดย statusline กับ stats |
| `~/.claude/.caveman-active` | flag ของ caveman (`lite` / `full` / `ultra`) ลบเมื่อปิด caveman |
| `~/.claude/hooks/lang-auto-switch.js` | hook ที่ติดตั้งแล้ว |
| `~/.claude/settings.json` | จุดที่ลงทะเบียน hook ใน `hooks.UserPromptSubmit` |

Environment override:

- `PORDEE_HOME` — เปลี่ยน path ของ `state.json` (default `~/.pordee`)
- `CLAUDE_CONFIG_DIR` — เปลี่ยน path ของ Claude (default `~/.claude`)

## Stats

`/pordee-stats` แสดง token ที่ประหยัดได้ใน session ปัจจุบัน

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

| คำสั่ง | ผล |
| --- | --- |
| `/pordee-stats` | สถิติ session ปัจจุบัน |
| `/pordee-stats --share` | สรุป 1 บรรทัด copy paste ได้ |
| `/pordee-stats --all` | ยอดสะสมตลอด |
| `/pordee-stats --since 7d` | ย้อนหลังตามช่วง (เช่น `24h`, `7d`) |

## Troubleshooting

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
| --- | --- | --- |
| ไม่สลับโหมดเลย | hook ไม่ถูกลงทะเบียนหลังติดตั้ง | เปิด `~/.claude/settings.json` ดูว่ามี `lang-auto-switch.js` ใต้ `hooks.UserPromptSubmit` ไหม แล้ว restart Claude Code |
| โผล่ทั้ง pordee + caveman ใน turn เดียว | มี `pordee-mode-tracker` หรือ `caveman-mode-tracker` เก่าค้างอยู่ | ลบ hook ซ้ำใน `settings.json` ให้เหลือแค่ `lang-auto-switch.js` |
| พิมไทยแต่ตอบ English ยาว | edge case ของ threshold | ลองพิมประโยคไทยให้ยาวขึ้น หรือพิม `พอดี` บังคับ ถ้าเจอบ่อย เปิด issue พร้อม prompt ที่ใช้ |
| `/pordee lite` ใช้ได้แต่ statusline แสดง `full` | bug ก่อน fork | ตรวจว่า `lang-auto-switch.js` ที่ติดตั้งตรงกับไฟล์ใน repo นี้ |

## Uninstall

```bash
# ลบ entry hook ออกจาก ~/.claude/settings.json (ใต้ hooks.UserPromptSubmit)
# จากนั้นลบไฟล์:
rm ~/.claude/hooks/lang-auto-switch.js
rm -rf ~/.pordee
rm ~/.claude/.caveman-active   # ถ้ามี
```

restart Claude Code

## ข้อจำกัด

- รองรับ Claude Code v1 เท่านั้น
- ตรวจแค่ Thai vs Latin ภาษาอื่น (Japanese, Chinese, Korean) จะตกเป็นโหมด caveman (English)
- heuristic ใช้การนับ char ไม่ใช่ semantic — input แบบ pathological (paste code block ยาว ๆ พร้อมคำไทย 1 คำ) ยังหลุดได้ ใช้ manual trigger ถ้าไม่แน่ใจ

## Development

```bash
git clone https://github.com/khunpoyzian/pordee-pen-caveman.git
cd pordee-pen-caveman
npm install         # ติดตั้งเฉพาะถ้าเพิ่ม dependency เอง runtime ไม่ต้องใช้
node --test tests/test_lang_auto_switch.js
```

Test ครอบ: detection edge case, trigger classification, level parsing, end-to-end hook invocation บน temp `PORDEE_HOME`

## Credits

- [**caveman**](https://github.com/JuliusBrussee/caveman) โดย Julius Brussee — โหมด English terse ต้นทาง
- [**pordee**](https://github.com/kerlos/pordee) โดย Vatunyoo Suwannapisit — โหมด Thai terse ต้นทาง
- `lang-auto-switch` hook ใน fork นี้ เป็น code ใหม่ทำหน้าที่ detect + switch

## License

[MIT](LICENSE)
