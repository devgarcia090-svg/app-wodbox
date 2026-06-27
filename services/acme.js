/**
 * Let's Encrypt / ACME certificate manager
 * Uses HTTP-01 challenge on port 80 to obtain and renew TLS certificates.
 */
const acme = require('acme-client');
const fs = require('fs-extra');
const path = require('path');
const { logSecurity } = require('../middleware/security');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CERTS_DIR = path.join(DATA_DIR, 'certs');
const DOMAINS_FILE = path.join(DATA_DIR, 'domains.json');
const ACCOUNT_FILE = path.join(DATA_DIR, 'acme-account.json');

// Shared map for active HTTP-01 challenges: token -> keyAuth
const challenges = new Map();

// ── Domain config helpers ──

async function getDomains() {
  if (!await fs.pathExists(DOMAINS_FILE)) return [];
  return fs.readJson(DOMAINS_FILE).catch(() => []);
}

async function saveDomains(domains) {
  await fs.ensureDir(DATA_DIR);
  await fs.writeJson(DOMAINS_FILE, domains, { spaces: 2 });
}

async function addDomain(domain, siteName) {
  const domains = await getDomains();
  if (domains.find(d => d.domain === domain)) {
    throw new Error('Este dominio ya está configurado');
  }
  domains.push({ domain, siteName, certStatus: 'pending', addedAt: new Date().toISOString() });
  await saveDomains(domains);
  return domains;
}

async function removeDomain(domain) {
  let domains = await getDomains();
  domains = domains.filter(d => d.domain !== domain);
  await saveDomains(domains);
  // Remove cert files
  await fs.remove(path.join(CERTS_DIR, domain)).catch(() => {});
}

async function updateDomainStatus(domain, status, extra = {}) {
  const domains = await getDomains();
  const idx = domains.findIndex(d => d.domain === domain);
  if (idx >= 0) {
    domains[idx] = { ...domains[idx], certStatus: status, ...extra };
    await saveDomains(domains);
  }
}

// ── ACME client ──

async function getOrCreateAccount() {
  await fs.ensureDir(DATA_DIR);
  let accountKey;

  if (await fs.pathExists(ACCOUNT_FILE)) {
    const saved = await fs.readJson(ACCOUNT_FILE);
    accountKey = saved.privateKey;
  } else {
    accountKey = (await acme.crypto.createPrivateKey()).toString();
    await fs.writeJson(ACCOUNT_FILE, { privateKey: accountKey }, { spaces: 2 });
  }
  return accountKey;
}

async function requestCertificate(domain) {
  console.log(`[ACME] Requesting certificate for ${domain}…`);
  await updateDomainStatus(domain, 'requesting');

  try {
    const accountKey = await getOrCreateAccount();
    const client = new acme.Client({
      directoryUrl: acme.directory.letsencrypt.production,
      accountKey
    });

    // Create or reuse account
    await client.createAccount({
      termsOfServiceAgreed: true,
      contact: []
    });

    // Generate key + CSR
    const [certKey, csr] = await acme.crypto.createCsr({ commonName: domain });

    // Get certificate via HTTP-01 challenge
    const cert = await client.auto({
      csr,
      email: undefined,
      termsOfServiceAgreed: true,
      challengePriority: ['http-01'],
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        challenges.set(challenge.token, keyAuthorization);
      },
      challengeRemoveFn: async (authz, challenge) => {
        challenges.delete(challenge.token);
      }
    });

    // Save cert and key
    const certDir = path.join(CERTS_DIR, domain);
    await fs.ensureDir(certDir);
    await fs.writeFile(path.join(certDir, 'privkey.pem'), certKey.toString());
    await fs.writeFile(path.join(certDir, 'cert.pem'), cert);

    // Parse expiry
    const parsed = new acme.crypto.forge.pki.certificateFromPem(cert);
    const expiresAt = parsed.validity.notAfter.toISOString();

    await updateDomainStatus(domain, 'valid', { expiresAt, issuedAt: new Date().toISOString() });
    console.log(`[ACME] Certificate obtained for ${domain}, expires ${expiresAt}`);
    return { ok: true, expiresAt };

  } catch (err) {
    await updateDomainStatus(domain, 'error', { lastError: err.message });
    logSecurity('ACME_ERROR', domain, err.message);
    throw err;
  }
}

async function getCertFiles(domain) {
  const certDir = path.join(CERTS_DIR, domain);
  const keyPath = path.join(certDir, 'privkey.pem');
  const certPath = path.join(certDir, 'cert.pem');

  if (!await fs.pathExists(keyPath) || !await fs.pathExists(certPath)) return null;

  return {
    key: await fs.readFile(keyPath),
    cert: await fs.readFile(certPath)
  };
}

// ── Auto-renewal ──
// Runs every 12 hours; renews certs expiring in < 30 days

async function autoRenewCheck() {
  const domains = await getDomains();
  const now = new Date();

  for (const d of domains) {
    if (d.certStatus !== 'valid' || !d.expiresAt) continue;
    const expiresAt = new Date(d.expiresAt);
    const daysLeft = (expiresAt - now) / (1000 * 60 * 60 * 24);

    if (daysLeft < 30) {
      console.log(`[ACME] Auto-renewing ${d.domain} (${Math.floor(daysLeft)} days left)…`);
      await requestCertificate(d.domain).catch(e =>
        console.error(`[ACME] Renewal failed for ${d.domain}: ${e.message}`)
      );
    }
  }
}

function startAutoRenewal() {
  // Initial check after 1 minute, then every 12 hours
  setTimeout(() => {
    autoRenewCheck();
    setInterval(autoRenewCheck, 12 * 60 * 60 * 1000);
  }, 60 * 1000);
}

module.exports = {
  challenges,
  getDomains,
  addDomain,
  removeDomain,
  requestCertificate,
  getCertFiles,
  startAutoRenewal
};
