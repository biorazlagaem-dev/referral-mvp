'use strict';

/**
 * src/backend/controllers/publicController.js
 *
 * Логические блоки:
 *  - renderHome: рендер главной страницы (существующая логика)
 *  - postRegisterCheck: обработка формы "получить доступ"
 *
 * ВАЖНО: этот файл отвечает только за публичные представления / public API.
 */

const path = require('path');
const fs = require('fs-extra');

const USERS_FILE = path.join(__dirname, '..', '..', '..', 'data', 'users.json');

/* ---------- renderHome (существующая логика) ---------- */
exports.renderHome = (req, res) => {
  const meta = {
    title: 'ReferralMVP — реферальная платформа для вашего продукта',
    description: 'Запустите реферальную программу и продающие страницы для компаний за минуты.',
  };

  const hero = {
    heading: 'ReferralMVP — простая реферальная программа для вашего продукта',
    lead: 'Запустите реферальную страницу для каждой компании за минуты. Привлекайте клиентов через партнёров и отслеживайте рефералы в одном месте.',
  };

  res.render('index', Object.assign({}, meta, hero));
};

/* ---------- postRegisterCheck (новая логика) ---------- */
exports.postRegisterCheck = async (req, res) => {
  try {
    // Логика: принять либо email, либо phone (приоритет email если оба переданы)
    const rawEmail = (req.body && req.body.email) ? String(req.body.email).trim() : '';
    const rawPhone = (req.body && req.body.phone) ? String(req.body.phone).trim() : '';

    const email = rawEmail || null;
    const phone = (!email && rawPhone) ? rawPhone : (rawPhone || null);

    // Если нет ни email ни phone — вернём 400 или перенаправим обратно
    if (!email && !phone) {
      // Можно изменить поведение: вернуть ошибку или редирект с сообщением
      return res.status(400).send('Требуется email или телефон');
    }

    // Убедимся, что файл существует и содержит объект { users: [] }
    let data;
    try {
      data = await fs.readJson(USERS_FILE);
      if (!data || !Array.isArray(data.users)) {
        data = { users: [] };
      }
    } catch (err) {
      // Если файла нет или он повреждён, создаём начальную структуру
      data = { users: [] };
      await fs.ensureFile(USERS_FILE);
    }

    // Поиск пользователя: совпадение по email ИЛИ по телефону
    const found = data.users.find(u => (email && u.email === email) || (phone && u.phone === phone));

    if (found) {
      // Пользователь уже зарегистрирован — редиректим на /login (страница логина не создаётся)
      return res.redirect(302, '/login');
    }

    // Пользователь не найден — создаём запись (status: pending) и сохраняем
    const newUser = {
      id: 'user_' + Date.now(),
      email: email || undefined,
      phone: phone || undefined,
      status: 'pending',          // pending = запрос доступа, позже можно подтвердить
      createdAt: new Date().toISOString(),
      source: 'access_request'    // метка источника для аналитики
    };

    data.users.push(newUser);
    await fs.writeJson(USERS_FILE, data, { spaces: 2 });

    // После сохранения — редиректим на страницу регистрации (не создаём страницу)
    return res.redirect(302, '/register');

  } catch (err) {
    console.error('postRegisterCheck error:', err);
    // На ошибку — отдаём 500
    return res.status(500).send('Internal Server Error');
  }
};
