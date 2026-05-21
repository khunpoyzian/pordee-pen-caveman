# pordee-pen-caveman

> พิมไทย → ตอบไทยกระชับ
> Type English → terse English reply
> สลับอัตโนมัติ ไม่ต้องสั่ง

Claude Code plugin ที่รวม [**caveman**](https://github.com/JuliusBrussee/caveman) (English terse mode) กับ [**pordee**](https://github.com/kerlos/pordee) (Thai terse mode) ไว้ในตัวเดียว แล้วเพิ่ม `lang-auto-switch` hook เป็นตัวสลับโหมดให้ตามภาษาที่ผู้ใช้พิมมา

---

## ที่มา

`caveman` ตัด filler ภาษาอังกฤษ ทำให้ Claude ตอบสั้นแบบ smart caveman ลด token ~75%
`pordee` ทำหน้าที่เดียวกันสำหรับภาษาไทย ตัด ครับ/ค่ะ/อาจจะ/น่าจะ ทิ้ง ลด token ~60-75%

ทั้ง 2 ตัวต่างคนต่างทำงานดี แต่ใช้พร้อมกันลำบาก เพราะต้องสั่ง `/caveman` หรือ `/pordee` เองทุกครั้งที่สลับภาษา

`pordee-pen-caveman` แก้ตรงนี้ ตรวจภาษาของ prompt อัตโนมัติแล้ว inject กฎของโหมดที่ถูกต้องเข้า context ให้เอง

---

## ทำไมถึงทำ

นักพัฒนาส่วนใหญ่ที่ใช้ Claude Code พิมเป็น English แต่บางจังหวะนึกคำอังกฤษไม่ออก หรืออธิบาย requirement ที่เป็น domain ภาษาไทย ก็พิมไทยปนเข้ามา

ก่อนหน้านี้ต้องเลือก:
- เปิด `caveman` อย่างเดียว → ตอบ English สั้น แต่พอเปลี่ยนเป็นไทยก็ตอบไทยแบบยาวเต็มประโยค
- เปิด `pordee` อย่างเดียว → ตรงข้าม
- สลับมือเอง → ลืมตลอด

ของ fork นี้: พิมภาษาไหน Claude ก็ตอบสั้นในภาษานั้น ไม่ต้องคิด

---

## ติดตั้ง

ต้องมี [Node.js 18+](https://nodejs.org) และ [Claude Code](https://claude.ai/code)

```bash
git clone https://github.com/khunpoyzian/pordee-pen-caveman.git
cd pordee-pen-caveman
node install.js
```

installer จะ:
- copy hook ไป `~/.claude/hooks/`
- เพิ่ม `lang-auto-switch` เข้า `~/.claude/settings.json` (UserPromptSubmit)
- ตั้งค่าให้ทำงานร่วมกับ caveman plugin ที่มีอยู่ (ถ้าติดตั้งไว้)

restart Claude Code 1 ครั้ง เริ่มใช้งานได้

---

## ทำงานยังไง

ทุกครั้งที่ผู้ใช้ส่ง prompt:

1. Hook นับ Thai character vs Latin character ใน prompt (ข้าม code block)
2. ถ้า Thai ≥ 15% ของ alpha chars → inject `PORDEE_RULES` เข้า context + ตั้ง `~/.pordee/state.json` enabled=true
3. ถ้าน้อยกว่า → inject `CAVEMAN_RULES` + เขียน flag `~/.claude/.caveman-active`
4. State persist ข้าม turn เพื่อให้ statusline กับ stats command อ่านได้

ไม่มี API ไม่มี server ทุกอย่างรันใน local

---

## สั่ง manual

ปกติไม่ต้องสั่ง แต่ถ้าอยากบังคับ:

| พิม | ผล |
|---|---|
| `พอดี` | บังคับ Thai terse mode |
| `/pordee` | เหมือนกัน |
| `หยุดพอดี` | ปิด Thai mode |
| `/pordee stop` | เหมือนกัน |
| `/caveman` | บังคับ English terse mode |
| `talk like caveman` | เหมือนกัน |
| `stop caveman` | ปิด English mode |
| `normal mode` | เหมือนกัน |

---

## Levels

ทั้ง 2 โหมดมีระดับ:

- **lite** ตัดคำสุภาพ / filler แต่ grammar เต็ม อ่านเป็น professional
- **full** (default) ตัด particle, ใช้ fragment, pattern `[ของ] [ทำ] [เหตุผล]. [ขั้นต่อ].`
- **ultra** (caveman only) ตัดให้สั้นที่สุด ใกล้ telegraph

สลับ: `/pordee lite|full` หรือ `/caveman lite|full|ultra`

---

## ก่อน / หลัง

### Thai prompt — "ทำไม React component re-render?"

<table>
<tr>
<th width="34%">Normal<br><sub>~80 tokens</sub></th>
<th width="33%">pordee lite<br><sub>~45 tokens · 44% saved</sub></th>
<th width="33%">pordee full<br><sub>~22 tokens · 73% saved</sub></th>
</tr>
<tr>
<td>"แน่นอนครับ ผมยินดีจะอธิบายให้นะครับ จริงๆ แล้วเหตุผลที่ React component ของคุณ re-render นั้น น่าจะเกิดจากการที่คุณส่ง object reference ใหม่เป็น prop ในทุกครั้งที่ component ถูก render ซึ่งทำให้ React มองว่า prop เปลี่ยน และทำการ re-render component ลูก ดังนั้นคุณอาจจะลองใช้ useMemo เพื่อ memoize object นั้นดูครับ"</td>
<td>"React component re-render เพราะส่ง object reference ใหม่เป็น prop ทุกครั้งที่ render ทำให้ React มองว่า prop เปลี่ยน และ re-render component ลูก ลองใช้ useMemo เพื่อ memoize object นั้น"</td>
<td>"Object ref ใหม่ทุก render. Inline object prop = ref ใหม่ = re-render. ห่อด้วย <code>useMemo</code>."</td>
</tr>
</table>

### English prompt — "Why does my React component re-render?"

<table>
<tr>
<th width="34%">Normal</th>
<th width="33%">caveman full</th>
</tr>
<tr>
<td>"Of course! I'd be happy to explain. The reason your React component is re-rendering is likely because you're passing a new object reference as a prop on every render, which causes React to see the prop as changed and re-render the child component. You should consider wrapping the object in useMemo to memoize it."</td>
<td>"New object ref each render. Inline object prop = new ref = re-render. Wrap in <code>useMemo</code>."</td>
</tr>
</table>

ดูตัวอย่างเพิ่มเติมที่ [pordee README](https://github.com/kerlos/pordee) และ [caveman README](https://github.com/JuliusBrussee/caveman)

---

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
|---|---|
| `/pordee-stats` | สถิติ session ปัจจุบัน |
| `/pordee-stats --share` | สรุป 1 บรรทัด copy paste ได้ |
| `/pordee-stats --all` | lifetime |
| `/pordee-stats --since 7d` | ย้อนหลัง 7 วัน |

---

## Auto-clarity

บางจังหวะการพูดสั้นอันตราย hook จะหยุด terse mode ชั่วคราว ตอบยาวเต็มประโยค จบแล้วกลับมา:

- security warning หรือ ⚠️
- คำสั่งย้อนกลับไม่ได้ `DROP TABLE`, `rm -rf`, `git push --force`, `git reset --hard`, `git branch -D`
- ขั้นตอนหลายสเต็ปที่ลำดับสำคัญ
- ผู้ใช้พิม `อะไรนะ` / `พูดอีกที` / `อธิบายชัดๆ` / `ขยายความ`

---

## เครดิต

- [**caveman**](https://github.com/JuliusBrussee/caveman) by Julius Brussee — English terse mode ต้นทาง
- [**pordee**](https://github.com/kerlos/pordee) by Vatunyoo Suwannapisit — Thai terse mode
- `lang-auto-switch` hook ที่อยู่ใน fork นี้ เป็นโค้ดใหม่ทำหน้าที่ detect + switch

---

## ข้อจำกัด

- รองรับ Claude Code (v1) เท่านั้น
- detect ภาษาเฉพาะ Thai vs Latin ภาษาอื่น (Japanese, Chinese) จะถูกจัดว่า English
- threshold 15% Thai ถ้าพิม English ปนคำไทย 1-2 คำ จะยังเป็น English mode

---

## License

MIT
