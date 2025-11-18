/*
  src/backend/controllers/publicController.js
  Логические блоки:
    - renderHome: собирает данные (meta/hero) и рендерит index
    - handleSignup: принимает форму регистрации, проверяет существование и редиректит
*/
const jsonStore = require('../services/jsonStore');

exports.renderHome = (req, res) => {
  const meta = {
    title: 'ReferralMVP — реферальная платформа',
    description: 'Запустите реферальную программу и продающие страницы для компаний быстро и просто.',
  };

  const hero = {
    heading: 'ReferralMVP — простая реферальная программа',
    lead: 'Создавайте продающие страницы для компаний, привлекайте партнёров и отслеживайте конверсии. Без лишних интеграций — MVP-скорость запуска.',
  };

  res.render('index', Object.assign({}, meta, hero));
};

/*
  handleSignup: ожидает form fields:
    - contactType: 'email' | 'phone'
    - email
    - phone

  Поведение:
    - если contactType === 'email' и email существует в users -> redirect /login
    - если contactType === 'phone' и phone существует -> redirect /login
    - иначе сохранить (email или phone в разные поля) и redirect /register
*/
exports.handleSignup = async (req, res) => {
  try {
    const body = req.body || {};
    const contactType = (body.contactType || '').toLowerCase();
    const email = body.email ? String(body.email).trim() : '';
    const phone = body.phone ? String(body.phone).trim() : '';

    if (contactType !== 'email' && contactType !== 'phone') {
      // Простая валидация: вернуть на главную с 400
      return res.status(400).send('Contact type required (email or phone)');
    }

    if (contactType === 'email' && !email) {
      return res.status(400).send('Email required');
    }
    if (contactType === 'phone' && !phone) {
      return res.status(400).send('Phone required');
    }

    const existing = await jsonStore.findUserByEmailOrPhone({ email, phone });
    if (existing) {
      // пользователь найден — редирект на страницу логина (страница логина не создаётся)
      return res.redirect(302, '/login');
    }

    // создать новый user (MVP поля)
    const newUser = {
      id: 'user_' + Date.now(),
      email: contactType === 'email' ? email : null,
      phone: contactType === 'phone' ? phone : null,
      createdAt: new Date().toISOString(),
      // далее можно добавить статус, source, utm и т.д.
    };

    await jsonStore.addUser(newUser);

    // редирект на страницу регистрации (страницы не создаём)
    return res.redirect(302, '/register');
  } catch (err) {
    console.error('handleSignup error', err);
    return res.status(500).send('Server error');
  }
};
