const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');
const {
  trackLoginFailure,
  trackLoginSuccess,
  isLoginLocked,
  getRemainingLockSeconds,
  logSecurity
} = require('../middleware/security');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

async function getUsers() {
  if (!await fs.pathExists(USERS_FILE)) {
    // Create default admin user on first run
    const hash = await bcrypt.hash('admin', 12);
    const users = [{ id: 1, username: 'admin', password: hash, role: 'admin' }];
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    console.log('\n  ⚠️  Default credentials: admin / admin  (change in settings!)\n');
    return users;
  }
  return fs.readJson(USERS_FILE);
}

router.post('/login', async (req, res) => {
  const ip = req.ip;
  try {
    // Check if IP is currently blocked
    if (isLoginLocked(ip)) {
      const secs = getRemainingLockSeconds(ip);
      const mins = Math.ceil(secs / 60);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Espera ${mins} minuto(s) antes de intentarlo de nuevo.`
      });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const users = await getUsers();
    const user = users.find(u => u.username === username);

    // Always run bcrypt to prevent timing attacks revealing valid usernames
    const validPassword = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, '$2b$12$invalidhashfortimingneutrality000000000000000000000');

    if (!user || !validPassword) {
      trackLoginFailure(ip);
      logSecurity('LOGIN_FAIL', ip, `username=${username}`);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    trackLoginSuccess(ip);
    logSecurity('LOGIN_OK', ip, `username=${username}`);
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Error de sesión' });
      req.session.user = { id: user.id, username: user.username, role: user.role };
      res.json({ ok: true, user: req.session.user });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  res.json({ user: req.session.user });
});

router.post('/change-password', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === req.session.user.id);
    if (!await bcrypt.compare(currentPassword, users[idx].password)) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    users[idx].password = await bcrypt.hash(newPassword, 12);
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
