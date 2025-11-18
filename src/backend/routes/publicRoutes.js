'use strict';

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// GET / -> главная страница
router.get('/', publicController.renderHome);

// GET /register -> страница регистрации
router.get('/register', publicController.renderRegister);

// API: проверка существования аккаунта
router.post('/api/check-account', publicController.apiCheckAccount);

// API: регистрация (создание аккаунта)
router.post('/api/register', publicController.apiRegister);

// дополнительные публичные роуты (placeholders)
router.get('/guide', (req, res) => res.send('Guide — placeholder'));
router.get('/pricing', (req, res) => res.send('Pricing — placeholder'));

module.exports = router;
