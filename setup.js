// Points Claude Code's status line at statusline.js (keeps a backup and chains any existing one).
const fs = require('fs'), path = require('path'), os = require('os');
const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const file = path.join(dir, 'settings.json');
const script = path.join(__dirname, 'statusline.js').replace(/\\/g, '/');
let s = {};
if (fs.existsSync(file)) {
  try { s = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { console.error('Could not parse ' + file + ' - fix it or add the statusLine entry by hand (see README).'); process.exit(1); }
  // keep the first backup: running setup again must not overwrite the original with our own edit
  if (!fs.existsSync(file + '.buddy-backup')) fs.copyFileSync(file, file + '.buddy-backup');
} else fs.mkdirSync(dir, { recursive: true });
let command = `node "${script}"`;
const old = s.statusLine && s.statusLine.command;
if (old && !old.includes('statusline.js" --chain') && !old.includes(script)) {
  command += ' --chain ' + Buffer.from(old, 'utf8').toString('base64');
  console.log('Existing status line kept (chained): ' + old);
} else if (old && old.includes(script)) { console.log('Already set up.'); process.exit(0); }
s.statusLine = { type: 'command', command };
fs.writeFileSync(file, JSON.stringify(s, null, 2));
console.log('Done. Restart Claude Code; the widget updates after your next message.');
