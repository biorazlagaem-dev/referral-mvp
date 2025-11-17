'use strict';

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// GET / -> главная страница
router.get('/', publicController.renderHome);

// дополнительные публичные роуты (guide, pricing и т.д.) можно добавить позже
router.get('/guide', (req, res) => res.send('Guide — placeholder'));
router.get('/pricing', (req, res) => res.send('Pricing — placeholder'));

module.exports = router;
