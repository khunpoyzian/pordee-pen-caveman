#!/usr/bin/env node
// pordee-pen-caveman installer
// Run: node install.js

const fs = require('fs');
const path = require('path');
const os = require('os');

const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD  = '\x1b[1m';
const RESET = '\x1b[0m';

function ok(msg)   { console.log(`${GREEN}✓${RESET} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}!${RESET} ${msg}`); }
function fail(msg) { console.log(`${RED}✗${RESET} ${msg}`); }
function info(msg) { console.log(`  ${msg}`); }

// ── Paths ────────────────────────────────────────────────────────────────────

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const hooksDir  = path.join(claudeDir, 'hooks');
const settingsPath = path.join(claudeDir, 'settings.json');

const hookSrc  = path.join(__dirname, 'hooks', 'lang-auto-switch.js');
const hookDest = path.join(hooksDir, 'lang-auto-switch.js');

const cavemanConfigDir = (() => {
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, 'caveman');
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'caveman');
  }
  return path.join(os.homedir(), '.config', 'caveman');
})();
const cavemanConfigPath = path.join(cavemanConfigDir, 'config.json');

// ── Node version check ───────────────────────────────────────────────────────

const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  fail(`Node.js 18+ required (you have ${process.version})`);
  info('Download from https://nodejs.org');
  process.exit(1);
}

console.log(`\n${BOLD}pordee-pen-caveman installer${RESET}\n`);

// ── Step 1: Copy hook ────────────────────────────────────────────────────────

try {
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.copyFileSync(hookSrc, hookDest);
  ok(`Hook copied → ${hookDest}`);
} catch (e) {
  fail(`Could not copy hook: ${e.message}`);
  process.exit(1);
}

// ── Step 2: Patch settings.json ─────────────────────────────────────────────

const nodeExe = process.execPath;
const hookCommand = process.platform === 'win32'
  ? `"${nodeExe}" "${hookDest}"`
  : `node "${hookDest}"`;

const newHook = {
  type: 'command',
  command: hookCommand,
  timeout: 5,
  statusMessage: 'Detecting language...'
};

let settings = {};
try {
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }
} catch (e) {
  warn(`Could not read settings.json (${e.message}) — will create fresh`);
  settings = {};
}

if (!settings.hooks) settings.hooks = {};
if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];

// Check if already installed
const alreadyInstalled = settings.hooks.UserPromptSubmit.some(group =>
  Array.isArray(group.hooks) &&
  group.hooks.some(h => h.command && h.command.includes('lang-auto-switch'))
);

if (alreadyInstalled) {
  warn('lang-auto-switch already in settings.json — skipping (not duplicating)');
} else {
  // Prepend as first hook group so it runs before any caveman/pordee trackers
  settings.hooks.UserPromptSubmit.unshift({ hooks: [newHook] });

  try {
    const tmp = settingsPath + '.tmp.' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, settingsPath);
    ok(`settings.json updated → ${settingsPath}`);
  } catch (e) {
    fail(`Could not update settings.json: ${e.message}`);
    info('Add this manually to your settings.json:');
    info(JSON.stringify({ hooks: { UserPromptSubmit: [{ hooks: [newHook] }] } }, null, 2));
    process.exit(1);
  }
}

// ── Step 3: Set caveman default to "off" (if caveman installed) ──────────────

const cavemanFlagPath = path.join(claudeDir, '.caveman-active');
const cavemanInstalled = fs.existsSync(cavemanFlagPath) || fs.existsSync(cavemanConfigPath);

if (cavemanInstalled || fs.existsSync(path.join(claudeDir, 'hooks', 'caveman-activate.js'))) {
  try {
    fs.mkdirSync(cavemanConfigDir, { recursive: true });
    let cavemanConfig = {};
    try { cavemanConfig = JSON.parse(fs.readFileSync(cavemanConfigPath, 'utf8')); } catch (e) {}
    cavemanConfig.defaultMode = 'off';
    fs.writeFileSync(cavemanConfigPath, JSON.stringify(cavemanConfig, null, 2) + '\n', 'utf8');
    ok('caveman defaultMode set to "off" (lang-auto-switch takes over per-turn)');
  } catch (e) {
    warn(`Could not update caveman config: ${e.message}`);
  }
} else {
  info('caveman not detected — skipping caveman config');
}

// ── Done ─────────────────────────────────────────────────────────────────────

console.log(`
${GREEN}${BOLD}Done!${RESET}

Restart Claude Code, then try:
  ${BOLD}Thai prompt${RESET}  → Claude replies in concise Thai (pordee mode)
  ${BOLD}English prompt${RESET} → Claude replies terse English (caveman mode)

Manual overrides:
  ${BOLD}พอดี${RESET}           force Thai mode
  ${BOLD}หยุดพอดี${RESET}       stop Thai mode
  ${BOLD}/caveman full${RESET}   force English mode
  ${BOLD}stop caveman${RESET}    stop English mode
`);
