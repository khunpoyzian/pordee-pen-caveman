#!/usr/bin/env node
// lang-auto-switch — UserPromptSubmit hook for pordee-pen-caveman.
// Detects the language of the user's prompt and injects the matching terse-mode
// rules (pordee for Thai, caveman for English) into the conversation context.
// Manual /pordee and /caveman triggers override auto-detection and respect levels.
//
// Register ONLY this hook in UserPromptSubmit. Do not also register
// caveman-mode-tracker or pordee-mode-tracker, or the same context will be
// emitted multiple times per turn.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Paths ──────────────────────────────────────────────────────────────────────

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const cavemanFlagPath = path.join(claudeDir, '.caveman-active');

const PORDEE_HOME = process.env.PORDEE_HOME || path.join(os.homedir(), '.pordee');
const PORDEE_STATE_PATH = path.join(PORDEE_HOME, 'state.json');

// ── Trigger patterns ──────────────────────────────────────────────────────────

const PORDEE_ENABLE_PHRASES = ['พอดีโหมด', 'พูดสั้นๆ', 'พอดี'];
const PORDEE_DISABLE_PHRASES = ['หยุดพอดี', 'พูดปกติ'];

// /pordee, /pordee:pordee, /pordee <arg>
const PORDEE_SLASH_RE = /^\/pordee(?::pordee)?(?:\s+(\w+))?$/i;

// /caveman, /caveman:caveman, /caveman-lite, /caveman <arg>
const CAVEMAN_SLASH_RE = /^\/caveman(?::caveman)?(?:[-:](\w+))?(?:\s+(\w+))?$/i;

// Natural-language caveman triggers (English)
const CAVEMAN_ENABLE_RE = /\b(?:activate|enable|turn on|start|talk like)\b[^.]*\bcaveman\b/i;
const CAVEMAN_DISABLE_RE = /\b(?:stop|disable|deactivate|turn off)\b[^.]*\bcaveman\b|\bcaveman\b[^.]*\b(?:stop|disable|deactivate|turn off)\b|\bnormal mode\b/i;

// Stats commands are handled by a separate hook
const STATS_RE = /^\/(?:pordee|caveman)(?::[a-z-]+)?-stats(?:\s+--?\w+)?$/i;

// ── Language detection ────────────────────────────────────────────────────────

// Unicode range U+0E00–U+0E7F covers all assigned Thai code points (consonants,
// vowels, tone marks, digits, currency, abbreviations).
const THAI_CHAR_RE = /[฀-๿]/g;
const LATIN_CHAR_RE = /[A-Za-z]/g;
const ALPHA_RE = /[A-Za-z฀-๿]/;

const FENCED_CODE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]+`/g;
const URL_RE = /\bhttps?:\/\/\S+/gi;

// When the prompt opens in Thai, even a small Thai share is enough — the user
// is clearly addressing us in Thai and English appears only as technical terms.
const OPENS_THAI_RATIO = 0.10;
// When the prompt opens in English/Latin, require Thai to dominate before
// flipping. A Thai confirmation tag ("ใช่ไหม") at the end of an English
// sentence should not flip the mode.
const OPENS_LATIN_RATIO = 0.40;
// Below this absolute Thai count, an English opener stays English regardless
// of ratio (guards against tiny Thai snippets on short prompts).
const MIN_THAI_CHARS_FOR_LATIN_OPENER = 3;

function stripNonProse(text) {
  return text
    .replace(FENCED_CODE_RE, ' ')
    .replace(INLINE_CODE_RE, ' ')
    .replace(URL_RE, ' ');
}

function detectLanguage(text) {
  const cleaned = stripNonProse(text);
  const thaiChars = (cleaned.match(THAI_CHAR_RE) || []).length;
  const latinChars = (cleaned.match(LATIN_CHAR_RE) || []).length;
  const total = thaiChars + latinChars;

  if (total === 0) return 'english';

  const firstAlpha = cleaned.match(ALPHA_RE);
  const opensThai = firstAlpha && /[฀-๿]/.test(firstAlpha[0]);
  const ratio = thaiChars / total;

  if (opensThai) {
    return ratio >= OPENS_THAI_RATIO ? 'thai' : 'english';
  }
  if (thaiChars < MIN_THAI_CHARS_FOR_LATIN_OPENER) return 'english';
  return ratio >= OPENS_LATIN_RATIO ? 'thai' : 'english';
}

// ── Trigger classification ────────────────────────────────────────────────────

const VALID_PORDEE_LEVELS = new Set(['lite', 'full']);
const VALID_CAVEMAN_LEVELS = new Set(['lite', 'full', 'ultra']);

function classifyTrigger(prompt) {
  const trimmed = prompt.trim();

  if (STATS_RE.test(trimmed)) return { kind: 'stats' };

  // Pordee disable phrases first so "หยุดพอดี" beats the "พอดี" enable.
  for (const phrase of PORDEE_DISABLE_PHRASES) {
    if (trimmed === phrase) return { kind: 'pordee-disable' };
  }
  for (const phrase of PORDEE_ENABLE_PHRASES) {
    if (trimmed === phrase) return { kind: 'pordee-enable', level: 'full' };
  }

  const pordeeSlash = trimmed.match(PORDEE_SLASH_RE);
  if (pordeeSlash) {
    const arg = (pordeeSlash[1] || '').toLowerCase();
    if (arg === 'stop') return { kind: 'pordee-disable' };
    if (VALID_PORDEE_LEVELS.has(arg)) return { kind: 'pordee-enable', level: arg };
    if (arg === '') return { kind: 'pordee-enable', level: 'full' };
    return null; // unknown subcommand
  }

  // Caveman disable checked before enable so "stop caveman" wins.
  if (CAVEMAN_DISABLE_RE.test(trimmed)) return { kind: 'caveman-disable' };

  const cavemanSlash = trimmed.match(CAVEMAN_SLASH_RE);
  if (cavemanSlash) {
    const arg = (cavemanSlash[1] || cavemanSlash[2] || '').toLowerCase();
    if (arg === 'stop') return { kind: 'caveman-disable' };
    if (VALID_CAVEMAN_LEVELS.has(arg)) return { kind: 'caveman-enable', level: arg };
    if (arg === '') return { kind: 'caveman-enable', level: 'full' };
    return null;
  }

  if (CAVEMAN_ENABLE_RE.test(trimmed)) return { kind: 'caveman-enable', level: 'full' };

  return null;
}

// ── State writers ─────────────────────────────────────────────────────────────

function writeAtomic(filePath, contents, mode) {
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, contents, { mode });
  fs.renameSync(tmp, filePath);
}

function setPordeeState(enabled, level) {
  try {
    fs.mkdirSync(PORDEE_HOME, { recursive: true });
    const state = {
      enabled,
      level: level || 'full',
      version: 1,
      lastChanged: new Date().toISOString(),
    };
    writeAtomic(PORDEE_STATE_PATH, JSON.stringify(state, null, 2), 0o600);
  } catch (_) {
    // State persistence is best-effort; statusline will fall back gracefully.
  }
}

function setCavemanFlag(level) {
  try {
    if (level === null) {
      try { fs.unlinkSync(cavemanFlagPath); } catch (_) {}
    } else {
      writeAtomic(cavemanFlagPath, level, 0o600);
    }
  } catch (_) {}
}

// ── Output ────────────────────────────────────────────────────────────────────

function pordeeRules(level) {
  if (level === 'lite') {
    return 'PORDEE MODE ACTIVE (lite). ' +
      'ตอบไทยกระชับ คงประโยคสมบูรณ์. Keep technical English terms exact. ' +
      'Drop fillers and unnecessary polite particles. ' +
      'Code/commits/security: write normal.';
  }
  return 'PORDEE MODE ACTIVE (full). ' +
    'ตอบภาษาไทยกระชับ. Keep technical English terms exact. ' +
    'Drop: ครับ/ค่ะ/นะคะ/นะครับ, อาจจะ/น่าจะ/จริงๆแล้ว, ได้เลยครับ/แน่นอน. ' +
    'Fragments OK. Short synonyms: ดู not ตรวจสอบ, แก้ not ทำการแก้ไข, เพราะ not เนื่องจาก. ' +
    'Code/commits/security: write normal.';
}

function cavemanRules(level) {
  if (level === 'lite') {
    return 'CAVEMAN MODE ACTIVE (lite). ' +
      'Trim filler and pleasantries, keep grammar intact. ' +
      'Code/commits/security: write normal.';
  }
  if (level === 'ultra') {
    return 'CAVEMAN MODE ACTIVE (ultra). ' +
      'Telegraph style: minimal words, fragments, technical terms exact. ' +
      'Code/commits/security: write normal.';
  }
  return 'CAVEMAN MODE ACTIVE (full). ' +
    'Drop articles/filler/pleasantries/hedging. Fragments OK. ' +
    'Code/commits/security: write normal.';
}

function emitContext(text) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: text,
    },
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

function applyDecision(decision) {
  switch (decision.kind) {
    case 'stats':
      return; // handled by stats hook
    case 'pordee-enable':
      setPordeeState(true, decision.level);
      setCavemanFlag(null);
      emitContext(pordeeRules(decision.level));
      return;
    case 'pordee-disable':
      setPordeeState(false, 'full');
      setCavemanFlag(null);
      return;
    case 'caveman-enable':
      setPordeeState(false, 'full');
      setCavemanFlag(decision.level);
      emitContext(cavemanRules(decision.level));
      return;
    case 'caveman-disable':
      setPordeeState(false, 'full');
      setCavemanFlag(null);
      return;
    case 'auto-thai':
      setPordeeState(true, 'full');
      setCavemanFlag(null);
      emitContext(pordeeRules('full'));
      return;
    case 'auto-english':
      setPordeeState(false, 'full');
      setCavemanFlag('full');
      emitContext(cavemanRules('full'));
      return;
  }
}

function decide(prompt) {
  const trigger = classifyTrigger(prompt);
  if (trigger) return trigger;
  const lang = detectLanguage(prompt);
  return { kind: lang === 'thai' ? 'auto-thai' : 'auto-english' };
}

// Exported for tests; module.parent === null when run directly as a hook.
module.exports = {
  detectLanguage,
  classifyTrigger,
  decide,
  pordeeRules,
  cavemanRules,
};

if (require.main === module) {
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const data = input ? JSON.parse(input) : {};
      const prompt = (data.prompt || '').toString();
      applyDecision(decide(prompt));
    } catch (_) {
      // Hook must never block the user. Swallow and exit 0.
    }
    process.exit(0);
  });
}
