const express = require('express');
const { getDomains, addDomain, removeDomain, requestCertificate, getCertFiles } = require('../services/acme');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  next();
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json(await getDomains());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { domain, siteName } = req.body;
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      return res.status(400).json({ error: 'Dominio inválido' });
    }
    const domains = await addDomain(domain.toLowerCase(), siteName || '');
    res.json({ ok: true, domains });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:domain', async (req, res) => {
  try {
    await removeDomain(req.params.domain);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:domain/request-cert', async (req, res) => {
  // Start async — respond immediately, cert request happens in background
  const domain = req.params.domain;
  res.json({ ok: true, message: `Solicitando certificado para ${domain}… Puede tardar 1-2 minutos.` });
  requestCertificate(domain).catch(e =>
    console.error(`[ACME] Error requesting cert for ${domain}: ${e.message}`)
  );
});

module.exports = router;
