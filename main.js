// Claude Usage Buddy - main process
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const fs = require('fs'), path = require('path'), os = require('os'), https = require('https');

const DEMO = process.argv.includes('--demo');
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const FEED = path.join(CLAUDE_DIR, 'usage-widget.json');   // written by statusline.js
const CREDS = path.join(CLAUDE_DIR, '.credentials.json');  // only read when live polling is on
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');   // checked to see if setup ran
const W = 428, H = 132;

let win, tray, cfgPath, liveTimer, last = null, liveErr = null;
let cfg = { x: null, y: null, onTop: true, live: false };

if (!app.requestSingleInstanceLock()) app.quit();

function loadCfg() {
  cfgPath = path.join(app.getPath('userData'), 'config.json');
  try { Object.assign(cfg, JSON.parse(fs.readFileSync(cfgPath, 'utf8'))); } catch {}
}
function saveCfg() { try { fs.writeFileSync(cfgPath, JSON.stringify(cfg)); } catch {} }

function send(d) { last = d; if (win && !win.isDestroyed()) win.webContents.send('usage', d); }

// Tells the footer why numbers might be missing: setup not run, or live polling failing.
function sendDiag() {
  if (DEMO || !win || win.isDestroyed()) return;
  let setup = null;   // null = can't tell (unreadable settings), so don't claim either way
  try {
    const s = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    setup = !!(s.statusLine && s.statusLine.command && s.statusLine.command.includes('statusline.js'));
  } catch (e) { if (e.code === 'ENOENT') setup = false; }
  win.webContents.send('diag', { setup, live: !!cfg.live, liveErr: cfg.live ? liveErr : null });
}
function liveFail(err) { liveErr = err; sendDiag(); }

function readFeed() {
  try {
    const d = JSON.parse(fs.readFileSync(FEED, 'utf8'));
    if (!last || (d.updated_at || 0) >= (last.updated_at || 0)) send(d);
  } catch {}
}

// Optional: ask Anthropic directly (undocumented endpoint, same one /usage uses).
function fetchLive() {
  let o;
  try { const c = JSON.parse(fs.readFileSync(CREDS, 'utf8')); o = c.claudeAiOauth || c; }
  catch { return liveFail('no-login'); }   // the Claude desktop app keeps its login elsewhere
  const token = o && o.accessToken;
  if (!token) return liveFail('no-login');
  // expiresAt is in ms; terminal Claude Code renews it, the widget can't
  if (o.expiresAt > 1e12 && o.expiresAt < Date.now()) return liveFail('expired');
  const req = https.request({
    hostname: 'api.anthropic.com', path: '/api/oauth/usage', method: 'GET', timeout: 10000,
    headers: { Authorization: 'Bearer ' + token, 'anthropic-beta': 'oauth-2025-04-20', 'Content-Type': 'application/json' }
  }, res => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
      if (res.statusCode === 401) return liveFail('expired');
      if (res.statusCode !== 200) return liveFail('http-' + res.statusCode);
      try {
        const j = JSON.parse(body);
        const map = w => w && w.utilization != null ? {
          used_percentage: w.utilization,
          resets_at: w.resets_at ? Math.floor(new Date(w.resets_at).getTime() / 1000) : null
        } : null;
        send({ five_hour: map(j.five_hour), seven_day: map(j.seven_day), updated_at: Date.now(), source: 'live' });
        liveFail(null);
      } catch { liveFail('bad-reply'); }
    });
  });
  req.on('error', () => liveFail('offline'));
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.end();
}
function setLive(on) {
  clearInterval(liveTimer);
  liveErr = null; sendDiag();
  if (on && !DEMO) { fetchLive(); liveTimer = setInterval(fetchLive, 5 * 60 * 1000); }
}

function loginArgs() {
  return app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] };
}
function buildMenu() {
  return Menu.buildFromTemplate([
    { label: 'Always on top', type: 'checkbox', checked: cfg.onTop,
      click: i => { cfg.onTop = i.checked; win.setAlwaysOnTop(cfg.onTop, 'screen-saver'); saveCfg(); } },
    { label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings(loginArgs()).openAtLogin,
      click: i => app.setLoginItemSettings({ openAtLogin: i.checked, ...loginArgs() }) },
    { label: 'Live polling every 5 min (unofficial)', type: 'checkbox', checked: cfg.live,
      click: i => { cfg.live = i.checked; saveCfg(); setLive(cfg.live); } },
    { type: 'separator' },
    { label: 'Start a random event', click: () => { if (win && !win.isDestroyed()) win.webContents.send('event'); } },
    { label: 'Reset position', click: () => { place(true); } },
    { label: 'Quit', click: () => app.quit() }
  ]);
}

function place(reset) {
  const wa = screen.getPrimaryDisplay().workArea;
  let x = cfg.x, y = cfg.y;
  const visible = x != null && screen.getAllDisplays().some(d =>
    x >= d.bounds.x - W + 40 && x < d.bounds.x + d.bounds.width - 40 &&
    y >= d.bounds.y && y < d.bounds.y + d.bounds.height - 40);
  if (reset || !visible) { x = wa.x + wa.width - W - 12; y = wa.y + wa.height - H - 12; }
  else {
    // keep it fully on its screen (a saved spot can overhang after the window got wider)
    const d = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea;
    x = Math.min(Math.max(x, d.x), d.x + d.width - W);
    y = Math.min(Math.max(y, d.y), d.y + d.height - H);
  }
  win.setPosition(Math.round(x), Math.round(y));
}

app.whenReady().then(() => {
  loadCfg();
  win = new BrowserWindow({
    width: W, height: H, frame: false, transparent: true, resizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, hasShadow: false, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  win.setAlwaysOnTop(cfg.onTop, 'screen-saver');
  place(false);
  win.loadFile('index.html', DEMO ? { query: { demo: '1' } } : {});
  win.once('ready-to-show', () => win.showInactive());
  win.on('moved', () => { [cfg.x, cfg.y] = win.getPosition(); saveCfg(); });

  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')));
  tray.setToolTip('Claude Usage Buddy');
  tray.on('click', () => { win.show(); });
  tray.on('right-click', () => tray.popUpContextMenu(buildMenu()));
  tray.setContextMenu(buildMenu());

  ipcMain.on('menu', () => buildMenu().popup({ window: win }));
  ipcMain.on('ready', () => { if (last) send(last); else readFeed(); sendDiag(); });

  if (!DEMO) {
    fs.watchFile(FEED, { interval: 2000 }, readFeed);
    setInterval(sendDiag, 60 * 1000);   // notices `npm run setup` while the widget is open
    setLive(cfg.live);
  }
});
app.on('second-instance', () => { if (win) win.show(); });
app.on('window-all-closed', () => app.quit());
