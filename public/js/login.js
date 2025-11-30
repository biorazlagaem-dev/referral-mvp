/**
 * public/js/login.js (обновлён)
 * - При успешном логине редиректим на /company-owner?email=... или ?phone=...
 * (остальная логика сохраняется)
 */

(function(){
  const $ = id => document.getElementById(id);
  const identifierInput = $('identifier');
  const btnContinue = $('btn-continue');
  const btnSignin = $('btn-signin');
  const btnBack = $('btn-back');
  const idHelp = $('id-help');
  const pwHelp = $('pw-help');

  function show(el, txt){
    if(!el) return;
    el.textContent = txt || '';
    el.style.display = txt ? 'block' : 'none';
  }

  function isEmail(val){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); }
  function isPhone(val){ return /^[+\d][\d\s\-()]{6,}$/.test(val); }

  function collectIdentifier(){
    const raw = (identifierInput && identifierInput.value || '').trim();
    if(!raw) return null;
    if (isEmail(raw)) return { email: raw };
    if (isPhone(raw)) return { phone: raw };
    return { email: raw };
  }

  function disableIdentifier() { if(identifierInput){ identifierInput.setAttribute('readonly','readonly'); identifierInput.classList.add('readonly'); } }
  function enableIdentifier() { if(identifierInput){ identifierInput.removeAttribute('readonly'); identifierInput.classList.remove('readonly'); } }

  async function checkAccount(){
    show(idHelp, 'Проверка...');
    const idVal = collectIdentifier();
    if(!idVal) { show(idHelp, 'Введите email или телефон'); return; }

    try {
      const resp = await fetch('/api/login-check', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(idVal)
      });
      if(!resp.ok){ const t = await resp.text(); show(idHelp, 'Ошибка: '+(t||resp.status)); return; }
      const json = await resp.json();
      if(json.exists) { disableIdentifier(); document.getElementById('step-identifier').style.display='none'; document.getElementById('step-password').style.display=''; return; }

      // create pending and redirect to register
      const createResp = await fetch('/api/create-pending', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(idVal)
      });
      if(!createResp.ok){ const t=await createResp.text(); show(idHelp,'Ошибка: '+(t||createResp.status)); return; }
      const qp = idVal.email ? 'email=' + encodeURIComponent(idVal.email) : 'phone=' + encodeURIComponent(idVal.phone);
      window.location.href = '/register?' + qp;
    } catch (err) {
      console.error(err); show(idHelp, 'Ошибка сети.');
    }
  }

  async function submitLogin(){
    show(pwHelp, 'Проверка...');
    const idVal = collectIdentifier();
    if(!idVal){ show(pwHelp,'Идентификатор отсутствует'); return; }
    const password = $('login-password') ? $('login-password').value : '';
    if(!password){ show(pwHelp,'Введите пароль'); return; }

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(Object.assign({}, idVal, { password }))
      });
      if(!resp.ok){
        if(resp.status===401){ show(pwHelp,'Неверный пароль.'); return; }
        const t=await resp.text(); show(pwHelp,'Ошибка: '+(t||resp.status)); return;
      }
      // redirect to company-owner including identifier for server to find user
      const qp = idVal.email ? 'email=' + encodeURIComponent(idVal.email) : 'phone=' + encodeURIComponent(idVal.phone);
      window.location.href = '/company-owner?' + qp;
    } catch (err) {
      console.error(err); show(pwHelp, 'Ошибка сети.');
    }
  }

  btnContinue && btnContinue.addEventListener('click', checkAccount);
  btnSignin && btnSignin.addEventListener('click', submitLogin);
  btnBack && btnBack.addEventListener('click', function(){ document.getElementById('step-password').style.display='none'; document.getElementById('step-identifier').style.display=''; enableIdentifier(); });

  // prefill handling left as before (no changes)
})();
