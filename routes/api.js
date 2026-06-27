const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const mime = require('mime-types');
const archiver = require('archiver');

const router = express.Router();
const SITES_DIR = path.join(__dirname, '..', 'sites');
const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  next();
}

router.use(requireAuth);

// Multer: store files in memory for flexible placement
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// --- Config ---
router.get('/config', async (req, res) => {
  try {
    const config = await fs.readJson(CONFIG_FILE);
    res.json({ ...config, sessionSecret: undefined });
  } catch { res.json({}); }
});

router.post('/config', async (req, res) => {
  try {
    const config = await fs.readJson(CONFIG_FILE);
    const { port, sitesPort, serverName } = req.body;
    if (port) config.port = parseInt(port);
    if (sitesPort) config.sitesPort = parseInt(sitesPort);
    if (serverName) config.serverName = serverName;
    await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
    res.json({ ok: true, message: 'Configuración guardada. Reinicia el servidor para aplicar cambios de puerto.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sites CRUD ---
router.get('/sites', async (req, res) => {
  try {
    await fs.ensureDir(SITES_DIR);
    const dirs = await fs.readdir(SITES_DIR);
    const sites = await Promise.all(dirs.map(async (name) => {
      const sitePath = path.join(SITES_DIR, name);
      const stat = await fs.stat(sitePath);
      if (!stat.isDirectory()) return null;

      const metaFile = path.join(sitePath, '.wodbox.json');
      const meta = await fs.pathExists(metaFile) ? await fs.readJson(metaFile) : {};
      const size = await getDirSize(sitePath);
      const fileCount = await countFiles(sitePath);

      return {
        name,
        slug: meta.slug || name,
        description: meta.description || '',
        created: stat.birthtime,
        modified: stat.mtime,
        size,
        fileCount
      };
    }));
    res.json(sites.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sites', async (req, res) => {
  try {
    const { name, description, slug } = req.body;
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'Nombre inválido (solo letras, números, - y _)' });
    }
    const sitePath = path.join(SITES_DIR, name);
    if (await fs.pathExists(sitePath)) {
      return res.status(409).json({ error: 'Ya existe un sitio con ese nombre' });
    }
    await fs.ensureDir(sitePath);
    await fs.writeJson(path.join(sitePath, '.wodbox.json'), {
      slug: slug || name,
      description: description || '',
      created: new Date().toISOString()
    }, { spaces: 2 });

    // Create a default index.html
    await fs.writeFile(path.join(sitePath, 'index.html'), getDefaultHtml(name));
    res.json({ ok: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sites/:name', async (req, res) => {
  try {
    const sitePath = path.join(SITES_DIR, req.params.name);
    if (!await fs.pathExists(sitePath)) {
      return res.status(404).json({ error: 'Sitio no encontrado' });
    }
    await fs.remove(sitePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download site as ZIP
router.get('/sites/:name/download', async (req, res) => {
  const sitePath = path.join(SITES_DIR, req.params.name);
  if (!await fs.pathExists(sitePath)) return res.status(404).json({ error: 'Sitio no encontrado' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.name}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.glob('**/*', { cwd: sitePath, ignore: ['.wodbox.json'] });
  await archive.finalize();
});

// --- Files ---
router.get('/sites/:name/files', async (req, res) => {
  try {
    const reqPath = req.query.path || '';
    const safePath = safejoin(SITES_DIR, req.params.name, reqPath);
    if (!safePath) return res.status(400).json({ error: 'Ruta inválida' });

    const items = await fs.readdir(safePath);
    const entries = await Promise.all(items.map(async (item) => {
      if (item === '.wodbox.json') return null;
      const full = path.join(safePath, item);
      const stat = await fs.stat(full);
      return {
        name: item,
        path: reqPath ? `${reqPath}/${item}` : item,
        isDir: stat.isDirectory(),
        size: stat.size,
        modified: stat.mtime,
        mimeType: stat.isDirectory() ? null : mime.lookup(item) || 'application/octet-stream'
      };
    }));
    res.json(entries.filter(Boolean).sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sites/:name/file', async (req, res) => {
  try {
    const filePath = safejoin(SITES_DIR, req.params.name, req.query.path || '');
    if (!filePath) return res.status(400).json({ error: 'Ruta inválida' });
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ content, path: req.query.path });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sites/:name/file', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    const fullPath = safejoin(SITES_DIR, req.params.name, filePath);
    if (!fullPath) return res.status(400).json({ error: 'Ruta inválida' });
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sites/:name/upload', upload.array('files'), async (req, res) => {
  try {
    const targetPath = req.body.path || '';
    const results = [];
    for (const file of req.files) {
      const destPath = safejoin(SITES_DIR, req.params.name, targetPath, file.originalname);
      if (!destPath) continue;
      await fs.ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, file.buffer);
      results.push(file.originalname);
    }
    res.json({ ok: true, uploaded: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sites/:name/mkdir', async (req, res) => {
  try {
    const { path: dirPath } = req.body;
    const fullPath = safejoin(SITES_DIR, req.params.name, dirPath);
    if (!fullPath) return res.status(400).json({ error: 'Ruta inválida' });
    await fs.ensureDir(fullPath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sites/:name/file', async (req, res) => {
  try {
    const filePath = safejoin(SITES_DIR, req.params.name, req.query.path || '');
    if (!filePath) return res.status(400).json({ error: 'Ruta inválida' });
    await fs.remove(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sites/:name/rename', async (req, res) => {
  try {
    const { from, to } = req.body;
    const fromPath = safejoin(SITES_DIR, req.params.name, from);
    const toPath = safejoin(SITES_DIR, req.params.name, to);
    if (!fromPath || !toPath) return res.status(400).json({ error: 'Ruta inválida' });
    await fs.move(fromPath, toPath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Stats ---
router.get('/stats', async (req, res) => {
  try {
    await fs.ensureDir(SITES_DIR);
    const dirs = await fs.readdir(SITES_DIR);
    let totalSize = 0;
    let totalFiles = 0;
    let siteCount = 0;

    for (const d of dirs) {
      const p = path.join(SITES_DIR, d);
      const stat = await fs.stat(p);
      if (!stat.isDirectory()) continue;
      siteCount++;
      totalSize += await getDirSize(p);
      totalFiles += await countFiles(p);
    }

    const config = await fs.readJson(CONFIG_FILE).catch(() => ({}));
    res.json({
      siteCount,
      totalFiles,
      totalSize,
      serverName: config.serverName || 'WodBox',
      sitesPort: config.sitesPort || 8080,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Helpers ---
function safejoin(base, ...parts) {
  const full = path.join(base, ...parts.map(p => p || ''));
  if (!full.startsWith(base)) return null;
  return full;
}

async function getDirSize(dir) {
  let total = 0;
  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = await fs.stat(full);
      total += stat.isDirectory() ? await getDirSize(full) : stat.size;
    }
  } catch {}
  return total;
}

async function countFiles(dir) {
  let total = 0;
  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      if (item === '.wodbox.json') continue;
      const full = path.join(dir, item);
      const stat = await fs.stat(full);
      total += stat.isDirectory() ? await countFiles(full) : 1;
    }
  } catch {}
  return total;
}

function getDefaultHtml(name) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #0d1117; color: #e6edf3;
    }
    .card {
      text-align: center; padding: 3rem;
      background: #161b22; border: 1px solid #30363d; border-radius: 12px;
    }
    h1 { font-size: 2.5rem; margin-bottom: .5rem; color: #58a6ff; }
    p { color: #8b949e; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${name}</h1>
    <p>Sitio creado con WodBox. Edita este archivo para empezar.</p>
  </div>
</body>
</html>`;
}

module.exports = router;
