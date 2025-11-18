/*
  src/backend/routes/publicRoutes.js
  Логические блоки:
    - middleware: body-parser для обработки формы (локально в этом роутере)
    - GET routes: '/', '/guide', '/pricing'
    - POST '/signup' -> publicController.handleSignup
*/
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const publicController = require('../controllers/publicController');

// локальные middleware для парсинга форм/JSON (не меняем global app)
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// GET / -> главная
router.get('/', publicController.renderHome);

// дополнительные публичные роуты (заглушки)
router.get('/guide', (req, res) => res.send('Guide — placeholder'));
router.get('/pricing', (req, res) => res.send('Pricing — placeholder'));

// POST /signup -> обработка формы регистрации (email или phone)
router.post('/signup', publicController.handleSignup);

module.exports = router;
