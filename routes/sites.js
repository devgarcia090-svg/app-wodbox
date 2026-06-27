const express = require('express');
const path = require('path');
const fs = require('fs-extra');

const router = express.Router();
const SITES_DIR = path.join(__dirname, '..', 'sites');

// Serve sites by subdomain or path prefix
// Path-based: http://localhost:8080/mysite/
// Subdomain: http://mysite.localhost:8080/ (requires hosts config)
router.use(async (req, res, next) => {
  const hostname = req.hostname;
  const parts = hostname.split('.');

  let siteName = null;
  let reqPath = req.path;

  // Try subdomain first (mysite.localhost or mysite.yourdomain.com)
  if (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    siteName = parts[0];
  }

  // Fallback: path prefix /sitename/...
  if (!siteName) {
    const pathParts = req.path.replace(/^\//, '').split('/');
    if (pathParts[0]) {
      const candidate = path.join(SITES_DIR, pathParts[0]);
      if (await fs.pathExists(candidate)) {
        siteName = pathParts[0];
        reqPath = '/' + pathParts.slice(1).join('/') || '/';
      }
    }
  }

  if (!siteName) {
    return res.send(renderIndex());
  }

  const sitePath = path.join(SITES_DIR, siteName);
  if (!await fs.pathExists(sitePath)) {
    return res.status(404).send(render404(siteName));
  }

  // Security: prevent path traversal
  const safeReqPath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(sitePath, safeReqPath);
  if (!filePath.startsWith(sitePath)) {
    return res.status(400).send('Bad request');
  }

  // Try exact file, then index.html in directory
  let targetPath = filePath;
  if (!await fs.pathExists(targetPath)) {
    const withIndex = path.join(filePath, 'index.html');
    if (await fs.pathExists(withIndex)) {
      targetPath = withIndex;
    } else {
      // Try custom 404 page
      const custom404 = path.join(sitePath, '404.html');
      if (await fs.pathExists(custom404)) return res.status(404).sendFile(custom404);
      return res.status(404).send(render404(siteName));
    }
  }

  res.sendFile(targetPath);
});

function renderIndex() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>WodBox — Servidor de Sitios</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .box { text-align: center; padding: 3rem; background: #161b22;
           border: 1px solid #30363d; border-radius: 12px; max-width: 480px; }
    h1 { font-size: 2rem; color: #58a6ff; margin-bottom: .75rem; }
    p { color: #8b949e; line-height: 1.6; }
    code { background: #21262d; padding: .15em .4em; border-radius: 4px; font-size: .9em; }
  </style>
</head>
<body>
  <div class="box">
    <h1>WodBox</h1>
    <p>Servidor de sitios activo. Accede a tus sitios en<br>
       <code>http://localhost:8080/<em>nombre-sitio</em>/</code></p>
  </div>
</body>
</html>`;
}

function render404(siteName) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>404 — No encontrado</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .box { text-align: center; padding: 3rem; }
    .code { font-size: 6rem; font-weight: 800; color: #30363d; line-height: 1; }
    h1 { font-size: 1.5rem; color: #8b949e; margin-top: .5rem; }
    p { color: #6e7681; margin-top: .5rem; }
  </style>
</head>
<body>
  <div class="box">
    <div class="code">404</div>
    <h1>Página no encontrada</h1>
    <p>Sitio: <strong>${siteName}</strong></p>
  </div>
</body>
</html>`;
}

module.exports = router;
