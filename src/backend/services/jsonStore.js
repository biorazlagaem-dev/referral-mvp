/*
  src/backend/services/jsonStore.js
  Логическая декомпозиция:
    - filePath(type) -> путь к data/<type>.json
    - read(type) -> {items array}
    - write(type, items) -> записывает { <type>: items }
    - findUserByEmailOrPhone({email, phone})
    - addUser(userObj)
*/
const path = require('path');
const fs = require('fs').promises;

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function filePath(type) {
  return path.join(DATA_DIR, `${type}.json`);
}

async function read(type) {
  const fp = filePath(type);
  try {
    const raw = await fs.readFile(fp, 'utf8');
    const obj = JSON.parse(raw || '{}');
    // структура: { "users": [...] } или { "companies": [...] }
    return obj[type] || [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function write(type, items) {
  const fp = filePath(type);
  const payload = {};
  payload[type] = items;
  // atomic-ish write: write temp then rename
  const tmp = fp + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tmp, fp);
  return payload;
}

async function findUserByEmailOrPhone({ email, phone }) {
  const users = await read('users');
  if (email) {
    const e = String(email).trim().toLowerCase();
    const found = users.find(u => u.email && String(u.email).trim().toLowerCase() === e);
    if (found) return found;
  }
  if (phone) {
    const p = String(phone).trim();
    const found = users.find(u => u.phone && String(u.phone).trim() === p);
    if (found) return found;
  }
  return null;
}

async function addUser(user) {
  const users = await read('users');
  users.push(user);
  await write('users', users);
  return user;
}

module.exports = {
  read,
  write,
  findUserByEmailOrPhone,
  addUser,
};
