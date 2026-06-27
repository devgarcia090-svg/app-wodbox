const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs-extra');
const path = require('path');

// ── Brute-force login tracker (in-memory, per IP) ──
const loginAttempts = new Map(); // ip -> { count, lockedUntil }

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000; // 15 minutes

function trackLoginFailure(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_LOCK_MS;
    entry.count = 0; // reset counter after locking
    logSecurity('LOGIN_BLOCKED', ip, `Blocked after ${LOGIN_MAX_ATTEMPTS} failed attempts`);
  }
  loginAttempts.set(ip, entry);
}

function trackLoginSuccess(ip) {
  loginAttempts.delete(ip);
}

function isLoginLocked(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(ip);
    return false;
  }
  return true;
}

function getRemainingLockSeconds(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return 0;
  return Math.ceil(Math.max(0, entry.lockedUntil - Date.now()) / 1000);
}

// Clean up expired locks every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (entry.lockedUntil && now > entry.lockedUntil) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

// ── Security event logger ──
const SECURITY_LOG = path.join(__dirname, '..', 'data', 'logs', 'security.log');

async function logSecurity(event, ip, detail) {
  const line = `${new Date().toISOString()} [${event}] ip=${ip} ${detail}\n`;
  try {
    await fs.ensureDir(path.dirname(SECURITY_LOG));
    await fs.appendFile(SECURITY_LOG, line);
  } catch {}
  console.warn(`[SECURITY] ${line.trim()}`);
}

// ── Helmet: comprehensive HTTP security headers ──
function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",       // needed for inline admin scripts + onclick handlers
          'cdnjs.cloudflare.com'   // CodeMirror CDN
        ],
        scriptSrcAttr: ["'unsafe-inline'"],  // allow onclick= attributes
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'cdnjs.cloudflare.com'
        ],
        fontSrc: ["'self'", 'cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ["'self'"],       // allow iframe previews from same origin
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,           // 1 year
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false,
    crossOriginEmbedderPolicy: false, // allow iframe preview
  });
}

// ── Rate limiters ──

// General: 200 req/15min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurity('RATE_LIMIT', req.ip, `${req.method} ${req.path}`);
    res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
  }
});

// API: 100 req/15min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurity('API_RATE_LIMIT', req.ip, `${req.method} ${req.path}`);
    res.status(429).json({ error: 'Límite de API superado. Espera un momento.' });
  }
});

// Upload: 30 uploads/15min per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  handler: (req, res) => {
    logSecurity('UPLOAD_RATE_LIMIT', req.ip, req.path);
    res.status(429).json({ error: 'Límite de subidas superado.' });
  }
});

// ── Sanitize filenames on upload ──
function sanitizeFilename(name) {
  return name
    .replace(/\.\./g, '')              // no path traversal
    .replace(/[/\\:*?"<>|]/g, '_')    // no illegal chars
    .replace(/^\./, '_')              // no hidden files starting with dot
    .substring(0, 255);               // max length
}

// ── Block suspicious requests ──
function suspiciousRequestGuard(req, res, next) {
  const suspicious = [
    /\.\.[/\\]/,                        // path traversal
    /<script/i,                         // XSS attempts in URL
    /(%3C|%3E|%27|%22)/i,             // encoded HTML chars
    /union.*select/i,                  // SQL injection
    /\/(etc\/passwd|proc\/self)/i,     // sensitive system files
    /wp-admin|phpmyadmin|\.env/i       // common attack targets
  ];

  const target = req.originalUrl + (req.body?.path || '');
  for (const pattern of suspicious) {
    if (pattern.test(target)) {
      logSecurity('SUSPICIOUS_REQUEST', req.ip, `${req.method} ${req.originalUrl}`);
      return res.status(400).json({ error: 'Petición inválida' });
    }
  }
  next();
}

module.exports = {
  helmetMiddleware,
  generalLimiter,
  apiLimiter,
  uploadLimiter,
  suspiciousRequestGuard,
  trackLoginFailure,
  trackLoginSuccess,
  isLoginLocked,
  getRemainingLockSeconds,
  sanitizeFilename,
  logSecurity
};
