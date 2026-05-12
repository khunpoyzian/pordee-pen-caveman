#!/usr/bin/env node
// lang-auto-switch — UserPromptSubmit hook
// Detects Thai vs English. Thai → emits pordee full rules. English → sets caveman flag
// so the caveman plugin's own hook emits the reminder (avoids duplicate injection).
// Register ONLY this hook in UserPromptSubmit — do not also register caveman-mode-tracker
// or pordee-mode-tracker, as those cause duplicate context emissions.

const fs = require('fs');
const path = require('path');
const os = require('os');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const cavemanFlagPath = path.join(claudeDir, '.caveman-active');

const PORDEE_HOME = process.env.PORDEE_HOME || path.join(os.homedir(), '.pordee');
const PORDEE_STATE_PATH = path.join(PORDEE_HOME, 'state.json');

// Pordee slash/keyword triggers (full trimmed match or regex)
const PORDEE_ENABLE_TRIGGERS = ['พอดีโหมด', 'พูดสั้นๆ', 'พอดี'];
const PORDEE_DISABLE_TRIGGERS = ['หยุดพอดี', 'พูดปกติ'];
const PORDEE_SLASH_RE = /^\/pordee(?::pordee)?(?:\s+\w+)?$/i;

// Caveman slash/natural-language triggers
const CAVEMAN_SLASH_RE = /^\/caveman(?::caveman)?(?:[-:]\w+)?(?:\s+\w+)?$/i;
const CAVEMAN_ENABLE_RE = /\b(activate|enable|turn on|start|talk like)\b.*\bcaveman\b/i;
const CAVEMAN_DISABLE_RE = /\b(stop|disable|deactivate|turn off)\b.*\bcaveman\b|\bcaveman\b.*\b(stop|disable|deactivate|turn off)\b|\bnormal mode\b/i;

// Stats commands — skip, handled elsewhere
const STATS_RE = /^\/(?:pordee|caveman).*-stats/i;

function classifyTrigger(prompt) {
  const trimmed = prompt.trim();

  if (STATS_RE.test(trimmed)) return 'stats';

  // Pordee disable first (so "หยุดพอดี" beats "พอดี" substring)
  for (const p of PORDEE_DISABLE_TRIGGERS) {
    if (trimmed === p) return 'pordee-disable';
  }
  for (const p of PORDEE_ENABLE_TRIGGERS) {
    if (trimmed === p) return 'pordee-enable';
  }
  if (PORDEE_SLASH_RE.test(trimmed)) {
    return trimmed.toLowerCase().includes('stop') ? 'pordee-disable' : 'pordee-enable';
  }

  if (CAVEMAN_DISABLE_RE.test(trimmed)) return 'caveman-disable';
  if (CAVEMAN_SLASH_RE.test(trimmed) || CAVEMAN_ENABLE_RE.test(trimmed)) return 'caveman-enable';

  return null; // auto-detect
}

function stripCodeFences(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
}

function detectLanguage(text) {
  const cleaned = stripCodeFences(text);
  const thaiChars = (cleaned.match(/[฀-๿]/g) || []).length;
  const latinChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const total = thaiChars + latinChars;
  if (total === 0) return 'english';
  // Thai if ≥15% of alpha chars are Thai
  return thaiChars / total >= 0.15 ? 'thai' : 'english';
}

function setPordeeState(enabled) {
  try {
    fs.mkdirSync(PORDEE_HOME, { recursive: true });
    const state = { enabled, level: 'full', version: 1, lastChanged: new Date().toISOString() };
    const tmp = PORDEE_STATE_PATH + '.tmp.' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, PORDEE_STATE_PATH);
  } catch (e) {}
}

function setCavemanFlag(value) {
  try {
    if (value === null) {
      try { fs.unlinkSync(cavemanFlagPath); } catch (e) {}
    } else {
      const tmp = cavemanFlagPath + '.tmp.' + process.pid;
      fs.writeFileSync(tmp, value, { mode: 0o600 });
      fs.renameSync(tmp, cavemanFlagPath);
    }
  } catch (e) {}
}

function emit(context) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context
    }
  }));
}

const PORDEE_RULES =
  'PORDEE MODE ACTIVE (full). ' +
  'ตอบภาษาไทยกระชับ. Keep technical English terms exact. ' +
  'Drop: ครับ/ค่ะ/นะคะ/นะครับ, อาจจะ/น่าจะ/จริงๆแล้ว, ได้เลยครับ/แน่นอน. ' +
  'Fragments OK. Short synonyms: ดู not ตรวจสอบ, แก้ not ทำการแก้ไข, เพราะ not เนื่องจาก. ' +
  'Code/commits/security: write normal.';

const CAVEMAN_RULES =
  'CAVEMAN MODE ACTIVE (full). ' +
  'Drop articles/filler/pleasantries/hedging. Fragments OK. ' +
  'Code/commits/security: write normal.';

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || '').toString();
    const trigger = classifyTrigger(prompt);

    if (trigger === 'stats') {
      process.exit(0);
    }

    if (trigger === 'pordee-enable') {
      // Manual /pordee — activate pordee, clear caveman flag, emit rules this turn
      setPordeeState(true);
      setCavemanFlag(null);
      emit(PORDEE_RULES);
      process.exit(0);
    }

    if (trigger === 'pordee-disable') {
      // Manual หยุดพอดี / /pordee stop — clear both, no emit
      setPordeeState(false);
      setCavemanFlag(null);
      process.exit(0);
    }

    if (trigger === 'caveman-enable') {
      // Manual /caveman — caveman plugin handles flag + emit. Just clear pordee.
      setPordeeState(false);
      process.exit(0);
    }

    if (trigger === 'caveman-disable') {
      // Manual stop caveman — clear both, no emit
      setPordeeState(false);
      setCavemanFlag(null);
      process.exit(0);
    }

    // Auto-detect language
    const lang = detectLanguage(prompt);

    if (lang === 'thai') {
      // Thai: emit pordee rules here. Clear caveman flag so caveman plugin stays silent.
      setPordeeState(true);
      setCavemanFlag(null);
      emit(PORDEE_RULES);
    } else {
      // English: write caveman flag so caveman plugin emits the reminder. No emit here.
      setPordeeState(false);
      setCavemanFlag('full');
    }
  } catch (e) {}
  process.exit(0);
});
