#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("node:child_process");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const REPO_ROOT = __dirname;
const CODEX_PLUGIN_NAME = "pordee-codex";
const CODEX_MARKETPLACE_NAME = "pordee-codex";

function ok(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function warn(msg) {
  console.log(`${YELLOW}!${RESET} ${msg}`);
}

function fail(msg) {
  console.log(`${RED}✗${RESET} ${msg}`);
}

function info(msg) {
  console.log(`  ${msg}`);
}

function normalizeOutput(text) {
  return String(text || "").trim();
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    cwd: REPO_ROOT,
    ...options
  });

  return {
    status: result.status,
    error: result.error,
    stdout: normalizeOutput(result.stdout),
    stderr: normalizeOutput(result.stderr)
  };
}

function ensureNode18() {
  const [major] = process.versions.node.split(".").map(Number);
  if (major >= 18) return true;

  fail(`Node.js 18+ required (you have ${process.version})`);
  info("Download from https://nodejs.org");
  return false;
}

function installClaude() {
  const claudeDir =
    process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const hooksDir = path.join(claudeDir, "hooks");
  const settingsPath = path.join(claudeDir, "settings.json");

  const hookSrc = path.join(REPO_ROOT, "hooks", "lang-auto-switch.js");
  const hookDest = path.join(hooksDir, "lang-auto-switch.js");

  const cavemanConfigDir = (() => {
    if (process.env.XDG_CONFIG_HOME) {
      return path.join(process.env.XDG_CONFIG_HOME, "caveman");
    }
    if (process.platform === "win32") {
      return path.join(
        process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
        "caveman"
      );
    }
    return path.join(os.homedir(), ".config", "caveman");
  })();
  const cavemanConfigPath = path.join(cavemanConfigDir, "config.json");

  try {
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.copyFileSync(hookSrc, hookDest);
    ok(`Claude hook copied -> ${hookDest}`);
  } catch (error) {
    fail(`Could not copy Claude hook: ${error.message}`);
    return false;
  }

  const nodeExe = process.execPath;
  const hookCommand =
    process.platform === "win32"
      ? `"${nodeExe}" "${hookDest}"`
      : `node "${hookDest}"`;

  const newHook = {
    type: "command",
    command: hookCommand,
    timeout: 5,
    statusMessage: "Detecting language..."
  };

  let settings = {};
  try {
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    }
  } catch (error) {
    warn(`Could not read settings.json (${error.message}) - will create fresh`);
    settings = {};
  }

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];

  const alreadyInstalled = settings.hooks.UserPromptSubmit.some(
    (group) =>
      Array.isArray(group.hooks) &&
      group.hooks.some(
        (hook) =>
          typeof hook.command === "string" &&
          hook.command.includes("lang-auto-switch")
      )
  );

  if (alreadyInstalled) {
    warn("Claude hook already in settings.json - skipping duplicate entry");
  } else {
    settings.hooks.UserPromptSubmit.unshift({ hooks: [newHook] });

    try {
      const tmp = `${settingsPath}.tmp.${process.pid}`;
      fs.writeFileSync(tmp, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
      fs.renameSync(tmp, settingsPath);
      ok(`Claude settings updated -> ${settingsPath}`);
    } catch (error) {
      fail(`Could not update Claude settings.json: ${error.message}`);
      info("Add this manually to your settings.json:");
      info(
        JSON.stringify(
          { hooks: { UserPromptSubmit: [{ hooks: [newHook] }] } },
          null,
          2
        )
      );
      return false;
    }
  }

  const cavemanFlagPath = path.join(claudeDir, ".caveman-active");
  const cavemanInstalled =
    fs.existsSync(cavemanFlagPath) || fs.existsSync(cavemanConfigPath);

  if (
    cavemanInstalled ||
    fs.existsSync(path.join(claudeDir, "hooks", "caveman-activate.js"))
  ) {
    try {
      fs.mkdirSync(cavemanConfigDir, { recursive: true });
      let cavemanConfig = {};
      try {
        cavemanConfig = JSON.parse(fs.readFileSync(cavemanConfigPath, "utf8"));
      } catch {}
      cavemanConfig.defaultMode = "off";
      fs.writeFileSync(
        cavemanConfigPath,
        `${JSON.stringify(cavemanConfig, null, 2)}\n`,
        "utf8"
      );
      ok('caveman defaultMode set to "off" for Claude');
    } catch (error) {
      warn(`Could not update caveman config: ${error.message}`);
    }
  } else {
    info("caveman not detected - skipping caveman config");
  }

  console.log(`
${GREEN}${BOLD}Claude install done.${RESET}

Restart Claude Code, then try:
  ${BOLD}Thai prompt${RESET}    -> concise Thai
  ${BOLD}English prompt${RESET} -> terse English

Manual overrides:
  ${BOLD}พอดี${RESET}
  ${BOLD}หยุดพอดี${RESET}
  ${BOLD}/caveman full${RESET}
  ${BOLD}stop caveman${RESET}
`);

  return true;
}

function listCodexCandidates() {
  const candidates = [];

  if (process.env.CODEX_CLI_PATH) {
    candidates.push(process.env.CODEX_CLI_PATH);
  }

  if (process.platform === "win32") {
    const binDir = path.join(
      os.homedir(),
      "AppData",
      "Local",
      "OpenAI",
      "Codex",
      "bin"
    );

    if (fs.existsSync(binDir)) {
      for (const entry of fs.readdirSync(binDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        candidates.push(path.join(binDir, entry.name, "codex.exe"));
      }
    }

    candidates.push(path.join(binDir, "codex.exe"));
    candidates.push("codex.exe");
  }

  candidates.push("codex");

  return [...new Set(candidates)];
}

function findCodexExecutable() {
  for (const candidate of listCodexCandidates()) {
    const versionResult = run(candidate, ["--version"]);
    if (versionResult.error || versionResult.status !== 0) continue;

    const pluginAddHelp = run(candidate, ["plugin", "add", "--help"]);
    if (pluginAddHelp.error || pluginAddHelp.status !== 0) continue;

    return candidate;
  }

  return null;
}

function runCodex(codexExe, args) {
  return run(codexExe, args, { cwd: REPO_ROOT });
}

function installCodex() {
  const codexExe = findCodexExecutable();
  if (!codexExe) {
    fail("Could not find a working Codex CLI");
    info("Install Codex desktop/CLI first, or set CODEX_CLI_PATH");
    return false;
  }

  ok(`Using Codex CLI -> ${codexExe}`);

  let marketplaceAdd = runCodex(codexExe, [
    "plugin",
    "marketplace",
    "add",
    REPO_ROOT
  ]);

  const conflictText = `${marketplaceAdd.stdout}\n${marketplaceAdd.stderr}`;
  if (
    marketplaceAdd.status !== 0 &&
    conflictText.includes("already added from a different source")
  ) {
    warn(
      `Marketplace \`${CODEX_MARKETPLACE_NAME}\` points at another source - switching it to this repo`
    );

    const removeResult = runCodex(codexExe, [
      "plugin",
      "marketplace",
      "remove",
      CODEX_MARKETPLACE_NAME
    ]);

    if (removeResult.status !== 0) {
      fail(`Could not remove old Codex marketplace source: ${removeResult.stderr || removeResult.stdout}`);
      return false;
    }

    marketplaceAdd = runCodex(codexExe, [
      "plugin",
      "marketplace",
      "add",
      REPO_ROOT
    ]);
  }

  if (marketplaceAdd.status !== 0) {
    fail(
      `Could not add Codex marketplace: ${marketplaceAdd.stderr || marketplaceAdd.stdout}`
    );
    return false;
  }

  ok(
    marketplaceAdd.stdout ||
      `Codex marketplace \`${CODEX_MARKETPLACE_NAME}\` configured`
  );

  const pluginInstall = runCodex(codexExe, [
    "plugin",
    "add",
    `${CODEX_PLUGIN_NAME}@${CODEX_MARKETPLACE_NAME}`,
    "--json"
  ]);

  if (pluginInstall.status !== 0) {
    fail(
      `Could not install Codex plugin: ${pluginInstall.stderr || pluginInstall.stdout}`
    );
    return false;
  }

  try {
    const parsed = JSON.parse(pluginInstall.stdout);
    ok(
      `Codex plugin installed -> ${parsed.installedPath || `${CODEX_PLUGIN_NAME}@${CODEX_MARKETPLACE_NAME}`}`
    );
  } catch {
    ok(
      pluginInstall.stdout ||
        `Codex plugin installed -> ${CODEX_PLUGIN_NAME}@${CODEX_MARKETPLACE_NAME}`
    );
  }

  console.log(`
${GREEN}${BOLD}Codex install done.${RESET}

Start a ${BOLD}new Codex thread${RESET} so the new skill and hook are picked up.
This repo is now registered as marketplace ${BOLD}${CODEX_MARKETPLACE_NAME}${RESET}.
`);

  return true;
}

function printUsage() {
  info("Usage:");
  info("  node install.js          # Claude only (backward compatible)");
  info("  node install.js claude   # Claude only");
  info("  node install.js codex    # Codex plugin only");
  info("  node install.js both     # Claude + Codex");
}

function main() {
  if (!ensureNode18()) {
    process.exit(1);
  }

  const mode = (process.argv[2] || "claude").toLowerCase();
  const validModes = new Set(["claude", "codex", "both"]);

  console.log(`\n${BOLD}pordee-pen-caveman installer${RESET}\n`);

  if (!validModes.has(mode)) {
    fail(`Unknown install target: ${mode}`);
    printUsage();
    process.exit(1);
  }

  let success = true;

  if (mode === "claude" || mode === "both") {
    success = installClaude() && success;
  }

  if (mode === "codex" || mode === "both") {
    success = installCodex() && success;
  }

  if (!success) {
    process.exit(1);
  }
}

main();
