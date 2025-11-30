'use strict';

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public pages
router.get('/', publicController.renderHome);
router.get('/login', publicController.renderLogin);
router.get('/register', publicController.renderRegister);

// Company owner page
router.get('/company-owner', publicController.renderCompanyOwner);

// site preview
router.get('/site/:slug', publicController.renderSiteBySlug);

// API endpoints used by the owner page and auth
router.post('/api/login-check', publicController.apiLoginCheck);
router.post('/api/create-pending', publicController.apiCreatePending);
router.post('/api/login', publicController.apiLogin);
router.post('/api/register', publicController.apiRegister);

// Owner data APIs
router.post('/api/company-owner-data', publicController.apiCompanyOwnerData);
router.post('/api/company-site', publicController.apiCompanySite);
router.post('/api/site/get', publicController.apiSiteGet);
router.post('/api/partner/reset', publicController.apiPartnerReset);
router.post('/api/client/update-status', publicController.apiClientUpdateStatus);
router.post('/api/change-password', publicController.apiChangePassword);

module.exports = router;
