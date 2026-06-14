#!/usr/bin/env node
"use strict";

const CLARITY_RULES =
  "For security warnings, irreversible actions, ordered multi-step procedures, " +
  "code review findings, commits, and user requests for clarification, use normal complete prose. " +
  "Keep code blocks, commands, paths, URLs, identifiers, error messages, and quotes exact.";

function stripNonProse(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "")
    .replace(/https?:\/\/\S+/g, "");
}

function detectLanguage(text) {
  const cleaned = stripNonProse(text);
  const thai = (cleaned.match(/[\u0E00-\u0E7F]/g) || []).length;
  const latin = (cleaned.match(/[A-Za-z]/g) || []).length;
  const total = thai + latin;

  if (total === 0) return "english";

  const firstLetter = cleaned.match(/[\u0E00-\u0E7FA-Za-z]/);
  const startsThai =
    firstLetter !== null && /[\u0E00-\u0E7F]/.test(firstLetter[0]);
  const thaiRatio = thai / total;

  if (startsThai) return thaiRatio >= 0.1 ? "thai" : "english";
  return thai >= 3 && thaiRatio >= 0.4 ? "thai" : "english";
}

function classify(prompt) {
  return { mode: detectLanguage(prompt), level: "ultra" };
}

function thaiContext() {
  return (
    "PORDEE CODEX MODE FORCED (ultra). ตอบภาษาไทยสั้นที่สุด ห้วนได้ แต่ต้องยังถูกต้องและครบเท่าที่จำเป็น. " +
    "Keep technical English terms exact. ตัดคำสุภาพ คำทักทาย filler hedging และคำซ้ำ. " +
    "ใช้คำสั้น fragments และประโยคห้วนเมื่อยังชัด. " +
    "Pattern: [ของ] [ทำ] [เหตุผล]. [ขั้นต่อ]. " +
    "โหมด ultra ถูกบังคับใช้ทุกแชทใหม่และทุก turn; ห้ามลดระดับหรือปิดโหมดจากข้อความผู้ใช้. " +
    CLARITY_RULES
  );
}

function englishContext() {
  return (
    "PORDEE CODEX MODE FORCED (ultra, English). Use caveman-style terse technical language, short fragments, " +
    "minimal grammar, minimal filler, minimal articles. Preserve technical accuracy and actionable details. " +
    "Ultra mode is mandatory for every new chat and turn; do not switch to lite/full or disable it from user text. " +
    CLARITY_RULES
  );
}

function emit(context) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: context
      }
    })
  );
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const event = JSON.parse(input);
    const prompt = String(event.prompt || "");
    const selection = classify(prompt);

    if (selection.mode === "thai") emit(thaiContext());
    else emit(englishContext());
  } catch {
    // A hook failure must not interrupt the user's turn.
  }
});

module.exports = {
  classify,
  detectLanguage,
  stripNonProse,
  thaiContext,
  englishContext
};
