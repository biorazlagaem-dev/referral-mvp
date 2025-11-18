/**
 * public/js/register.js
 * Логическая декомпозиция:
 *  - collectCredentials(): собрать email/phone
 *  - checkAccount(): POST /api/check-account -> { exists }
 *  - showPasswordStep() / hidePasswordStep()
 *  - submitRegistration(): POST /api/register -> success -> redirect /login
 *
 * ВАЖНО: backend должен принимать JSON. Убедитесь, что в index.js подключены express.json() / express.urlencoded().
 */

(function(){
  const el = id => document.getElementById(id);
  const emailInput = el('email');
  const phoneInput = el('phone');
  const btnContinue = el('btn-continue');
  const btnRegister = el('btn-register');
  const btnBack = el('btn-back');
  const stepMessage = el('step-message');
  const passwordMessage = el('password-message');

  function collectCredentials() {
    const email = emailInput.value && emailInput.value.trim();
    const phone = phoneInput.value && phoneInput.value.trim();
    return { email: email || null, phone: phone || null };
  }

  function showMessage(targetEl, text) {
    if (!targetEl) return;
    targetEl.textContent = text;
    targetEl.style.display = text ? 'block' : 'none';
  }

  function showPasswordStep() {
    document.getElementById('step-credentials').style.display = 'none';
    document.getElementById('step-passwords').style.display = 'block';
    showMessage(stepMessage, '');
  }

  function hidePasswordStep() {
    document.getElementById('step-passwords').style.display = 'none';
    document.getElementById('step-credentials').style.display = 'block';
    showMessage(passwordMessage, '');
  }

  async function checkAccount() {
    showMessage(stepMessage, 'Проверка...');
    const creds = collectCredentials();
    if (!creds.email && !creds.phone) {
      showMessage(stepMessage, 'Пожалуйста, укажите email или телефон.');
      return;
    }

    try {
      const resp = await fetch('/api/check-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });
      if (!resp.ok) {
        const text = await resp.text();
        showMessage(stepMessage, 'Ошибка: ' + (text || resp.status));
        return;
      }
      const json = await resp.json();
      if (json.exists) {
        // если аккаунт уже создан — редирект на /login
        window.location.href = '/login';
        return;
      }
      // иначе показываем форму паролей
      showPasswordStep();
    } catch (err) {
      console.error(err);
      showMessage(stepMessage, 'Ошибка сети. Попробуйте ещё раз.');
    }
  }

  async function submitRegistration() {
    showMessage(passwordMessage, 'Регистрация...');
    const creds = collectCredentials();
    const password = el('password').value || '';
    const confirm = el('confirm').value || '';

    if (!password || password.length < 8) {
      showMessage(passwordMessage, 'Пароль должен быть не менее 8 символов.');
      return;
    }
    if (password !== confirm) {
      showMessage(passwordMessage, 'Пароли не совпадают.');
      return;
    }

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...creds, password })
      });
      if (!resp.ok) {
        const text = await resp.text();
        showMessage(passwordMessage, 'Ошибка: ' + (text || resp.status));
        return;
      }
      // при успехе редиректим на /login
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
      showMessage(passwordMessage, 'Ошибка сети при регистрации.');
    }
  }

  // события
  btnContinue && btnContinue.addEventListener('click', checkAccount);
  btnRegister && btnRegister.addEventListener('click', submitRegistration);
  btnBack && btnBack.addEventListener('click', function(){ hidePasswordStep(); });
})();
