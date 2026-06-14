#!/usr/bin/env node
"use strict";

const PORDEE_ENABLE = new Set(["พอดี", "พอดีโหมด", "พูดสั้นๆ"]);
const PORDEE_DISABLE = new Set(["หยุดพอดี", "พูดปกติ"]);
const PORDEE_NATURAL = /^(?:พอดี|พอดีโหมด)(?:\s+(lite|full|stop))?$/i;
const PORDEE_SLASH = /^\/pordee(?:\s+(lite|full|stop))?$/i;
const CAVEMAN_SLASH = /^\/caveman(?:\s+(lite|full|ultra|stop))?$/i;
const CAVEMAN_ENABLE =
  /\b(?:activate|enable|start|talk like|use)\b.*\bcaveman\b/i;
const CAVEMAN_DISABLE =
  /\b(?:stop|disable|deactivate|turn off)\b.*\bcaveman\b|\bnormal mode\b/i;

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
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  if (PORDEE_DISABLE.has(trimmed)) return { mode: "normal" };

  const naturalPordee = trimmed.match(PORDEE_NATURAL);
  if (naturalPordee) {
    if (naturalPordee[1]?.toLowerCase() === "stop") return { mode: "normal" };
    return {
      mode: "thai",
      level: naturalPordee[1]?.toLowerCase() || "full"
    };
  }

  if (PORDEE_ENABLE.has(trimmed)) return { mode: "thai", level: "full" };

  const pordee = trimmed.match(PORDEE_SLASH);
  if (pordee) {
    if (pordee[1]?.toLowerCase() === "stop") return { mode: "normal" };
    return { mode: "thai", level: pordee[1]?.toLowerCase() || "full" };
  }

  const caveman = trimmed.match(CAVEMAN_SLASH);
  if (caveman) {
    if (caveman[1]?.toLowerCase() === "stop") return { mode: "normal" };
    return {
      mode: "english",
      level: caveman[1]?.toLowerCase() || "full"
    };
  }

  if (CAVEMAN_DISABLE.test(lower)) return { mode: "normal" };
  if (CAVEMAN_ENABLE.test(lower)) return { mode: "english", level: "full" };

  return { mode: detectLanguage(prompt), level: "full" };
}

function thaiContext(level) {
  if (level === "lite") {
    return (
      "PORDEE MODE ACTIVE (lite). ตอบภาษาไทยกระชับแต่ใช้ไวยากรณ์เต็ม. " +
      "Keep technical English terms exact. ตัดคำสุภาพ คำทักทาย filler และ hedging ที่ไม่เพิ่มความหมาย. " +
      CLARITY_RULES
    );
  }

  return (
    "PORDEE MODE ACTIVE (full). ตอบภาษาไทยให้สั้นแต่ครบและถูกต้อง. " +
    "Keep technical English terms exact. ตัดคำสุภาพ คำทักทาย filler hedging และคำซ้ำ. " +
    "ใช้คำสั้นและประโยคสั้น; fragments ใช้ได้เมื่อยังชัด. " +
    "Pattern: [ของ] [ทำ] [เหตุผล]. [ขั้นต่อ]. " +
    CLARITY_RULES
  );
}

function englishContext(level) {
  if (level === "lite") {
    return (
      "CONCISE ENGLISH MODE ACTIVE (lite). Use complete professional sentences. " +
      "Remove pleasantries, filler, repetition, and unnecessary hedging. " +
      CLARITY_RULES
    );
  }

  if (level === "ultra") {
    return (
      "CONCISE ENGLISH MODE ACTIVE (ultra). Use terse technical language and short fragments. " +
      "Keep all necessary facts, caveats, and verification results. " +
      CLARITY_RULES
    );
  }

  return (
    "CONCISE ENGLISH MODE ACTIVE (full). Remove pleasantries, filler, repetition, articles when optional, " +
    "and unnecessary hedging. Short sentences and clear fragments are acceptable. " +
    "Preserve technical accuracy and actionable details. " +
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

    if (selection.mode === "normal") process.exit(0);
    if (selection.mode === "thai") emit(thaiContext(selection.level));
    else emit(englishContext(selection.level));
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
