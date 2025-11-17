'use strict';

/**
 * Public controller: рендер главной страницы и др. публичных страниц
 */

exports.renderHome = (req, res) => {
  // Можно добавить загрузку данных из data/* в будущем
  res.render('index', {
    title: 'ReferralMVP — Главная',
  });
};
