#!/usr/bin/env node
// Claude Code status line script: saves rate limits for the widget, then prints a status line.
// Claude Code pipes session JSON to stdin after each response.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
let input = '';
process.stdin.on('data', d => input += d).on('end', () => {
  let j = {};
  try { j = JSON.parse(input); } catch {}
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const file = path.join(dir, 'usage-widget.json');
  const rl = j.rate_limits;
  if (rl && (rl.five_hour || rl.seven_day)) {
    let prev = {};
    try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    // windows can be missing independently, so keep the last known one
    const out = JSON.stringify({
      five_hour: rl.five_hour || prev.five_hour || null,
      seven_day: rl.seven_day || prev.seven_day || null,
      updated_at: Date.now(), source: 'statusline'
    });
    try { fs.writeFileSync(file + '.tmp', out); fs.renameSync(file + '.tmp', file); }
    catch { try { fs.writeFileSync(file, out); } catch {} }
  }
  // If you already had a status line, setup.js chains it here so you keep it.
  const i = process.argv.indexOf('--chain');
  if (i > -1 && process.argv[i + 1]) {
    try {
      const cmd = Buffer.from(process.argv[i + 1], 'base64').toString('utf8');
      process.stdout.write(cp.execSync(cmd, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }));
      return;
    } catch {}
  }
  const pct = w => w && w.used_percentage != null ? Math.round(w.used_percentage) + '%' : '--';
  const model = (j.model && j.model.display_name) || 'Claude';
  console.log(`${model} | 5h ${pct(rl && rl.five_hour)} | week ${pct(rl && rl.seven_day)}`);
});
