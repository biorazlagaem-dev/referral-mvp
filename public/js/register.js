/**
 * public/js/register.js
 * Исправлена ошибка доступа к несуществующему contactInput.
 * Логические блоки:
 *  - collectCredentials(): получает email / phone
 *  - doRegister(): POST /api/register, при success -> redirect /company-owner?...
 */

(function(){
  const $ = id => document.getElementById(id);
  const emailInput = $('email');
  const phoneInput = $('phone');
  const btnRegister = $('btn-register');
  const regHelp = $('reg-help');

  function showMsg(text){
    if(!regHelp) return;
    regHelp.textContent = text || '';
    regHelp.style.display = text ? 'block' : 'none';
  }

  function collectCredentials() {
    const email = emailInput ? (emailInput.value || '').trim() : '';
    const phone = phoneInput ? (phoneInput.value || '').trim() : '';
    return { email: email || null, phone: phone || null };
  }

  async function doRegister(){
    showMsg('Регистрация...');
    const creds = collectCredentials();
    const passwordEl = $('password');
    const confirmEl = $('confirm');
    const password = passwordEl ? passwordEl.value : '';
    const confirm = confirmEl ? confirmEl.value : '';

    if (!creds.email && !creds.phone) {
      showMsg('Укажите email или телефон.');
      return;
    }
    if (!password || password.length < 8) {
      showMsg('Пароль должен быть не менее 8 символов.');
      return;
    }
    if (password !== confirm) {
      showMsg('Пароли не совпадают.');
      return;
    }

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, creds, { password }))
      });
      if (!resp.ok) {
        const txt = await resp.text();
        showMsg('Ошибка: ' + (txt || resp.status));
        return;
      }
      // при успехе редиректим на профиль владельца компании и передаём идентификатор
      const qp = creds.email ? 'email=' + encodeURIComponent(creds.email) : 'phone=' + encodeURIComponent(creds.phone);
      window.location.href = '/company-owner?' + qp;
    } catch (err) {
      console.error(err);
      showMsg('Ошибка сети при регистрации.');
    }
  }

  btnRegister && btnRegister.addEventListener('click', doRegister);
})();
