'use strict';

/**
 * jsonStore.js — простая обёртка для чтения/записи JSON файлов в data/
 * Логические блоки:
 *  - low-level: readFile/writeFile
 *  - users API: getUsers, findUserByEmailOrPhone, addUser
 */

const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

async function readFile(name) {
  const p = path.join(DATA_DIR, name);
  try {
    const obj = await fs.readJson(p);
    return obj;
  } catch (err) {
    // если файл не найден или некорректен — вернём пустую структуру
    return {};
  }
}

async function writeFile(name, data) {
  const p = path.join(DATA_DIR, name);
  await fs.outputJson(p, data, { spaces: 2 });
}

/* ==========================
   Users API
   ========================== */

async function getUsers() {
  const content = await readFile('users.json');
  return Array.isArray(content.users) ? content.users : [];
}

async function findUserByEmailOrPhone({ email, phone }) {
  const users = await getUsers();
  const e = email ? String(email).trim().toLowerCase() : null;
  const p = phone ? String(phone).trim() : null;
  return users.find(u => (e && u.email && String(u.email).toLowerCase() === e) || (p && u.phone && String(u.phone) === p)) || null;
}

async function addUser({ email, phone }) {
  const users = await getUsers();
  const id = 'user_' + Date.now();
  const user = {
    id,
    email: email ? String(email).trim() : null,
    phone: phone ? String(phone).trim() : null,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await writeFile('users.json', { users });
  return user;
}

module.exports = {
  readFile,
  writeFile,
  /* users API */
  getUsers,
  findUserByEmailOrPhone,
  addUser
};
