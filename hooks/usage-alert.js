#!/usr/bin/env node
// usage-alert — Stop hook
// Sends Windows toast notification when Claude 5-hour output-token limit hits thresholds.
// The 5-hour limit tracks output_tokens across all sessions in a rolling 5-hour window.
// Estimated limit: ~1.52M output tokens / 5h (Max plan). Adjust FIVE_HOUR_LIMIT if needed.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const THRESHOLDS = [40, 60, 80, 90];
const FIVE_HOUR_LIMIT = parseInt(process.env.CLAUDE_5H_LIMIT || '1520000', 10);
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function sumOutputTokens5h(claudeDir) {
  const projectsDir = path.join(claudeDir, 'projects');
  const cutoff = Date.now() - FIVE_HOURS_MS;
  let total = 0;

  let entries;
  try { entries = fs.readdirSync(projectsDir, { withFileTypes: true }); } catch { return 0; }

  for (const dir of entries) {
    if (!dir.isDirectory()) continue;
    const subDir = path.join(projectsDir, dir.name);
    let files;
    try { files = fs.readdirSync(subDir, { withFileTypes: true }); } catch { continue; }
    for (const f of files) {
      if (!f.name.endsWith('.jsonl')) continue;
      const filePath = path.join(subDir, f.name);
      let stat;
      try { stat = fs.statSync(filePath); } catch { continue; }
      if (stat.mtimeMs < cutoff) continue;

      let raw;
      try { raw = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        let entry;
        try { entry = JSON.parse(line); } catch { continue; }
        if (entry.type !== 'assistant' || !entry.message?.usage) continue;
        const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : stat.mtimeMs;
        if (ts < cutoff) continue;
        total += entry.message.usage.output_tokens || 0;
      }
    }
  }
  return total;
}

function sendToast(title, body) {
  const safeTitle = title.replace(/'/g, "''").replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  const safeBody  = body.replace(/'/g, "''").replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  const psScript = [
    '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
    '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null',
    `$toastXml = '<toast><visual><binding template="ToastText02"><text id="1">${safeTitle}</text><text id="2">${safeBody}</text></binding></visual></toast>'`,
    '$xml = [Windows.Data.Xml.Dom.XmlDocument]::new()',
    '$xml.LoadXml($toastXml)',
    '$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)',
    "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show($toast)",
  ].join('; ');

  try {
    execSync(`powershell.exe -NoProfile -WindowStyle Hidden -Command "${psScript.replace(/"/g, '\\"')}"`, { timeout: 5000 });
  } catch (_) {}
}

function main() {
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    let data = {};
    try { data = JSON.parse(input); } catch {}

    const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

    const totalOutput = sumOutputTokens5h(claudeDir);
    const pct = Math.round((totalOutput / FIVE_HOUR_LIMIT) * 100);

    const stateFile = path.join(claudeDir, '.usage-alert-5h.json');
    let state = { notified: [], date: '' };
    try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}

    // Reset notified list each new 5-hour window (keyed by floor-hour bucket)
    const bucket = String(Math.floor(Date.now() / FIVE_HOURS_MS));
    if (state.bucket !== bucket) {
      state = { notified: [], bucket };
    }

    let changed = false;
    for (const threshold of THRESHOLDS) {
      if (pct >= threshold && !state.notified.includes(threshold)) {
        state.notified.push(threshold);
        changed = true;
        const used = (totalOutput / 1000).toFixed(0);
        const lim  = (FIVE_HOUR_LIMIT / 1000).toFixed(0);
        sendToast(
          `Claude 5h Limit ${threshold}% Used`,
          `Output tokens: ${pct}% — ${used}k / ${lim}k`
        );
      }
    }

    if (changed) {
      try { fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 }); } catch {}
    }
  });
}

main();
