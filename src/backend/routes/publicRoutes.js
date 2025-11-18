'use strict';

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const authController = require('../controllers/authController');

// GET / -> главная страница
router.get('/', publicController.renderHome);

// POST /register-check -> проверка регистрации (email или phone)
router.post('/register-check', authController.registerCheck);

// дополнительные публичные роуты (guide, pricing и т.д.) — оставить заглушки
router.get('/guide', (req, res) => res.send('Guide — placeholder'));
router.get('/pricing', (req, res) => res.send('Pricing — placeholder'));

module.exports = router;
