'use strict';

/**
 * src/backend/controllers/publicController.js
 *
 * Логические блоки:
 *  - renderHome (существующая)
 *  - renderRegister (новая) -> рендерит register.ejs
 *  - apiCheckAccount (новая) -> JSON { exists: true|false }
 *  - apiRegister (новая) -> создание записи в data/users.json
 *
 * Notes:
 *  - Для простоты пароли сохраняются как plain-text (не рекомендуется в prod).
 *    В рекомендациях ниже предлагаю использовать bcrypt и валидацию.
 */

const path = require('path');
const fs = require('fs-extra');

const USERS_FILE = path.join(__dirname, '..', '..', '..', 'data', 'users.json');

/* ---------- renderHome (существующая) ---------- */
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

/* ---------- renderRegister (новая) ---------- */
exports.renderRegister = (req, res) => {
  const meta = {
    title: 'Регистрация — ReferralMVP',
    description: 'Создайте аккаунт в ReferralMVP — укажите email или телефон, далее задайте пароль.',
  };

  res.render('register', meta);
};

/* ---------- apiCheckAccount (новая) ---------- */
exports.apiCheckAccount = async (req, res) => {
  try {
    const body = req.body || {};
    const rawEmail = body.email ? String(body.email).trim() : '';
    const rawPhone = body.phone ? String(body.phone).trim() : '';
    const email = rawEmail || null;
    const phone = (!email && rawPhone) ? rawPhone : (rawPhone || null);

    if (!email && !phone) {
      return res.status(400).json({ error: 'Требуется email или телефон' });
    }

    let data;
    try {
      data = await fs.readJson(USERS_FILE);
      if (!data || !Array.isArray(data.users)) data = { users: [] };
    } catch (err) {
      data = { users: [] };
    }

    const found = data.users.find(u => (email && u.email === email) || (phone && u.phone === phone));
    return res.json({ exists: Boolean(found) });
  } catch (err) {
    console.error('apiCheckAccount error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ---------- apiRegister (новая) ---------- */
exports.apiRegister = async (req, res) => {
  try {
    const body = req.body || {};
    const rawEmail = body.email ? String(body.email).trim() : '';
    const rawPhone = body.phone ? String(body.phone).trim() : '';
    const password = body.password ? String(body.password) : '';
    const email = rawEmail || null;
    const phone = (!email && rawPhone) ? rawPhone : (rawPhone || null);

    if (!email && !phone) return res.status(400).send('Требуется email или телефон');
    if (!password || password.length < 8) return res.status(400).send('Пароль слишком короткий');

    let data;
    try {
      data = await fs.readJson(USERS_FILE);
      if (!data || !Array.isArray(data.users)) data = { users: [] };
    } catch (err) {
      data = { users: [] };
      await fs.ensureFile(USERS_FILE);
    }

    const found = data.users.find(u => (email && u.email === email) || (phone && u.phone === phone));
    if (found) {
      // если вдруг пользователь появился между проверкой и сабмитом
      return res.status(409).send('Пользователь уже существует');
    }

    // NOTE: Для MVP сохраняем пароль как plain-string (срочно хешировать в prod)
    const newUser = {
      id: 'user_' + Date.now(),
      email: email || undefined,
      phone: phone || undefined,
      password: password,
      status: 'active',
      createdAt: new Date().toISOString(),
      source: 'self_register'
    };

    data.users.push(newUser);
    await fs.writeJson(USERS_FILE, data, { spaces: 2 });

    // Возвращаем 201 (или редиректим клиентом)
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('apiRegister error', err);
    return res.status(500).send('Internal Server Error');
  }
};
