#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const hook = path.join(__dirname, "..", "hooks", "pordee-force-ultra.js");

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

assert.match(context("ช่วยแก้ React component นี้"), /FORCED \(ultra\)/);
assert.match(context("ช่วยแก้ React component นี้"), /โหมด ultra ถูกบังคับใช้/);
assert.match(context("Fix this React component"), /FORCED \(ultra, English\)/);
assert.match(context("Fix this React component"), /Ultra mode is mandatory/);
assert.match(context("normal mode"), /FORCED \(ultra, English\)/);

console.log("pordee force-ultra hook tests passed");
