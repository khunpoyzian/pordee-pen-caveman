'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOK_PATH = path.join(__dirname, '..', 'hooks', 'lang-auto-switch.js');
const { detectLanguage, classifyTrigger, decide } = require(HOOK_PATH);

// ── detectLanguage ────────────────────────────────────────────────────────────

const detectCases = [
  { name: 'pure Thai',                     input: 'ทำไม React component re-render?',                  expected: 'thai' },
  { name: 'pure English',                  input: 'Why does my React component re-render?',           expected: 'english' },
  { name: 'Thai + English code terms',     input: 'แก้ bug ใน auth middleware ที่ใช้ < แทน <=',          expected: 'thai' },
  { name: 'single Thai word in English',   input: 'Add useMemo so React does not re-render ใช่ไหม',   expected: 'english' },
  { name: 'two Thai chars in English',     input: 'add ใช useMemo to memoize this object reference',  expected: 'english' },
  { name: 'empty string',                  input: '',                                                  expected: 'english' },
  { name: 'whitespace only',               input: '   \n\t  ',                                         expected: 'english' },
  { name: 'numbers only',                  input: '123 456 789',                                       expected: 'english' },
  { name: 'fenced code block only',        input: '```\nconst foo = () => 1;\n```',                    expected: 'english' },
  { name: 'Thai prose + code fence',       input: 'อธิบาย code นี้\n```\nconst longName = 1;\n```',    expected: 'thai' },
  { name: 'Thai inline code',              input: 'ใช้ `useMemo` แทน inline object เสมอ',              expected: 'thai' },
  { name: 'Thai prose + long URL',         input: 'ดู https://very-long-domain.example.com/foo/bar',  expected: 'thai' },
  { name: 'English prose + URL',           input: 'Open https://example.com and click next',           expected: 'english' },
  { name: 'Thai-romanized (no Thai chars)', input: 'pim eng tham ngan dai mai',                        expected: 'english' },
  { name: '50/50 mix favours Thai',        input: 'สวัสดี hello world',                                expected: 'thai' },
];

for (const tc of detectCases) {
  test(`detectLanguage: ${tc.name}`, () => {
    assert.equal(detectLanguage(tc.input), tc.expected);
  });
}

// ── classifyTrigger ───────────────────────────────────────────────────────────

const triggerCases = [
  { input: 'พอดี',              expected: { kind: 'pordee-enable', level: 'full' } },
  { input: 'พอดีโหมด',          expected: { kind: 'pordee-enable', level: 'full' } },
  { input: 'พูดสั้นๆ',           expected: { kind: 'pordee-enable', level: 'full' } },
  { input: 'หยุดพอดี',          expected: { kind: 'pordee-disable' } },
  { input: 'พูดปกติ',           expected: { kind: 'pordee-disable' } },
  { input: '/pordee',           expected: { kind: 'pordee-enable', level: 'full' } },
  { input: '/pordee lite',      expected: { kind: 'pordee-enable', level: 'lite' } },
  { input: '/pordee full',      expected: { kind: 'pordee-enable', level: 'full' } },
  { input: '/pordee stop',      expected: { kind: 'pordee-disable' } },
  { input: '/PORDEE LITE',      expected: { kind: 'pordee-enable', level: 'lite' } },
  { input: '/caveman',          expected: { kind: 'caveman-enable', level: 'full' } },
  { input: '/caveman lite',     expected: { kind: 'caveman-enable', level: 'lite' } },
  { input: '/caveman full',     expected: { kind: 'caveman-enable', level: 'full' } },
  { input: '/caveman ultra',    expected: { kind: 'caveman-enable', level: 'ultra' } },
  { input: '/caveman-lite',     expected: { kind: 'caveman-enable', level: 'lite' } },
  { input: '/caveman stop',     expected: { kind: 'caveman-disable' } },
  { input: 'talk like caveman', expected: { kind: 'caveman-enable', level: 'full' } },
  { input: 'stop caveman',      expected: { kind: 'caveman-disable' } },
  { input: 'normal mode',       expected: { kind: 'caveman-disable' } },
  { input: '/pordee-stats',     expected: { kind: 'stats' } },
  { input: '/pordee-stats --share', expected: { kind: 'stats' } },
];

for (const tc of triggerCases) {
  test(`classifyTrigger: "${tc.input}"`, () => {
    assert.deepEqual(classifyTrigger(tc.input), tc.expected);
  });
}

test('classifyTrigger: regular text returns null', () => {
  assert.equal(classifyTrigger('how do I write a python script'), null);
  assert.equal(classifyTrigger('ไม่พอดีกับขนาดของกล่อง'), null);
});

test('classifyTrigger: unknown subcommand returns null', () => {
  assert.equal(classifyTrigger('/pordee xyz'), null);
  assert.equal(classifyTrigger('/caveman xyz'), null);
});

// ── decide (trigger > auto-detect) ────────────────────────────────────────────

test('decide: manual trigger overrides auto-detect', () => {
  assert.deepEqual(decide('พอดี'), { kind: 'pordee-enable', level: 'full' });
});

test('decide: Thai prose falls through to auto-thai', () => {
  assert.deepEqual(decide('ทำไม component re-render'), { kind: 'auto-thai' });
});

test('decide: English prose falls through to auto-english', () => {
  assert.deepEqual(decide('how do I write a python script'), { kind: 'auto-english' });
});

// ── End-to-end hook invocation ────────────────────────────────────────────────

function runHook(prompt, env = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pordee-hook-'));
  const claudeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-hook-'));
  const result = spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify({ prompt }),
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      PORDEE_HOME: home,
      CLAUDE_CONFIG_DIR: claudeHome,
      ...env,
    },
  });
  let stdout = null;
  try { stdout = result.stdout ? JSON.parse(result.stdout) : null; } catch (_) {}
  const statePath = path.join(home, 'state.json');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
  const cavemanFlag = path.join(claudeHome, '.caveman-active');
  const caveman = fs.existsSync(cavemanFlag) ? fs.readFileSync(cavemanFlag, 'utf8') : null;
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(claudeHome, { recursive: true, force: true });
  return { exit: result.status, stdout, state, caveman };
}

test('end-to-end: Thai prompt enables pordee full and emits pordee rules', () => {
  const r = runHook('ทำไม component re-render?');
  assert.equal(r.exit, 0);
  assert.equal(r.state.enabled, true);
  assert.equal(r.state.level, 'full');
  assert.equal(r.caveman, null);
  assert.match(r.stdout.hookSpecificOutput.additionalContext, /PORDEE MODE ACTIVE/);
});

test('end-to-end: English prompt sets caveman full and emits caveman rules', () => {
  const r = runHook('Why does my component re-render?');
  assert.equal(r.exit, 0);
  assert.equal(r.state.enabled, false);
  assert.equal(r.caveman, 'full');
  assert.match(r.stdout.hookSpecificOutput.additionalContext, /CAVEMAN MODE ACTIVE/);
});

test('end-to-end: /pordee lite is respected at the state level', () => {
  const r = runHook('/pordee lite');
  assert.equal(r.state.enabled, true);
  assert.equal(r.state.level, 'lite');
  assert.match(r.stdout.hookSpecificOutput.additionalContext, /PORDEE MODE ACTIVE \(lite\)/);
});

test('end-to-end: /caveman ultra is respected at the flag level', () => {
  const r = runHook('/caveman ultra');
  assert.equal(r.caveman, 'ultra');
  assert.match(r.stdout.hookSpecificOutput.additionalContext, /CAVEMAN MODE ACTIVE \(ultra\)/);
});

test('end-to-end: stats command exits silently for the downstream stats hook', () => {
  const r = runHook('/pordee-stats');
  assert.equal(r.exit, 0);
  assert.equal(r.stdout, null);
});

test('end-to-end: malformed stdin does not throw and exits 0', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pordee-hook-'));
  const result = spawnSync(process.execPath, [HOOK_PATH], {
    input: 'this is not json',
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, PORDEE_HOME: home },
  });
  fs.rmSync(home, { recursive: true, force: true });
  assert.equal(result.status, 0);
});
