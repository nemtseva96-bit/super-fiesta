document.addEventListener('DOMContentLoaded', () => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let storageAvailable = true;
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { storageAvailable = false; return null; } },
    set(key, value) { try { localStorage.setItem(key, value); return true; } catch { storageAvailable = false; return false; } }
  };
  const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const externalLink = (label, url) => `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}<span class="material-symbols-rounded" aria-hidden="true">open_in_new</span></a>`;

  // One owner for task state, counts and filtering. Existing stable keys are retained.
  const data = window.tripPreparation;
  const prep = $('#preparation');
  const tasksContainer = $('#preparation-tasks');
  prep.querySelector('.prep-head').insertAdjacentHTML('beforeend', `
    <p class="prep-reviewed">Проверено ${data.reviewed}. Сроки задач — рекомендации; правила въезда зависят от паспорта.</p>
    <div class="prep-toolbar"><div class="prep-filters" role="group" aria-label="Фильтр задач">
      <button type="button" data-task-filter="all" aria-pressed="true">Все</button>
      <button type="button" data-task-filter="pending" aria-pressed="false">Осталось</button>
      <button type="button" data-task-filter="done" aria-pressed="false">Выполнено</button>
    </div><p id="prep-progress" role="status" aria-live="polite"></p></div>
    <p class="prep-storage" id="prep-storage">Отметки сохраняются в этом браузере.</p>`);
  data.groups.forEach((group, index) => {
    const section = document.createElement('section');
    section.className = 'task-group';
    section.setAttribute('aria-labelledby', `task-group-${index}`);
    section.innerHTML = `<h3 id="task-group-${index}">${group.title}</h3><p>${group.period}</p><div class="tasks"></div>`;
    group.tasks.forEach(task => {
      const row = document.createElement('div');
      row.className = `prep-task${task.priority ? ' prep-task--priority' : ''}`;
      const source = data.sources[task.source];
      row.innerHTML = `<label class="task"><input type="checkbox" data-key="${task.key}" aria-describedby="note-${task.key}"><span>${task.title}${task.priority ? '<span class="deadline-chip">Проверить в первую очередь</span>' : ''}</span></label><p class="prep-task-note" id="note-${task.key}">${task.note}</p>${source ? `<div class="prep-source">${externalLink(source[0], source[1])}</div>` : ''}`;
      const input = row.querySelector('input');
      const saved = storage.get(`china26-${task.key}`);
      input.checked = saved === null ? !!task.done : saved === '1';
      section.querySelector('.tasks').append(row);
    });
    tasksContainer.append(section);
  });
  const empty = document.createElement('p');
  empty.className = 'prep-empty';
  empty.textContent = 'В этом списке пока нет задач.';
  empty.hidden = true;
  tasksContainer.append(empty);
  let filter = 'all';
  function updatePreparation() {
    const inputs = $$('#preparation input[data-key]');
    const done = inputs.filter(input => input.checked).length;
    const percent = inputs.length ? Math.round(done / inputs.length * 100) : 0;
    const caption = $('.ready-card p');
    if (caption) { caption.classList.add('ready-count'); caption.innerHTML = `${done} из ${inputs.length} задач<br>выполнено`; }
    $('.ready-top b').textContent = 'Статус готовности';
    $('.ready-meta span')?.remove();
    $('.ready-progress i').style.width = `${percent}%`;
    $('.ready-meta strong').textContent = `${percent}%`;
    $('.ready-check').textContent = percent === 100 ? 'task_alt' : 'pending_actions';
    const progress = $('.ready-progress');
    Object.entries({role:'progressbar','aria-label':'Готовность к поездке','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(percent)}).forEach(([key,value]) => progress.setAttribute(key,value));
    $('#prep-progress').textContent = `Выполнено ${done} из ${inputs.length} · осталось ${inputs.length - done}`;
    inputs.forEach(input => {
      const row = input.closest('.prep-task');
      row.classList.toggle('is-done', input.checked);
      row.hidden = (filter === 'pending' && input.checked) || (filter === 'done' && !input.checked);
    });
    $$('#preparation .task-group').forEach(group => { group.hidden = ![...group.querySelectorAll('.prep-task')].some(row => !row.hidden); });
    empty.hidden = $$('#preparation .prep-task').some(row => !row.hidden);
    if (!storageAvailable) $('#prep-storage').textContent = 'Браузер не разрешил сохранение. Отметки доступны только до перезагрузки страницы.';
  }
  tasksContainer.addEventListener('change', event => {
    if (!event.target.matches('input[data-key]')) return;
    storage.set(`china26-${event.target.dataset.key}`, event.target.checked ? '1' : '0');
    updatePreparation();
  });
  $$('.prep-filters button').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.taskFilter;
    $$('.prep-filters button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    updatePreparation();
  }));
  updatePreparation();
  window.addEventListener('storage', event => {
    if (event.key && !event.key.startsWith('china26-')) return;
    $$('#preparation input[data-key]').forEach(input => {
      const saved = storage.get(`china26-${input.dataset.key}`);
      const task = data.groups.flatMap(group => group.tasks).find(item => item.key === input.dataset.key);
      input.checked = saved === null ? !!task.done : saved === '1';
    });
    updatePreparation();
  });

  // Put all shared sections in the main scroll surface and keep route tabs independent.
  $('.switcher').id = 'itinerary';
  $('.confirmed').id = 'bookings';
  $('.confirmed-group.hotels').id = 'hotels';
  $('.full-route').id = 'trip-overview';
  const mapCard = $('.map-card');
  const mapsSection = document.createElement('section');
  mapsSection.className = 'section trip-maps';
  mapsSection.id = 'maps';
  mapsSection.setAttribute('aria-labelledby', 'maps-heading');
  mapsSection.innerHTML = '<div class="section-title"><h2 id="maps-heading">Карты и мои места</h2></div>';
  mapsSection.append(mapCard);
  prep.before(mapsSection);
  const nav = document.createElement('nav');
  nav.className = 'section-nav';
  nav.setAttribute('aria-label', 'Разделы поездки');
  const sections = [['itinerary','route','Маршрут'],['bookings','flight','Авиабилеты'],['hotels','hotel','Отели'],['maps','map','Карты'],['preparation','checklist','Подготовка']];
  nav.innerHTML = sections.map(([id, icon, label]) => `<a href="#${id}"><span class="material-symbols-rounded" aria-hidden="true">${icon}</span>${label}</a>`).join('');
  $('.main').prepend(nav);
  const skip = document.createElement('a');
  skip.className = 'trip-skip';
  skip.href = '#itinerary';
  skip.textContent = 'Перейти к маршруту';
  document.body.prepend(skip);
  function navigateTo(id, updateHash = true) {
    const target = document.getElementById(id);
    if (!target) return;
    if (updateHash) { try { history.pushState(null, '', `#${id}`); } catch { /* file:// may restrict history */ } }
    target.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'start' });
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
  nav.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateTo(anchor.hash.slice(1));
  });
  const ready = $('.ready-card');
  ready.tabIndex = 0;
  ready.setAttribute('role', 'button');
  ready.setAttribute('aria-label', 'Перейти к плану подготовки');
  ready.addEventListener('click', () => navigateTo('preparation'));
  ready.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigateTo('preparation'); }
  });
  const tabs = $$('.route-tab');
  $('.switcher').setAttribute('aria-label','Часть путешествия');
  function selectRoute(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(item.dataset.route);
      panel.classList.toggle('active', selected);
    });
    updateActiveSection();
  }
  tabs.forEach((tab,index) => {
    tab.id = `tab-${tab.dataset.route}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls',tab.dataset.route);
    const panel = document.getElementById(tab.dataset.route);
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',tab.id);
    tab.addEventListener('click', () => selectRoute(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault(); selectRoute(tabs[next]); tabs[next].focus();
    });
  });
  function updateActiveSection() {
    const offset = nav.getBoundingClientRect().height + 36;
    let active = sections[0][0];
    sections.forEach(([id]) => { if (document.getElementById(id).getBoundingClientRect().top <= offset) active = id; });
    nav.querySelectorAll('a').forEach(link => {
      if (link.hash === `#${active}`) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  selectRoute(tabs.find(tab => tab.classList.contains('active')) || tabs[0]);
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { updateActiveSection(); scheduled = false; });
  }, {passive:true});
  const resizeNav = () => {
    document.documentElement.style.setProperty('--trip-nav-height', `${nav.getBoundingClientRect().height + 28}px`);
    updateActiveSection();
  };
  if (window.ResizeObserver) new ResizeObserver(resizeNav).observe(nav);
  resizeNav();
  window.addEventListener('hashchange', () => navigateTo(location.hash.slice(1), false));

  // Google Maps embeds show a selected stop. The text itinerary retains the whole journey.
  const stops = [
    ['Шанхай · 17–19 и 22–24 октября','Shanghai China'],
    ['Чжуцзяцзяо · 18 октября','Zhujiajiao Shanghai China'],
    ['Вансяньгу · 19–20 октября','Wangxian Valley Shangrao Jiangxi China'],
    ['Танкоу · 20–21 октября','Tangkou Huangshan China'],
    ['Хуаншань · 21–22 октября','Huangshan Paiyun Hotel China'],
    ['Чанша · 24–26 и 30–31 октября','Changsha Hunan China'],
    ['Фэнхуан · 26–27 октября','Fenghuang Ancient Town Hunan China'],
    ['Улинъюань · 27–29 октября','Wulingyuan Zhangjiajie China'],
    ['Тяньмэнь · 30 октября','Tianmen Mountain Zhangjiajie China'],
    ['Аэропорт Чанши · 31 октября','Changsha Huanghua International Airport'],
    ['Квартира в Сеуле · 31 октября — 7 ноября','16-7 Hwigyeong-ro 2ga-gil Seoul South Korea'],
    ['Инчхон · 31 октября и 7 ноября','Incheon International Airport Terminal 1']
  ];
  mapCard.innerHTML = `<div class="map-head"><div><h3>Остановки в Google Maps</h3><p>Выбери место, чтобы посмотреть его на карте. Вся последовательность поездки — в маршруте.</p></div></div>
    <div class="google-map-controls"><label for="map-stop">Место на карте</label><select id="map-stop">${stops.map(([label],index) => `<option value="${index}">${escapeHTML(label)}</option>`).join('')}</select><a id="google-map-open" target="_blank" rel="noopener noreferrer">Открыть в Google Maps <span class="material-symbols-rounded" aria-hidden="true">open_in_new</span></a></div>
    <iframe id="trip-map" class="google-map-frame" title="Google Maps: Шанхай" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
    <p class="google-map-note">Если карта не загрузилась, открой место по ссылке выше. В материковом Китае Google может быть недоступен: заранее сохрани адреса и запасную карту. Для маршрутов по Сеулу пригодится NAVER Map.</p>
    <details class="map-stop-list"><summary>Все остановки — списком</summary><ul>${stops.map(([label,query]) => `<li>${externalLink(label, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`)}</li>`).join('')}</ul></details>`;
  function showStop() {
    const [label,query] = stops[Number($('#map-stop').value)];
    const frame = $('#trip-map');
    frame.title = `Google Maps: ${label}`;
    frame.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=ru&z=13`;
    $('#google-map-open').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  $('#map-stop').addEventListener('change',showStop);
  showStop();

  const personal = document.createElement('div');
  personal.className = 'personal-maps';
  personal.innerHTML = `<h3>Мои списки Google Maps</h3><p>Добавь ссылку на список поездки, чтобы открывать его отсюда. Войдёшь в свой Google-аккаунт на стороне Google; сайт не читает твои сохранённые места автоматически.</p>
    <details><summary>Где взять ссылку</summary><p>В Google Maps открой «Сохранённые» → нужный список → «Поделиться». Скопируй ссылку и добавь её ниже. Доступ к списку определяется его настройками в Google.</p><p>Для всех отметок на одной встроенной карте можно добавить ссылку Google My Maps. Встраивание работает только для карты с разрешённым публичным доступом — этот сайт не меняет её настройки.</p>${externalLink('Инструкция Google', 'https://support.google.com/maps/answer/7280933?hl=ru')}</details>
    <form id="saved-map-form"><label for="saved-map-name">Название списка<input id="saved-map-name" name="name" required maxlength="80" placeholder="Например, кафе Сеула"></label><label for="saved-map-url">Ссылка Google Maps<input id="saved-map-url" name="url" type="url" required maxlength="2048" placeholder="https://maps.app.goo.gl/…" aria-describedby="saved-map-status"></label><button type="submit">Добавить список</button></form>
    <p id="saved-map-status" role="status" aria-live="polite">Ссылки сохраняются только в этом браузере. Синхронизации с аккаунтом нет.</p><ul id="saved-map-list"></ul><div id="personal-map-preview"></div>`;
  mapsSection.append(personal);
  function validGoogleURL(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      const host = url.hostname;
      const allowed = host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.pathname.startsWith('/maps')) || host === 'maps.google.com' || ((host === 'www.google.com' || host === 'google.com') && (url.pathname === '/maps' || url.pathname.startsWith('/maps/')));
      return allowed ? url : null;
    } catch { return null; }
  }
  let savedMaps = [];
  try {
    const parsed = JSON.parse(storage.get('china26-google-lists') || '[]');
    if (Array.isArray(parsed)) savedMaps = parsed.filter(item => item && typeof item.name === 'string' && item.name.length <= 80 && typeof item.url === 'string' && validGoogleURL(item.url)).slice(0,30);
  } catch { /* Preserve other trip preferences when malformed map data is present. */ }
  function renderSavedMaps() {
    const list = $('#saved-map-list');
    list.replaceChildren();
    if (!savedMaps.length) { const item=document.createElement('li'); item.className='saved-map-empty'; item.textContent='Списков пока нет. Добавь первый — например, места в Сеуле.'; list.append(item); }
    savedMaps.forEach((item,index) => {
      const li = document.createElement('li');
      li.innerHTML = externalLink(item.name,item.url);
      const url = validGoogleURL(item.url);
      if (url.pathname.startsWith('/maps/d/') && url.searchParams.get('mid')) {
        const preview = document.createElement('button');
        preview.type = 'button'; preview.textContent = 'Показать карту';
        preview.addEventListener('click', () => {
          const frame = document.createElement('iframe');
          frame.className = 'google-map-frame'; frame.title = `Моя карта: ${item.name}`;
          frame.src = `https://www.google.com/maps/d/embed?mid=${encodeURIComponent(url.searchParams.get('mid'))}`;
          frame.loading = 'lazy'; frame.referrerPolicy = 'no-referrer-when-downgrade';
          $('#personal-map-preview').replaceChildren(frame);
        });
        li.append(preview);
      }
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Убрать ссылку';
      remove.setAttribute('aria-label',`Убрать ссылку «${item.name}» с этого устройства`);
      remove.addEventListener('click', () => {
        savedMaps.splice(index,1);
        const persisted = storage.set('china26-google-lists',JSON.stringify(savedMaps));
        renderSavedMaps(); $('#personal-map-preview').replaceChildren();
        $('#saved-map-status').textContent = persisted ? 'Ссылка убрана с этого устройства. Сам список в Google не изменён.' : 'Ссылка убрана на этой странице. Браузер не разрешил сохранить изменение.';
        $('#saved-map-name').focus();
      });
      li.append(remove); list.append(li);
    });
  }
  $('#saved-map-form').addEventListener('submit',event => {
    event.preventDefault();
    const name = $('#saved-map-name').value.trim();
    const url = validGoogleURL($('#saved-map-url').value.trim());
    const status = $('#saved-map-status');
    if (!name || !url) { status.textContent = 'Введи название и ссылку https:// на Google Maps или Google My Maps.'; return; }
    if (savedMaps.some(item => item.url === url.href)) { status.textContent = 'Эта ссылка уже есть в списке.'; return; }
    if (savedMaps.length >= 30) { status.textContent = 'Можно сохранить до 30 списков. Сначала убери ненужную ссылку.'; return; }
    savedMaps.push({name,url:url.href});
    const persisted = storage.set('china26-google-lists',JSON.stringify(savedMaps));
    renderSavedMaps(); event.target.reset();
    status.textContent = persisted ? 'Ссылка сохранена в этом браузере. Открой список, чтобы увидеть свои места в Google Maps.' : 'Ссылка добавлена на страницу, но браузер не разрешил её сохранить.';
  });
  renderSavedMaps();
  if (!storageAvailable) $('#saved-map-status').textContent = 'Сохранение в браузере недоступно. Добавленные ссылки останутся только до перезагрузки.';
  if (location.hash && document.getElementById(location.hash.slice(1))) requestAnimationFrame(() => navigateTo(location.hash.slice(1),false));
});
