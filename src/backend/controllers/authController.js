'use strict';

/**
 * authController.js
 * - registerCheck: принимает form (email или phone)
 *   1) валидация минимальная
 *   2) ищет в users.json
 *   3) если найден -> redirect /login
 *      иначе -> добавляет -> redirect /signup
 */

const jsonStore = require('../services/jsonStore');

exports.registerCheck = async (req, res) => {
  try {
    const email = req.body.email ? String(req.body.email).trim() : '';
    const phone = req.body.phone ? String(req.body.phone).trim() : '';

    if (!email && !phone) {
      // отсутствие данных — возвращаем пользователя обратно на главную с query flag
      return res.redirect('/?error=missing_contact');
    }

    const found = await jsonStore.findUserByEmailOrPhone({ email: email || undefined, phone: phone || undefined });

    if (found) {
      // если пользователь уже существует — редирект на вход
      return res.redirect('/login');
    }

    // если не найден — сохраняем и редиректим на страницу регистрации (placeholder)
    await jsonStore.addUser({ email: email || null, phone: phone || null });
    return res.redirect('/signup');
  } catch (err) {
    console.error('registerCheck error', err);
    return res.status(500).send('Internal Server Error');
  }
};
