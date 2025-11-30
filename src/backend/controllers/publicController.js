'use strict';

const path = require('path');
const fs = require('fs-extra');

const USERS_FILE = path.join(__dirname, '..', '..', '..', 'data', 'users.json');
const COMPANIES_FILE = path.join(__dirname, '..', '..', '..', 'data', 'companies.json');
const PARTNERS_FILE = path.join(__dirname, '..', '..', '..', 'data', 'partners.json');
const CLIENTS_FILE = path.join(__dirname, '..', '..', '..', 'data', 'clients.json'); // may not exist initially
const SITES_FILE = path.join(__dirname, '..', '..', '..', 'data', 'sites.json');

/* ---------- helpers ---------- */
async function readSafe(file, defaultObj) {
  try {
    const d = await fs.readJson(file);
    return d;
  } catch (e) {
    return defaultObj;
  }
}
async function writeSafe(file, obj) {
  await fs.ensureFile(file);
  await fs.writeJson(file, obj, { spaces: 2 });
}

/* ---------- renderCompanyOwner (new) ---------- */
exports.renderCompanyOwner = async (req, res) => {
  try {
    const email = req.query.email;
    const phone = req.query.phone;
    // find user
    const usersData = await readSafe(USERS_FILE, { users: [] });
    const user = usersData.users.find(u => (email && u.email === email) || (phone && u.phone === phone));
    if (!user) {
      // if not found, redirect to login
      return res.redirect('/login');
    }

    // companies owned by user (ownerId matches user.id) - companies.json contains companies array
    const companiesData = await readSafe(COMPANIES_FILE, { companies: [] });
    const companies = companiesData.companies.filter(c => c.ownerId === user.id);

    // partners for those companies
    const partnersData = await readSafe(PARTNERS_FILE, { partners: [] });
    const partners = partnersData.partners.filter(p => companies.some(c => c.id === p.companyId));

    // clients: try clients.json or build from referrals.json if exists
    const clientsData = await readSafe(CLIENTS_FILE, { clients: [] });
    const clients = clientsData.clients.filter(cl => companies.some(c => c.id === cl.companyId))
      .map(cl => {
        const partner = partners.find(p => p.id === cl.partnerId) || {};
        return Object.assign({}, cl, { partnerName: partner.name });
      });

    res.render('company-owner', {
      user,
      companies,
      partners,
      clients
    });
  } catch (err) {
    console.error('renderCompanyOwner error', err);
    res.status(500).send('Internal Server Error');
  }
};

/* ---------- API: company-owner data (used by client) ---------- */
exports.apiCompanyOwnerData = async (req, res) => {
  try {
    const body = req.body || {};
    const email = body.email;
    const phone = body.phone;
    const usersData = await readSafe(USERS_FILE, { users: [] });
    const user = usersData.users.find(u => (email && u.email === email) || (phone && u.phone === phone));
    if (!user) return res.status(404).send('User not found');

    const companiesData = await readSafe(COMPANIES_FILE, { companies: [] });
    const companies = companiesData.companies.filter(c => c.ownerId === user.id);

    const partnersData = await readSafe(PARTNERS_FILE, { partners: [] });
    const partners = partnersData.partners.filter(p => companies.some(c => c.id === p.companyId));

    const clientsData = await readSafe(CLIENTS_FILE, { clients: [] });
    const clients = clientsData.clients.filter(cl => companies.some(c => c.id === cl.companyId)).map(cl => {
      const partner = partners.find(p => p.id === cl.partnerId) || {};
      return Object.assign({}, cl, { partnerName: partner.name });
    });

    return res.json({ user, companies, partners, clients });
  } catch (err) {
    console.error('apiCompanyOwnerData error', err);
    return res.status(500).send('Internal Server Error');
  }
};

/* ---------- API: create/update company site (new) ---------- */
exports.apiCompanySite = async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id; // optional (edit)
    const name = body.name ? String(body.name).trim() : '';
    const description = body.description ? String(body.description).trim() : '';
    // For MVP owner is not enforced server side (we rely on ownerId passed client-side via query as earlier)
    // But we try to infer owner from query params in body (email/phone) if provided
    const ownerEmail = body.email;
    const ownerPhone = body.phone;

    if (!name) return res.status(400).send('Требуется имя сайта');

    const sitesData = await readSafe(SITES_FILE, { sites: [] });

    if (id) {
      const idx = sitesData.sites.findIndex(s => s.id === id);
      if (idx === -1) return res.status(404).send('Site not found');
      sitesData.sites[idx].name = name;
      sitesData.sites[idx].description = description;
      await writeSafe(SITES_FILE, sitesData);
      return res.json({ ok: true, site: sitesData.sites[idx] });
    }

    // create new
    const slug = name.toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');
    const newSite = {
      id: 'site_' + Date.now(),
      name,
      description,
      slug,
      createdAt: new Date().toISOString(),
      ownerEmail: ownerEmail || undefined,
      ownerPhone: ownerPhone || undefined
    };
    sitesData.sites.push(newSite);
    await writeSafe(SITES_FILE, sitesData);
    return res.status(201).json({ ok: true, site: newSite });
  } catch (err) {
    console.error('apiCompanySite error', err);
    return res.status(500).send('Internal Server Error');
  }
};

/* ---------- API: get site by id (for edit) ---------- */
exports.apiSiteGet = async (req, res) => {
  try {
    const body = req.body || {};
    const siteId = body.siteId;
    if(!siteId) return res.status(400).send('siteId required');
    const sitesData = await readSafe(SITES_FILE, { sites: [] });
    const site = sitesData.sites.find(s => s.id === siteId);
    if(!site) return res.status(404).send('Not found');
    return res.json({ site });
  } catch (err) { console.error(err); return res.status(500).send('Internal Server Error'); }
};

/* ---------- API: partner reset (new) ---------- */
exports.apiPartnerReset = async (req, res) => {
  try {
    const body = req.body || {};
    const pid = body.partnerId;
    if(!pid) return res.status(400).send('partnerId required');
    const pData = await readSafe(PARTNERS_FILE, { partners: [] });
    const idx = pData.partners.findIndex(p => p.id === pid);
    if(idx === -1) return res.status(404).send('Partner not found');
    pData.partners[idx].earned = 0;
    pData.partners[idx].clients = 0;
    await writeSafe(PARTNERS_FILE, pData);
    return res.json({ ok: true });
  } catch (err) { console.error(err); return res.status(500).send('Internal Server Error'); }
};

/* ---------- API: client update status (new) ---------- */
exports.apiClientUpdateStatus = async (req, res) => {
  try {
    const body = req.body || {};
    const clientId = body.clientId;
    const status = body.status;
    if(!clientId) return res.status(400).send('clientId required');
    const cData = await readSafe(CLIENTS_FILE, { clients: [] });
    const idx = cData.clients.findIndex(c => c.id === clientId);
    if(idx === -1) return res.status(404).send('Client not found');
    cData.clients[idx].status = status;
    await writeSafe(CLIENTS_FILE, cData);
    return res.json({ ok: true });
  } catch (err) { console.error(err); return res.status(500).send('Internal Server Error'); }
};

/* ---------- API: change password (new, simple) ---------- */
exports.apiChangePassword = async (req, res) => {
  try {
    const body = req.body || {};
    const email = body.email;
    const phone = body.phone;
    const oldp = body.old;
    const passwd = body.password;
    if((!email && !phone) || !passwd) return res.status(400).send('Bad request');

    const uData = await readSafe(USERS_FILE, { users: [] });
    const u = uData.users.find(x => (email && x.email === email) || (phone && x.phone === phone));
    if(!u) return res.status(404).send('User not found');
    if(u.password !== oldp) return res.status(401).send('Old password mismatch');

    u.password = passwd;
    await writeSafe(USERS_FILE, uData);
    return res.json({ ok: true });
  } catch (err) { console.error(err); return res.status(500).send('Internal Server Error'); }
};

/* ---------- render site by slug (public preview) ---------- */
exports.renderSiteBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    const sData = await readSafe(SITES_FILE, { sites: [] });
    const site = sData.sites.find(s => s.slug === slug);
    if(!site) return res.status(404).send('Site not found');
    // Very simple render: show title and description
    res.send(`<html><head><title>${site.name}</title></head><body><h1>${site.name}</h1><p>${site.description||''}</p></body></html>`);
  } catch (err) {
    console.error(err); res.status(500).send('Internal Server Error');
  }
};
