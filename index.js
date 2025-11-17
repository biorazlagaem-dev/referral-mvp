'use strict';
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки EJS
app.set('views', path.join(__dirname, 'src', 'frontend', 'templates'));
app.set('view engine', 'ejs');

// Статика (css/js/assets)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
  res.render('index');
});

// Быстрый запуск
app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
