/**
 * public/js/company-owner.js
 * Логические блоки:
 *  - init(): собирает query params (email/phone) и загружает данные /api/company-owner-data
 *  - renderProfile(), renderSites(), renderPartners(), renderClients()
 *  - handlers: add/edit site, reset partner counters, update client status, change password (client-side call)
 *
 * Примечание: все действия используют lightweight API endpoints /api/...
 */

(function(){
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  const phone = params.get('phone');

  function showSection(name){
    document.querySelectorAll('.profile-content .section').forEach(s => s.style.display = 'none');
    const el = document.getElementById('section-' + name);
    if(el) el.style.display = '';
  }

  // sidebar buttons
  document.querySelectorAll('.side-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.getAttribute('data-section');
      showSection(sec);
    });
  });

  // load initial data
  async function loadData(){
    const idObj = email ? { email } : (phone ? { phone } : {});
    try {
      const resp = await fetch('/api/company-owner-data', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(idObj)
      });
      if(!resp.ok){ const txt = await resp.text(); console.error('Load error',txt); return; }
      const json = await resp.json();
      renderProfile(json.user);
      renderSites(json.companies || []);
      renderPartners(json.partners || []);
      renderClients(json.clients || []);
    } catch (err) { console.error(err); }
  }

  function renderProfile(user){
    const dst = $('profile-details');
    if(!dst) return;
    dst.innerHTML = '';
    const p = document.createElement('div');
    p.innerHTML = '<p><strong>Email:</strong> ' + (user.email || '-') + '</p>' +
                  '<p><strong>Телефон:</strong> ' + (user.phone || '-') + '</p>' +
                  '<p><strong>Статус:</strong> ' + (user.status || '-') + '</p>';
    dst.appendChild(p);
  }

  function renderSites(sites){
    const dst = $('sites-list');
    dst.innerHTML = '';
    if(!sites.length){ dst.innerHTML = '<p>Сайтов пока нет.</p>'; return; }
    sites.forEach(site => {
      const div = document.createElement('div');
      div.style.border = '1px solid rgba(16,22,26,0.05)';
      div.style.padding = '12px';
      div.style.marginBottom = '10px';
      div.innerHTML = '<strong>' + site.name + '</strong><p style="margin:6px 0;color:#6b7c86;">' + (site.description||'') + '</p>' +
        '<div style="display:flex;gap:8px;"><button class="aui-button btn-edit-site" data-id="'+site.id+'">Изменить</button>' +
        '<button class="aui-button" onclick="window.open(\'/site/'+encodeURIComponent(site.slug)+'\',\'_blank\')">Посмотреть</button></div>';
      dst.appendChild(div);
    });
    // attach edit handlers
    document.querySelectorAll('.btn-edit-site').forEach(btn => {
      btn.addEventListener('click', openEditSite);
    });
  }

  function renderPartners(partners){
    const dst = $('partners-list');
    dst.innerHTML = '';
    if(!partners.length){ dst.innerHTML = '<p>Партнёров пока нет.</p>'; return; }
    partners.forEach(p => {
      const el = document.createElement('div');
      el.style.border = '1px solid rgba(16,22,26,0.05)';
      el.style.padding = '10px';
      el.style.marginBottom = '8px';
      el.innerHTML = '<strong>' + p.name + '</strong> — <span>Заработано: ' + (p.earned||0) + ' ₽</span> — <span>Клиентов: ' + (p.clients||0) + '</span>' +
        '<div style="margin-top:8px;"><button class="aui-button aui-button-link btn-reset" data-id="'+p.id+'">Обнулить</button></div>';
      dst.appendChild(el);
    });
    document.querySelectorAll('.btn-reset').forEach(b => {
      b.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if(!confirm('Обнулить счётчик партнёра?')) return;
        await fetch('/api/partner/reset', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ partnerId: id }) });
        loadData();
      });
    });
  }

  function renderClients(clients){
    const dst = $('clients-list');
    dst.innerHTML = '';
    if(!clients.length){ dst.innerHTML = '<p>Клиентов пока нет.</p>'; return; }
    clients.forEach(c => {
      const el = document.createElement('div');
      el.style.border = '1px solid rgba(16,22,26,0.05)';
      el.style.padding = '10px';
      el.style.marginBottom = '8px';
      el.innerHTML = '<strong>' + c.name + '</strong> — от партнёра: ' + (c.partnerName||'-') + ' — статус: <select data-id="'+c.id+'" class="client-status"><option value="new">new</option><option value="callback">перезвонить</option><option value="done">завершен</option><option value="rejected">отклонен</option></select>' +
        '<div style="margin-top:8px;"><button class="aui-button aui-button-link btn-client-update" data-id="'+c.id+'">Сохранить</button></div>';
      dst.appendChild(el);
    });
    // set current values and attach
    document.querySelectorAll('.client-status').forEach(sel => {
      const id = sel.getAttribute('data-id');
      const client = clients.find(cc=>cc.id===id);
      if(client) sel.value = client.status || 'new';
    });
    document.querySelectorAll('.btn-client-update').forEach(b=>{
      b.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        const sel = document.querySelector('.client-status[data-id="'+id+'"]');
        const status = sel ? sel.value : null;
        await fetch('/api/client/update-status', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ clientId: id, status }) });
        loadData();
      });
    });
  }

  // --- Site form handlers
  $('btn-add-site').addEventListener('click', ()=> {
    $('site-form-title').textContent = 'Новый сайт';
    $('site-name').value = '';
    $('site-desc').value = '';
    $('site-form').style.display = '';
    $('site-name').dataset.editId = '';
  });
  $('btn-cancel-site').addEventListener('click', ()=> $('site-form').style.display='none');

  async function openEditSite(e){
    const id = e.currentTarget.getAttribute('data-id');
    try {
      const resp = await fetch('/api/site/get', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ siteId: id }) });
      if(!resp.ok) return alert('Ошибка получения сайта');
      const json = await resp.json();
      $('site-form-title').textContent = 'Редактировать сайт';
      $('site-name').value = json.site.name || '';
      $('site-desc').value = json.site.description || '';
      $('site-form').style.display = '';
      $('site-name').dataset.editId = id;
    } catch (err) { console.error(err); }
  }

  $('btn-save-site').addEventListener('click', async () => {
    const name = $('site-name').value.trim();
    const desc = $('site-desc').value.trim();
    const editId = $('site-name').dataset.editId;
    const payload = editId ? { id: editId, name, description: desc } : { name, description: desc };
    await fetch('/api/company-site', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    $('site-form').style.display='none';
    loadData();
  });

  // change password (simple)
  $('btn-change-pass').addEventListener('click', async ()=>{
    const oldp = $('change-old').value || '';
    const newp = $('change-new').value || '';
    if(!newp || newp.length < 8) { $('profile-msg').textContent = 'Новый пароль слишком короткий.'; return; }
    // call API (server will check old password)
    const idObj = email ? { email } : (phone ? { phone } : {});
    const resp = await fetch('/api/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.assign({}, idObj, { old: oldp, password: newp })) });
    if(resp.ok) { $('profile-msg').textContent = 'Пароль изменён.'; } else { $('profile-msg').textContent = 'Ошибка смены пароля'; }
  });

  // init
  loadData();
})();
