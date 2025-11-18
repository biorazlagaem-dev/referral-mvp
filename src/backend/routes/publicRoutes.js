'use strict';

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// GET / -> главная страница
router.get('/', publicController.renderHome);

// POST /register-check -> проверка регистрационных данных (email / phone)
router.post('/register-check', publicController.postRegisterCheck);

// дополнительные публичные роуты (placeholders)
router.get('/guide', (req, res) => res.send('Guide — placeholder'));
router.get('/pricing', (req, res) => res.send('Pricing — placeholder'));

module.exports = router;
