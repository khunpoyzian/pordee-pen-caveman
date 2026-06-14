#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const hook = path.join(__dirname, "..", "hooks", "pordee-auto.js");

function run(prompt) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ prompt, turn_id: "test-turn" }),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout) : null;
}

function context(prompt) {
  return run(prompt)?.hookSpecificOutput?.additionalContext || "";
}

assert.match(context("ช่วยแก้ React component นี้"), /PORDEE MODE ACTIVE/);
assert.match(context("Fix this React component"), /CONCISE ENGLISH MODE ACTIVE/);
assert.match(context("/pordee lite"), /\(lite\)/);
assert.match(context("พอดี lite"), /\(lite\)/);
assert.match(context("/caveman ultra"), /\(ultra\)/);
assert.equal(run("พูดปกติ"), null);
assert.equal(run("normal mode"), null);
assert.match(
  context("ช่วยดู `const englishOnly = true` ให้หน่อย"),
  /PORDEE MODE ACTIVE/
);
assert.match(
  context("Review this code: ```js\nconst ข้อมูล = true;\n```"),
  /CONCISE ENGLISH MODE ACTIVE/
);

console.log("pordee-codex hook tests passed");
