'use strict';

/**
 * src/backend/controllers/companyController.js
 *
 * Логическая декомпозиция:
 *  - helpers: чтение/запись JSON-файлов (companies, partners, users, referrals)
 *  - renderCompanyOwner: рендер страницы профиля владельца
 *  - API:
 *     - getCompanyData (возвращает JSON с company/partners/clients/sites)
 *     - createOrUpdateSite
 *     - resetPartnerCounter
 *     - updateClientStatus
 *     - changePassword (управление паролем пользователя)
 *
 * Примечания:
 *  - Для MVP аутентификация не реализована — render использует query param "companyId" или берет первую компанию.
 *  - Все изменения записываются в соответствующие data/*.json файлы.
 *  - В PROD нужно добавить авторизацию, валидацию, нормализацию телефонов и password hashing.
 */

const path = require('path');
const fs = require('fs-extra');

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const COMPANIES_FILE = path.join(DATA_DIR, 'companies.json');
const PARTNERS_FILE = path.join(DATA_DIR, 'partners.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');

async function readJsonSafe(filePath, defaultVal) {
  try {
    const data = await fs.readJson(filePath);
    return data;
  } catch (err) {
    return defaultVal;
  }
}
async function writeJsonSafe(filePath, data) {
  await fs.ensureFile(filePath);
  await fs.writeJson(filePath, data, { spaces: 2 });
}

/* ---------- renderCompanyOwner ---------- */
exports.renderCompanyOwner = async (req, res) => {
  try {
    // логика выбора компании: query ?companyId=... или первая компания
    const companyId = req.query.companyId;
    const companiesData = await readJsonSafe(COMPANIES_FILE, { companies: [] });
    const usersData = await readJsonSafe(USERS_FILE, { users: [] });

    let company;
    if (companyId) {
      company = companiesData.companies.find(c => c.id === companyId);
    }
    if (!company) {
      company = companiesData.companies.length ? companiesData.companies[0] : null;
    }

    // если нет компании — рендерим страницу с пустыми данными и подсказкой
    const payload = {
      title: 'Профиль компании — ReferralMVP',
      company: company || null,
    };

    // также можно передать email владельца, если указан ownerId
    if (company && company.ownerId) {
      const owner = usersData.users.find(u => u.id === company.ownerId);
      if (owner) {
        payload.owner = { id: owner.id, email: owner.email, phone: owner.phone };
      }
    }

    return res.render('company-owner', payload);
  } catch (err) {
    console.error('renderCompanyOwner error', err);
    return res.status(500).send('Internal Server Error');
  }
};

/* ---------- API: getCompanyData ---------- */
exports.getCompanyData = async (req, res) => {
  try {
    const companyId = req.params.companyId || req.query.companyId;
    const companiesData = await readJsonSafe(COMPANIES_FILE, { companies: [] });
    const partnersData = await readJsonSafe(PARTNERS_FILE, { partners: [] });
    const referralsData = await readJsonSafe(REFERRALS_FILE, { referrals: [] });
    const usersData = await readJsonSafe(USERS_FILE, { users: [] });

    let company = null;
    if (companyId) company = companiesData.companies.find(c => c.id === companyId);
    if (!company) company = companiesData.companies.length ? companiesData.companies[0] : null;

    if (!company) return res.status(404).json({ error: 'Company not found' });

    // sites: company.sites (array) or []
    const sites = Array.isArray(company.sites) ? company.sites : [];

    // partners for this company
    const partners = partnersData.partners.filter(p => p.companyId === company.id);

    // clients: infer from referrals (if referrals have client data) or from company.clients
    // use company.clients if present
    let clients = Array.isArray(company.clients) ? company.clients : [];
    // if referrals contain client data for this company, map them (non-mandatory)
    const companyReferrals = referralsData.referrals.filter(r => r.companyId === company.id);
    if (companyReferrals.length && !clients.length) {
      clients = companyReferrals.map((r, idx) => ({
        id: 'client_' + (r.id || idx),
        name: r.clientName || `Client ${idx + 1}`,
        email: r.clientEmail || '',
        phone: r.clientPhone || '',
        partnerId: r.partnerId || null,
        status: r.status || 'new'
      }));
    }

    // compute partner stats: totalEarned, invitedCount (simple count of referrals)
    const partnerStats = partners.map(p => {
      const partnerReferrals = referralsData.referrals.filter(r => r.partnerId === p.id && r.companyId === company.id);
      const earned = partnerReferrals.reduce((s, r) => s + (r.reward || 0), 0);
      const invited = partnerReferrals.length;
      return Object.assign({}, p, { earned, invited });
    });

    return res.json({
      company,
      sites,
      partners: partnerStats,
      clients
    });
  } catch (err) {
    console.error('getCompanyData error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ---------- API: createOrUpdateSite ---------- */
exports.createOrUpdateSite = async (req, res) => {
  try {
    const companyId = req.params.companyId || (req.body && req.body.companyId);
    const payload = req.body || {};
    if (!companyId) return res.status(400).json({ error: 'companyId required' });

    const companiesData = await readJsonSafe(COMPANIES_FILE, { companies: [] });
    const company = companiesData.companies.find(c => c.id === companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const siteId = payload.id;
    // create new site
    if (!siteId) {
      const newSite = {
        id: 'site_' + Date.now(),
        name: payload.name || 'Без названия',
        slug: (payload.name || 'site').toLowerCase().replace(/[^\w]+/g, '-'),
        description: payload.description || '',
        createdAt: new Date().toISOString()
      };
      company.sites = company.sites || [];
      company.sites.push(newSite);
      await writeJsonSafe(COMPANIES_FILE, companiesData);
      return res.status(201).json({ site: newSite });
    }

    // update existing site (only description editable per your request; name locked when editing)
    company.sites = company.sites || [];
    const site = company.sites.find(s => s.id === siteId);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    // allow updating description
    site.description = payload.description || site.description;
    await writeJsonSafe(COMPANIES_FILE, companiesData);
    return res.json({ site });
  } catch (err) {
    console.error('createOrUpdateSite error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ---------- API: resetPartnerCounter ---------- */
exports.resetPartnerCounter = async (req, res) => {
  try {
    const partnerId = req.params.partnerId;
    if (!partnerId) return res.status(400).json({ error: 'partnerId required' });

    const partnersData = await readJsonSafe(PARTNERS_FILE, { partners: [] });
    const partner = partnersData.partners.find(p => p.id === partnerId);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    // reset counters - fields: earned / invited (if present)
    partner.earned = 0;
    partner.invited = 0;
    await writeJsonSafe(PARTNERS_FILE, partnersData);
    return res.json({ ok: true, partner });
  } catch (err) {
    console.error('resetPartnerCounter error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ---------- API: updateClientStatus ---------- */
exports.updateClientStatus = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const clientId = req.params.clientId;
    const payload = req.body || {};
    const newStatus = payload.status;
    if (!companyId || !clientId) return res.status(400).json({ error: 'companyId and clientId required' });

    const companiesData = await readJsonSafe(COMPANIES_FILE, { companies: [] });
    const company = companiesData.companies.find(c => c.id === companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    company.clients = company.clients || [];
    const client = company.clients.find(c => c.id === clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    client.status = newStatus || client.status;
    await writeJsonSafe(COMPANIES_FILE, companiesData);
    return res.json({ client });
  } catch (err) {
    console.error('updateClientStatus error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ---------- API: changePassword (for owner) ---------- */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.body.userId;
    const newPassword = req.body.newPassword;
    if (!userId || !newPassword) return res.status(400).json({ error: 'userId and newPassword required' });

    const usersData = await readJsonSafe(USERS_FILE, { users: [] });
    const user = usersData.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = newPassword;
    await writeJsonSafe(USERS_FILE, usersData);
    return res.json({ ok: true });
  } catch (err) {
    console.error('changePassword error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

