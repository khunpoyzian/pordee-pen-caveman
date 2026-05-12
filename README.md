# pordee (พอดี)

> ทำไมใช้คำเยอะ ตอบสั้นๆ ก็เข้าใจ

ได้แรงบันดาลใจมาจาก [caveman](https://github.com/JuliusBrussee/caveman) — pordee เป็นรุ่นภาษาไทยที่ตัด token ทิ้งโดยไม่เสียความถูกต้องทาง technical

---

`pordee` คือ Claude Code plugin สั่งให้ agent ตอบภาษาไทยกระชับ — ตัดคำสุภาพ (ครับ/ค่ะ/นะคะ), คำลังเล (อาจจะ/น่าจะ), และคำเชื่อมที่ไม่จำเป็นทิ้ง เก็บ technical term อังกฤษไว้ตามเดิม

ผล: ใช้ token น้อยลง 60-75% เนื้อหาเท่าเดิม

---

## ติดตั้ง

### ผ่าน Claude Code plugin (แนะนำ)

```bash
claude plugin marketplace add kerlos/pordee
claude plugin install pordee@pordee
```

หลังติดตั้งเสร็จ hooks จะถูก register อัตโนมัติ — เริ่ม session ใหม่แล้ว `/pordee` ใช้ได้ทันที

---

## วิธีใช้

### Slash command

| คำสั่ง | ผล |
|---|---|
| `/pordee` | เปิด default level (full) |
| `/pordee lite` | โหมดเบา — ตัดคำสุภาพและ filler ออก แต่ grammar เต็ม |
| `/pordee full` | โหมดเต็ม — ตัดให้สั้นที่สุด |
| `/pordee stop` | ปิด |
| `/pordee-stats` | ดูสถิติ token ของ session ปัจจุบัน |
| `/pordee-stats --share` | สรุปสถิติ 1 บรรทัด (copy-paste ได้) |

### Keyword (ไม่ต้องพิมพ์ slash)

พิมพ์คำเหล่านี้เป็นข้อความปกติในแชต — pordee จะเปิด/ปิดให้อัตโนมัติ ต้องเป็นข้อความทั้งบรรทัด ไม่ใช่ส่วนหนึ่งของประโยค

| Keyword | ผล |
|---|---|
| `พอดี` | เปิด |
| `พอดีโหมด` | เปิด |
| `พูดสั้นๆ` | เปิด |
| `หยุดพอดี` | ปิด |
| `พูดปกติ` | ปิด |

---

## ระดับ (Levels)

### 🪶 Lite — `/pordee lite`

ตัดคำสุภาพ (ครับ/ค่ะ/นะคะ), คำลังเลใจ (อาจจะ/น่าจะ/จริงๆแล้ว), และคำทักทาย (ได้เลยครับ/แน่นอน) ทิ้ง แต่เก็บ grammar เต็ม อ่านแล้วยังเป็นภาษาไทยปกติ professional

### ⚡ Full — `/pordee` หรือ `/pordee full` (default)

ตัดเหมือน lite + ตัด particle ที่ซ้ำซ้อน (ที่/ซึ่ง/ว่า/อยู่/กำลัง) + ตัด nominalizer (การ-, ความ-) + ใช้คำสั้น (ดู ไม่ใช่ ตรวจสอบ) + ประโยคสั้นได้

Pattern: `[ของ] [ทำ] [เหตุผล]. [ขั้นต่อ].`

---

## ก่อน / หลัง (Before / After)

### ตัวอย่าง 1 — "ทำไม React component ถึง re-render?"

<table>
<tr>
<th width="34%">🗣️ Normal<br><sub>~80 tokens</sub></th>
<th width="33%">🪶 Lite<br><sub>~45 tokens · 44% saved</sub></th>
<th width="33%">⚡ Full<br><sub>~22 tokens · 73% saved</sub></th>
</tr>
<tr>
<td>"แน่นอนครับ ผมยินดีจะอธิบายให้นะครับ จริงๆ แล้วเหตุผลที่ React component ของคุณ re-render นั้น น่าจะเกิดจากการที่คุณส่ง object reference ใหม่เป็น prop ในทุกครั้งที่ component ถูก render ซึ่งทำให้ React มองว่า prop เปลี่ยน และทำการ re-render component ลูก ดังนั้นคุณอาจจะลองใช้ useMemo เพื่อ memoize object นั้นดูครับ"</td>
<td>"React component re-render เพราะส่ง object reference ใหม่เป็น prop ทุกครั้งที่ render ทำให้ React มองว่า prop เปลี่ยน และ re-render component ลูก ลองใช้ useMemo เพื่อ memoize object นั้น"</td>
<td>"Object ref ใหม่ทุก render. Inline object prop = ref ใหม่ = re-render. ห่อด้วย <code>useMemo</code>."</td>
</tr>
</table>

```
┌─────────────────────────────────────┐
│  Lite  ████░░░░░░  44% saved        │
│  Full  ███████░░░  73% saved        │
└─────────────────────────────────────┘
```

---

### ตัวอย่าง 2 — "อธิบาย database connection pooling"

<table>
<tr>
<th width="34%">🗣️ Normal<br><sub>~70 tokens</sub></th>
<th width="33%">🪶 Lite<br><sub>~35 tokens · 50% saved</sub></th>
<th width="33%">⚡ Full<br><sub>~18 tokens · 74% saved</sub></th>
</tr>
<tr>
<td>"ครับ การทำ database connection pooling นั้น โดยทั่วไปแล้วก็คือการที่เราเก็บ connection ของ database ที่เปิดไว้แล้ว เพื่อนำกลับมาใช้ใหม่อีกครั้ง แทนที่จะต้องเปิด connection ใหม่ทุกครั้งที่มี request เข้ามา ซึ่งจะช่วยลด overhead ของการทำ TCP handshake และ authentication ได้อย่างมีประสิทธิภาพ"</td>
<td>"Connection pooling เก็บ connection database ที่เปิดไว้แล้ว เพื่อนำกลับมาใช้ใหม่ ไม่ต้องเปิดใหม่ทุก request ลด overhead ของ TCP handshake และ authentication"</td>
<td>"Pool reuse connection ที่เปิดไว้. ไม่เปิดใหม่ทุก request. ข้าม TCP handshake."</td>
</tr>
</table>

```
┌─────────────────────────────────────┐
│  Lite  █████░░░░░  50% saved        │
│  Full  ███████░░░  74% saved        │
└─────────────────────────────────────┘
```

---

### ตัวอย่าง 3 — Bug report (auth middleware)

<table>
<tr>
<th width="34%">🗣️ Normal<br><sub>~55 tokens</sub></th>
<th width="33%">🪶 Lite<br><sub>~30 tokens · 45% saved</sub></th>
<th width="33%">⚡ Full<br><sub>~14 tokens · 75% saved</sub></th>
</tr>
<tr>
<td>"ครับ ผมตรวจสอบให้แล้วนะครับ ปัญหาที่คุณเจอน่าจะเกิดจาก bug ใน auth middleware ครับ จริงๆ แล้วในส่วนของ token expiry check นั้น โค้ดใช้เครื่องหมาย <code>&lt;</code> แทนที่จะเป็น <code>&lt;=</code> ซึ่งทำให้ token ที่หมดอายุพอดีไม่ถูก reject ดังนั้นเราควรจะแก้ตรงจุดนี้ครับ"</td>
<td>"Bug อยู่ที่ auth middleware ส่วน token expiry check ใช้ <code>&lt;</code> แทนที่จะเป็น <code>&lt;=</code> ทำให้ token ที่หมดอายุพอดีไม่ถูก reject แก้:"</td>
<td>"Bug ที่ auth middleware. Token expiry ใช้ <code>&lt;</code> ไม่ใช่ <code>&lt;=</code>. Fix:"</td>
</tr>
</table>

```
┌─────────────────────────────────────┐
│  Lite  █████░░░░░  45% saved        │
│  Full  ████████░░  75% saved        │
└─────────────────────────────────────┘
```

---

### ตัวอย่าง 4 — "แนะนำอาหารกลางวันให้หน่อย"

<table>
<tr>
<th width="34%">🗣️ Normal<br><sub>~70 tokens</sub></th>
<th width="33%">🪶 Lite<br><sub>~32 tokens · 54% saved</sub></th>
<th width="33%">⚡ Full<br><sub>~14 tokens · 80% saved</sub></th>
</tr>
<tr>
<td>"ได้เลยครับ จริงๆ แล้วการเลือกอาหารกลางวันก็ขึ้นอยู่กับหลายปัจจัยนะครับ เช่น งบประมาณ เวลาที่มี และความต้องการทางโภชนาการของคุณ ถ้าคุณอยากทานอาหารที่ทำง่ายและมีประโยชน์ ผมขอแนะนำว่าน่าจะลองทำสลัดไก่ย่างดูครับ เพราะว่ามีโปรตีนสูงและไม่ใช้เวลาเตรียมนานเลย"</td>
<td>"อาหารกลางวันขึ้นอยู่กับงบ เวลา และโภชนาการ ถ้าอยากกินง่ายและมีประโยชน์ ลองสลัดไก่ย่าง โปรตีนสูงและเตรียมไม่นาน"</td>
<td>"งบ + เวลา + โภชนาการ. ง่ายและดี → สลัดไก่ย่าง. โปรตีนสูง, เตรียมเร็ว."</td>
</tr>
</table>

```
┌─────────────────────────────────────┐
│  Lite  █████░░░░░  54% saved        │
│  Full  ████████░░  80% saved        │
└─────────────────────────────────────┘
```

---

### ตัวอย่าง 5 — "เที่ยวเชียงใหม่ ไปเดือนไหนดี"

<table>
<tr>
<th width="34%">🗣️ Normal<br><sub>~75 tokens</sub></th>
<th width="33%">🪶 Lite<br><sub>~30 tokens · 60% saved</sub></th>
<th width="33%">⚡ Full<br><sub>~12 tokens · 84% saved</sub></th>
</tr>
<tr>
<td>"ครับ ถ้าคุณอยากไปเที่ยวเชียงใหม่ ผมแนะนำว่าน่าจะไปช่วงเดือนพฤศจิกายนถึงกุมภาพันธ์ครับ เพราะว่าเป็นช่วงที่อากาศเย็นสบาย ไม่ร้อนเกินไป และไม่มีฝนตกบ่อยเหมือนช่วงอื่นๆ จริงๆ แล้วเดือนธันวาคมก็เป็นเดือนที่นิยมที่สุดเลยนะครับ แต่ก็จะคนเยอะหน่อย"</td>
<td>"ไปเชียงใหม่ ช่วงพฤศจิกายน-กุมภาพันธ์ดีที่สุด อากาศเย็นสบาย ไม่ร้อน ฝนน้อย ธันวาคมนิยมที่สุดแต่คนเยอะ"</td>
<td>"พ.ย.-ก.พ. ดีสุด. อากาศเย็น, ฝนน้อย. ธ.ค. คนเยอะ."</td>
</tr>
</table>

```
┌─────────────────────────────────────┐
│  Lite  ██████░░░░  60% saved        │
│  Full  ████████░░  84% saved        │
└─────────────────────────────────────┘
```

---

### ตัวอย่าง 6 — "วิธีนอนหลับให้สนิท"

<table>
<tr>
<th width="34%">🗣️ Normal<br><sub>~70 tokens</sub></th>
<th width="33%">🪶 Lite<br><sub>~32 tokens · 54% saved</sub></th>
<th width="33%">⚡ Full<br><sub>~14 tokens · 80% saved</sub></th>
</tr>
<tr>
<td>"ครับ การนอนหลับให้สนิทนั้นมีหลายวิธีนะครับ ก่อนอื่นเลย คุณควรจะหลีกเลี่ยงการดื่มกาแฟหรือเครื่องดื่มที่มีคาเฟอีนหลังบ่ายสาม จริงๆ แล้วก็ควรจะปิดหน้าจอทุกชนิดอย่างน้อย 30 นาทีก่อนนอนนะครับ และพยายามเข้านอนเวลาเดิมทุกวันเพื่อให้ร่างกายปรับนาฬิกาชีวิต"</td>
<td>"นอนหลับสนิทมีหลายวิธี เลี่ยงคาเฟอีนหลังบ่ายสาม ปิดหน้าจอ 30 นาทีก่อนนอน เข้านอนเวลาเดิมทุกวันเพื่อปรับนาฬิกาชีวิต"</td>
<td>"เลี่ยงคาเฟอีนหลังบ่าย 3. ปิดจอ 30 นาทีก่อนนอน. เข้านอนเวลาเดิม → ปรับ circadian."</td>
</tr>
</table>

```
┌─────────────────────────────────────┐
│  Lite  █████░░░░░  54% saved        │
│  Full  ████████░░  80% saved        │
└─────────────────────────────────────┘
```

---

## กลไกการทำงาน

1. ติดตั้ง plugin → Claude Code register hook ของ pordee อัตโนมัติ
2. เริ่ม session ใหม่ → SessionStart hook อ่าน state ที่ `~/.pordee/state.json`
3. ถ้า `enabled=true` → inject กฎ pordee เข้า context ของ session
4. ทุก turn ที่ user พิมพ์ → UserPromptSubmit hook
   - ตรวจ trigger ใน prompt (`/pordee`, `พอดี`, `หยุดพอดี`, ฯลฯ)
   - update state ถ้าเจอ trigger
   - ฉีด reminder ของ level ปัจจุบันเข้า context (กันไม่ให้ model drift)
5. State อยู่ที่ `~/.pordee/state.json` — ถาวรข้าม session

---

## สถิติ (Stats)

`/pordee-stats` แสดง token usage ของ session ปัจจุบัน + ประมาณการ token ที่ประหยัดได้จากการใช้ pordee

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
Savings est. from benchmarks/ (median per-task). Actual varies by task.
```

| คำสั่ง | ผล |
|---|---|
| `/pordee-stats` | สถิติ session ปัจจุบัน + lifetime summary |
| `/pordee-stats --share` | สรุป 1 บรรทัด — เช่น `⚡ Saved 13,217 output tokens (~$0.198) across 12 turns this session — pordee` |
| `/pordee-stats --all` | สถิติรวมทุก session (lifetime) |
| `/pordee-stats --since 7d` | สถิติย้อนหลัง 7 วัน |

### Benchmark

compression ratio ที่ stats ใช้มาจาก `benchmarks/compression.json` — สร้างจากการรัน prompt ชุดทดสอบภาษาไทย 8 ข้อ ผ่าน API แบบปกติ vs pordee แล้วคิด median

```bash
# รัน benchmark (ต้องมี ANTHROPIC_API_KEY)
export ANTHROPIC_BASE_URL=https://api.kimi.com/coding/v1
node benchmarks/run.js --level full
node benchmarks/run.js --level lite
```

หรือใช้ `--dry-run` สร้าง mock data สำหรับทดสอบ:

```bash
node benchmarks/run.js --dry-run --level full
```

---

## ตอนไหน pordee จะหยุดเอง 

บางสถานการณ์ การพูดสั้นเกินไปอันตรายหรือคนอ่านอาจเข้าใจผิด pordee จะปิดตัวเองชั่วคราว ตอบเป็นภาษาไทยปกติเต็มประโยค จบแล้วค่อยกลับมา

ถ้าผู้ใช้ต้องการให้อธิบายชัด ๆ พิมพ์คำต่อไปนี้ pordee จะหยุดและตอบยาวขึ้น:

| คำที่ผู้ใช้พิมพ์ | ความหมาย |
|---|---|
| `อะไรนะ` | ฟังไม่ทัน ขอใหม่ |
| `พูดอีกที` | ขอตอบซ้ำ |
| `อธิบายชัดๆ` | ขอละเอียดกว่านี้ |
| `ขยายความ` | ขอรายละเอียด |

นอกจากนี้ pordee จะหยุดเองเมื่อ:

- มี **security warning** หรือ ⚠️ ในคำตอบ
- คำสั่งที่ย้อนกลับไม่ได้ — `DROP TABLE`, `rm -rf`, `git push --force`, `git reset --hard`, `git branch -D`
- ขั้นตอนหลายสเต็ปที่ลำดับสำคัญ และ ประโยคสั้นเสี่ยงทำให้สับสน

หลังจบส่วนที่ต้องชัด pordee กลับมาโหมดเดิมทันที

---

## ข้อจำกัด

- ตอนนี้รองรับเฉพาะ Claude Code (v1) — โปรแกรมอื่นๆ จะเพิ่มเข้ามาในทีหลัง

---

# Extras: lang-auto-switch hook (pordee-pen-caveman)

> พิมไทย → ตอบไทยกระชับ. Type English → terse English reply. Auto. No config.

สำหรับคนที่ใช้ภาษาอังกฤษเป็นหลัก แต่บางทีก็อยากพิมภาษาไทย หรือนึกคำอังกฤษไม่ออก —
hook ตัวนี้ detect ภาษาจาก prompt แล้วสลับ mode ให้อัตโนมัติ ไม่ต้องพิมคำสั่งเพิ่ม

*For bilingual users who mostly type English but sometimes switch to Thai.*

---

## ทำอะไร / What it does

Hook ตรวจ prompt ทุก turn:

- **Thai ≥15% ของ alpha chars** → inject [pordee](https://github.com/kerlos/pordee) full rules — ตอบไทยกระชับ ตัดคำสุภาพ/ลังเล
- **English** → inject [caveman](https://github.com/JuliusBrussee/caveman) full rules — terse, no filler, fragments OK

ทั้งสองโหมดเป็น **full** (ประหยัด token สูงสุด)

```
"แก้ bug นี้ให้หน่อย" → pordee full (ตอบไทย)
"fix this bug"          → caveman full (terse English)
"ช่วย debug นี้ด้วย"   → pordee full (Thai ≥15%)
```

---

## ติดตั้ง / Install

### 1. Copy hook

**macOS / Linux**
```bash
mkdir -p ~/.claude/hooks
cp hooks/lang-auto-switch.js ~/.claude/hooks/
```

**Windows (PowerShell)**
```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\hooks"
Copy-Item hooks\lang-auto-switch.js "$env:USERPROFILE\.claude\hooks\"
```

### 2. เพิ่มใน `~/.claude/settings.json`

เปิด `~/.claude/settings.json` แล้วเพิ่ม hook ใน `UserPromptSubmit`:

**macOS / Linux**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/lang-auto-switch.js",
            "timeout": 5,
            "statusMessage": "Detecting language..."
          }
        ]
      }
    ]
  }
}
```

**Windows**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"C:\\Program Files\\nodejs\\node.exe\" \"%USERPROFILE%\\.claude\\hooks\\lang-auto-switch.js\"",
            "timeout": 5,
            "statusMessage": "Detecting language..."
          }
        ]
      }
    ]
  }
}
```

> ถ้ามี hook อื่นอยู่แล้ว ให้เพิ่ม `lang-auto-switch` เป็นตัว **แรก** ใน hooks array ของ `UserPromptSubmit`

### 3. (ถ้าใช้ caveman plugin) ปิด auto-activate

caveman plugin activate ทุก session start โดย default. ปิดได้ด้วย:

**macOS / Linux:** `~/.config/caveman/config.json`
**Windows:** `%APPDATA%\caveman\config.json`

```json
{ "defaultMode": "off" }
```

ไม่งั้น caveman จะ inject rules ทับทุก session start แม้จะพิมไทย

---

## Manual override

ถ้าอยากบังคับ mode โดยไม่ให้ auto-switch ทำงาน:

| พิม | ผล |
|---|---|
| `พอดี` | force pordee full |
| `หยุดพอดี` / `พูดปกติ` | ปิด pordee |
| `/caveman full` | force caveman full |
| `stop caveman` / `normal mode` | ปิด caveman |

Auto-switch จะ skip บน prompt เหล่านี้แล้วให้ pordee/caveman plugin จัดการเอง

---

## ต้องการ dependency ไหม / Dependencies

| Dependency | จำเป็น? |
|---|---|
| Node.js ≥18 | ✅ required |
| [caveman plugin](https://github.com/JuliusBrussee/caveman) | optional — ถ้าอยากใช้ `/caveman` commands |
| [pordee plugin](https://github.com/kerlos/pordee) | optional — ถ้าอยากใช้ `/pordee` commands |

Hook ตัวนี้ทำงานได้ standalone โดยไม่ต้องติดตั้ง caveman หรือ pordee — rules ถูก inject ตรงจาก hook เอง

---

## Language detection

threshold: Thai ≥15% ของ alpha characters (หลัง strip code fences)

```
"debug นี้ให้ที"            → 2/7 alpha = 29% Thai → pordee
"fix this debug นี้"        → 2/9 alpha = 22% Thai → pordee  
"fix this bug (type ไทย)"   → 2/14 = 14% Thai → caveman
"fix this bug entirely"     → 0% Thai → caveman
```

ปรับ threshold ได้ใน `lang-auto-switch.js` บรรทัด `>= 0.15`

---

## License

MIT
