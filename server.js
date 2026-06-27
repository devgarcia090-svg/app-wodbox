const express = require('express');
const session = require('express-session');
const compression = require('compression');
const morgan = require('morgan');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs-extra');

const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');
const domainsRouter = require('./routes/domains');
const sitesRouter = require('./routes/sites');
const {
  helmetMiddleware,
  generalLimiter,
  apiLimiter,
  suspiciousRequestGuard
} = require('./middleware/security');
const { challenges, getCertFiles, getDomains, startAutoRenewal } = require('./services/acme');

const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

// ── Config ──────────────────────────────────────────────────────────────────

async function loadConfig() {
  await fs.ensureDir(path.join(__dirname, 'data'));
  await fs.ensureDir(path.join(__dirname, 'sites'));
  await fs.ensureDir(path.join(__dirname, 'data', 'logs'));

  const defaults = {
    port: 3000,
    sitesPort: 8080,
    sessionSecret: require('crypto').randomBytes(32).toString('hex'),
    serverName: 'WodBox Server'
  };

  if (!await fs.pathExists(CONFIG_FILE)) {
    await fs.writeJson(CONFIG_FILE, defaults, { spaces: 2 });
    return defaults;
  }

  return { ...defaults, ...await fs.readJson(CONFIG_FILE) };
}

// ── Access logger ────────────────────────────────────────────────────────────

function buildMorganLogger() {
  const LOG_FILE = path.join(__dirname, 'data', 'logs', 'access.log');
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  return morgan('combined', { stream: logStream });
}

// ── Admin app factory ────────────────────────────────────────────────────────

function buildAdminApp(config) {
  const app = express();

  // Trust proxy if behind Nginx/Caddy
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmetMiddleware());

  // Compression
  app.use(compression());

  // Access log
  app.use(buildMorganLogger());

  // Rate limit all routes
  app.use(generalLimiter);

  // Block suspicious requests early
  app.use(suspiciousRequestGuard);

  // Body parsers with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Sessions — secure cookie when HTTPS
  app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'wbsid',
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'strict',
      secure: false   // set to true when HTTPS is confirmed active
    }
  }));

  // Static assets
  app.use(express.static(path.join(__dirname, 'public'), {
    etag: true,
    maxAge: '1h',
    index: false
  }));

  // API routes — domains must be mounted BEFORE the generic /api router
  // to avoid the /api prefix match consuming /api/domains first
  app.use('/api/domains', apiLimiter, domainsRouter);
  app.use('/api', apiLimiter, apiRouter);
  app.use('/auth', authRouter);

  // Admin SPA
  app.get('/admin*', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  });

  // 404 catch-all
  app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));

  // Error handler
  app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

// ── Sites app factory ────────────────────────────────────────────────────────

function buildSitesApp() {
  const app = express();

  app.set('trust proxy', 1);

  // ACME HTTP-01 challenge handler (must be on port 80, no auth)
  app.get('/.well-known/acme-challenge/:token', (req, res) => {
    const auth = challenges.get(req.params.token);
    if (auth) return res.type('text/plain').send(auth);
    res.status(404).send('Not found');
  });

  // Basic rate limit for public-facing server
  app.use(rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 120,                  // 2 req/sec burst
    standardHeaders: true,
    legacyHeaders: false
  }));

  app.use(compression());
  app.use(buildMorganLogger());
  app.use(sitesRouter);

  return app;
}

// Local require needed inside buildSitesApp
const { rateLimit } = require('express-rate-limit');

// ── HTTPS helper ─────────────────────────────────────────────────────────────

async function tryStartHttps(adminApp, sitesApp) {
  const domains = await getDomains();
  const valid = domains.filter(d => d.certStatus === 'valid');

  if (valid.length === 0) return;

  // Use the first valid cert for the admin panel HTTPS (port 443)
  const firstDomain = valid[0].domain;
  const certs = await getCertFiles(firstDomain);
  if (!certs) return;

  https.createServer({ key: certs.key, cert: certs.cert }, adminApp)
    .listen(443, () => console.log(`  🔒 HTTPS Admin Panel  → https://${firstDomain}`));

  // HTTPS for sites server (port 8443)
  https.createServer({ key: certs.key, cert: certs.cert }, sitesApp)
    .listen(8443, () => console.log(`  🔒 HTTPS Sites        → https://${firstDomain}:8443`));
}

// ── HTTP redirect middleware ─────────────────────────────────────────────────

function buildHttpRedirectApp() {
  const app = express();

  // ACME challenge must work over HTTP (port 80)
  app.get('/.well-known/acme-challenge/:token', (req, res) => {
    const auth = challenges.get(req.params.token);
    if (auth) return res.type('text/plain').send(auth);
    res.status(404).send('Not found');
  });

  // Redirect everything else to HTTPS
  app.use((req, res) => {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  });

  return app;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function start() {
  const config = await loadConfig();
  const adminApp = buildAdminApp(config);
  const sitesApp = buildSitesApp();

  // Always start HTTP servers
  http.createServer(adminApp).listen(config.port, () => {
    console.log(`\n  🛠  WodBox Admin       → http://localhost:${config.port}`);
  });

  http.createServer(sitesApp).listen(config.sitesPort, () => {
    console.log(`  🌐 Sites (HTTP)       → http://localhost:${config.sitesPort}`);
  });

  // Port 80 for ACME challenges + HTTP→HTTPS redirect
  http.createServer(buildHttpRedirectApp()).listen(80, () => {
    console.log(`  ↪  HTTP redirect      → :80 (ACME challenges + redirect)`);
  }).on('error', err => {
    if (err.code === 'EACCES') {
      console.warn(`  ⚠️  Cannot bind port 80 (requires sudo/root or authbind).`);
      console.warn(`     Run: sudo node server.js  — or configure authbind for node`);
    }
  });

  // Try to start HTTPS if certs already exist
  await tryStartHttps(adminApp, sitesApp);

  // Auto-renew certificates
  startAutoRenewal();

  console.log(`\n  👤 Login: admin / admin  (¡cámbiala en Configuración!)\n`);
}

start().catch(console.error);
