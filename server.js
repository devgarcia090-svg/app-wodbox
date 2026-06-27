const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs-extra');

const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');
const sitesRouter = require('./routes/sites');

const app = express();
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

async function loadConfig() {
  await fs.ensureDir(path.join(__dirname, 'data'));
  await fs.ensureDir(path.join(__dirname, 'sites'));

  const defaults = {
    port: 3000,
    sitesPort: 8080,
    sessionSecret: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    serverName: 'WodBox Server'
  };

  if (!await fs.pathExists(CONFIG_FILE)) {
    await fs.writeJson(CONFIG_FILE, defaults, { spaces: 2 });
    return defaults;
  }

  return { ...defaults, ...await fs.readJson(CONFIG_FILE) };
}

async function startServers() {
  const config = await loadConfig();

  // --- Admin panel app ---
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));

  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/auth', authRouter);
  app.use('/api', apiRouter);

  // Admin SPA fallback
  app.get('/admin*', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  });

  app.listen(config.port, () => {
    console.log(`\n  🛠  WodBox Admin Panel → http://localhost:${config.port}`);
  });

  // --- Sites server ---
  const sitesApp = express();
  sitesApp.use(sitesRouter);
  sitesApp.listen(config.sitesPort, () => {
    console.log(`  🌐 Sites Server       → http://localhost:${config.sitesPort}\n`);
  });
}

startServers().catch(console.error);
