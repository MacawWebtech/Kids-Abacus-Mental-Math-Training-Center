/**
 * ==========================================================================
 * BeadUp Academy — dashboard.js
 * Parent dashboard behaviour. Loaded after main.js on /dashboard pages.
 *
 * Each page sets <body data-page="overview|children|enroll|progress|
 * sessions|payments|certificates|messages|settings">; the matching module
 * below runs on that page only.
 *
 * DATA: Everything here uses the demo data in `DemoData` and saves changes to
 * localStorage so the template feels alive.
 * TODO: Replace `Api` methods with real fetch() calls to your backend.
 *
 * MODULES
 *   Util, Store, Api        – helpers, persistence, data access
 *   Skeletons               – reveal widgets after data "loads"
 *   ChildSwitcher           – topbar child selector shared by all pages
 *   Badges                  – unread message count in the sidebar
 *   Pages.overview … Pages.settings
 * ==========================================================================
 */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const Prefs = (window.BeadUp && window.BeadUp.Prefs) || { get: () => null, set: () => {}, remove: () => {} };

  /* ------------------------------------------------------------------------
   * Util — formatting and safe HTML
   * --------------------------------------------------------------------- */
  const Util = {
    /** Escape text before putting it into innerHTML (child names are user input). */
    esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    /** Date that is `days` away from today, at hh:mm. */
    dayOffset(days, hh = 9, mm = 0) {
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      d.setDate(d.getDate() + days);
      return d;
    },
    monthsAgo(n, day = 12) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - n);
      d.setDate(Math.min(day, 28));
      return d;
    },
    fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) { return new Date(d).toLocaleDateString(undefined, opts); },
    fmtTime(d) { return new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); },
    fmtDay(d) { return new Date(d).toLocaleDateString(undefined, { weekday: 'short' }); },
    // TODO: change currency for your center
    money(n) { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n); },
    initials(name) { return String(name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase(); },
    sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); },
    uid() { return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; },
    greeting() {
      const h = new Date().getHours();
      return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    }
  };

  /* ------------------------------------------------------------------------
   * Static reference data — levels & batches (keep in sync with Programs page)
   * --------------------------------------------------------------------- */
  const LEVELS = [
    { id: 1, name: 'Bead Starter', ages: '5–6', months: 3, fee: 59 },
    { id: 2, name: 'Bead Explorer', ages: '6–8', months: 4, fee: 69 },
    { id: 3, name: 'Bead Builder', ages: '7–10', months: 4, fee: 79 },
    { id: 4, name: 'Bead Master', ages: '8–12', months: 5, fee: 89 },
    { id: 5, name: 'Mind Champion', ages: '9–14', months: 6, fee: 99 }
  ];
  const BATCHES = [
    { id: 'wkd-am', label: 'Weekend mornings', when: 'Sat & Sun · 10:00 AM', seats: 4 },
    { id: 'wkd-pm', label: 'Weekend afternoons', when: 'Sat & Sun · 3:00 PM', seats: 2 },
    { id: 'tt-eve', label: 'Tue & Thu evenings', when: 'Tue & Thu · 5:00 PM', seats: 5 },
    { id: 'mw-eve', label: 'Mon & Wed evenings', when: 'Mon & Wed · 4:30 PM', seats: 0 },
    { id: 'online', label: 'Live online', when: 'Wed & Fri · 6:30 PM', seats: 6 }
  ];
  const levelName = (id) => (LEVELS.find((l) => l.id === Number(id)) || LEVELS[0]).name;

  /* ------------------------------------------------------------------------
   * DemoData — sample family. TODO: remove once Api is connected.
   * --------------------------------------------------------------------- */
  const DemoData = {
    parent: { name: 'Priya Mehta', email: 'priya.mehta@example.com', phone: '555 012 3456' },
    children: [
      {
        id: 'c-aarav', first: 'Aarav', last: 'Mehta', age: 9, level: 3, progress: 68,
        batch: 'Wed & Sat · 4:30 PM', instructor: 'Ms. Kavya Raman', days: [3, 6], hh: 16, mm: 30, online: [6],
        skills: { Speed: 78, Accuracy: 92, Visualization: 71, Focus: 84, Listening: 80 },
        history: [
          { m: 5, speed: 9, accuracy: 81, viz: 52, result: 'Passed', note: 'Level 2 final test' },
          { m: 4, speed: 11, accuracy: 85, viz: 58, result: 'Passed', note: 'Level 3 entry check' },
          { m: 3, speed: 13, accuracy: 87, viz: 61, result: 'Good', note: 'Monthly check' },
          { m: 2, speed: 15, accuracy: 89, viz: 66, result: 'Good', note: 'Monthly check' },
          { m: 1, speed: 17, accuracy: 91, viz: 69, result: 'Great', note: 'Monthly check' },
          { m: 0, speed: 19, accuracy: 92, viz: 71, result: 'Great', note: 'Monthly check' }
        ],
        milestones: [
          { title: 'Level 1 — Bead Starter certificate', done: true },
          { title: 'Level 2 — Bead Explorer certificate', done: true },
          { title: 'First mental (no abacus) 3-digit sum', done: true },
          { title: '20 sums per minute', done: false },
          { title: 'Level 3 — Bead Builder certificate', done: false }
        ]
      },
      {
        id: 'c-mira', first: 'Mira', last: 'Mehta', age: 6, level: 1, progress: 35,
        batch: 'Tue & Thu · 5:00 PM', instructor: 'Mr. Daniel Ortiz', days: [2, 4], hh: 17, mm: 0, online: [],
        skills: { Speed: 41, Accuracy: 83, Visualization: 38, Focus: 62, Listening: 70 },
        history: [
          { m: 2, speed: 3, accuracy: 72, viz: 25, result: 'Started', note: 'Free assessment' },
          { m: 1, speed: 5, accuracy: 79, viz: 32, result: 'Good', note: 'Monthly check' },
          { m: 0, speed: 6, accuracy: 83, viz: 38, result: 'Good', note: 'Monthly check' }
        ],
        milestones: [
          { title: 'Counts 1–99 on the abacus', done: true },
          { title: 'Uses thumb and index finger correctly', done: true },
          { title: 'Adds single digits without counting fingers', done: false },
          { title: 'Level 1 — Bead Starter certificate', done: false }
        ]
      }
    ],
    invoices: [
      { id: 'INV-2041', m: 0, child: 'c-aarav', item: 'Level 3 monthly fee', amount: 79, status: 'due', dueIn: 7 },
      { id: 'INV-2042', m: 0, child: 'c-mira', item: 'Level 1 monthly fee', amount: 59, status: 'due', dueIn: 7 },
      { id: 'INV-1987', m: 1, child: 'c-aarav', item: 'Level 3 monthly fee', amount: 79, status: 'paid' },
      { id: 'INV-1988', m: 1, child: 'c-mira', item: 'Level 1 monthly fee', amount: 59, status: 'paid' },
      { id: 'INV-1930', m: 2, child: 'c-aarav', item: 'Winter Speed Challenge entry', amount: 25, status: 'paid' },
      { id: 'INV-1902', m: 2, child: 'c-mira', item: 'Starter abacus kit', amount: 35, status: 'paid' }
    ],
    messages: [
      { id: 'm1', from: 'Ms. Kavya Raman', subject: 'Aarav is ready for 20 sums a minute', body: 'Aarav did really well this week. He solved 19 three-digit sums in a minute with 92% accuracy. Ten minutes of daily practice with the home worksheet will help him hit 20 before the level test.', ago: 0, unread: true, type: 'progress' },
      { id: 'm2', from: 'BeadUp Front Desk', subject: 'Fee reminder: payment due in 7 days', body: 'This is a friendly reminder that this month’s fees for Aarav and Mira are due in 7 days. You can pay online from the Payments page in under a minute.', ago: 1, unread: true, type: 'payment' },
      { id: 'm3', from: 'Competitions Team', subject: 'Winter Speed Challenge registration is open', body: 'Registration for the Winter Speed Challenge is now open for Levels 2–5. Seats are limited to 120 students. Register from the Certificates & Competitions page.', ago: 3, unread: false, type: 'event' },
      { id: 'm4', from: 'Mr. Daniel Ortiz', subject: 'Mira’s first month — a great start', body: 'Mira is confident with numbers up to 99 on the abacus and loves the bead games. Next we will start single-digit additions using small friends (number pairs that make 5).', ago: 9, unread: false, type: 'progress' }
    ]
  };

  /* ------------------------------------------------------------------------
   * Store — localStorage persistence with demo defaults
   * --------------------------------------------------------------------- */
  const Store = {
    read(key, fallback) {
      const raw = Prefs.get(key);
      if (!raw) return JSON.parse(JSON.stringify(fallback));
      try { return JSON.parse(raw); } catch (e) { return JSON.parse(JSON.stringify(fallback)); }
    },
    write(key, value) { Prefs.set(key, JSON.stringify(value)); },
    reset() { ['bu-children', 'bu-invoices', 'bu-messages', 'bu-active-child', 'bu-requests'].forEach((k) => Prefs.remove(k)); }
  };

  /* ------------------------------------------------------------------------
   * Api — swap these for real endpoints.
   * Each returns a Promise so skeleton loaders show while "loading".
   * --------------------------------------------------------------------- */
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const Api = {
    // TODO: return fetch('/api/children').then(r => r.json())
    async children() { await delay(300); return Store.read('bu-children', DemoData.children); },
    saveChildren(list) { Store.write('bu-children', list); },
    async invoices() { await delay(300); return Store.read('bu-invoices', DemoData.invoices); },
    saveInvoices(list) { Store.write('bu-invoices', list); },
    async messages() { await delay(300); return Store.read('bu-messages', DemoData.messages); },
    saveMessages(list) { Store.write('bu-messages', list); },
    parent() { return DemoData.parent; }
  };

  /** Build upcoming sessions for one child from their weekly schedule. */
  const sessionsFor = (child, fromDays = -35, toDays = 70) => {
    const list = [];
    for (let i = fromDays; i <= toDays; i += 1) {
      const d = Util.dayOffset(i, child.hh || 16, child.mm || 0);
      if ((child.days || []).includes(d.getDay())) {
        list.push({
          date: d,
          child,
          title: `${levelName(child.level)} class`,
          instructor: child.instructor || 'To be assigned',
          online: (child.online || []).includes(d.getDay()),
          room: (child.online || []).includes(d.getDay()) ? 'Live online' : 'Room 2, Main Center'
        });
      }
    }
    return list;
  };
  // Center-wide event shown on the calendar
  const EVENTS = [{ date: Util.dayOffset(61, 9, 0), title: 'Winter Speed Challenge', comp: true }];

  /* ------------------------------------------------------------------------
   * Skeletons — show placeholders until a widget's data is ready.
   * Call Skeletons.done(el) or Skeletons.doneAll() after rendering.
   * --------------------------------------------------------------------- */
  const Skeletons = {
    done(el) { if (el) { el.classList.add('is-loaded'); el.setAttribute('aria-busy', 'false'); } },
    doneAll(ctx = document) { $$('[data-skeleton]', ctx).forEach((el) => this.done(el)); },
    init() { $$('[data-skeleton]').forEach((el) => el.setAttribute('aria-busy', 'true')); }
  };

  /* ------------------------------------------------------------------------
   * ChildSwitcher — <select data-child-switch> in the topbar
   * Fires "bu:childchange" so pages can re-render.
   * --------------------------------------------------------------------- */
  const ChildSwitcher = {
    children: [],
    activeId() {
      const saved = Prefs.get('bu-active-child');
      return this.children.some((c) => c.id === saved) ? saved : (this.children[0] && this.children[0].id);
    },
    active() { return this.children.find((c) => c.id === this.activeId()) || null; },
    setActive(id) {
      Prefs.set('bu-active-child', id);
      $$('[data-child-switch]').forEach((s) => { s.value = id; });
      document.dispatchEvent(new CustomEvent('bu:childchange', { detail: { id } }));
    },
    render() {
      $$('[data-child-switch]').forEach((sel) => {
        if (!this.children.length) {
          sel.innerHTML = '<option value="">No children yet</option>';
          sel.disabled = true;
          return;
        }
        sel.disabled = false;
        sel.innerHTML = this.children.map((c) => `<option value="${Util.esc(c.id)}">${Util.esc(c.first)} · ${Util.esc(levelName(c.level))}</option>`).join('');
        sel.value = this.activeId();
      });
    },
    async init() {
      this.children = await Api.children();
      this.render();
      $$('[data-child-switch]').forEach((sel) => sel.addEventListener('change', () => this.setActive(sel.value)));
      return this.children;
    }
  };

  /* ------------------------------------------------------------------------
   * Badges — unread message count in the sidebar + bell dot
   * --------------------------------------------------------------------- */
  const Badges = {
    async update(list) {
      const msgs = list || await Api.messages();
      const n = msgs.filter((m) => m.unread).length;
      $$('[data-unread-count]').forEach((el) => { el.textContent = String(n); el.hidden = n === 0; });
      $$('[data-unread-dot]').forEach((el) => { el.hidden = n === 0; });
      $$('[data-unread-label]').forEach((el) => { el.textContent = n ? `${n} unread notification${n > 1 ? 's' : ''}` : 'No new notifications'; });
    }
  };

  /* ------------------------------------------------------------------------
   * Shared renderers
   * --------------------------------------------------------------------- */
  const avatar = (child, size = '') =>
    `<span class="child-avatar ${size}" style="background:var(--bu-level-${Number(child.level) || 1})" aria-hidden="true">${Util.esc(Util.initials(`${child.first} ${child.last || ''}`))}</span>`;

  const emptyState = ({ icon = 'bi-emoji-smile', title, text, action = '' }) => `
    <div class="empty-state">
      <div class="icon-bead"><i class="bi ${icon}" aria-hidden="true"></i></div>
      <h3>${title}</h3>
      <p>${text}</p>
      ${action}
    </div>`;

  const sessionRow = (s) => `
    <li class="session-item">
      <div class="session-time"><strong>${s.date.getDate()}</strong><span>${Util.esc(Util.fmtDay(s.date))}</span></div>
      <div class="flex-grow-1">
        <h3>${Util.esc(s.child.first)} · ${Util.esc(s.title)}</h3>
        <p><i class="bi bi-clock" aria-hidden="true"></i> <time datetime="${s.date.toISOString()}">${Util.esc(Util.fmtTime(s.date))}</time> · ${Util.esc(s.instructor)} · ${Util.esc(s.room)}</p>
      </div>
      ${s.online
        ? '<a class="btn btn-sm btn-primary" href="#" data-join-class aria-label="Join online class"><i class="bi bi-camera-video" aria-hidden="true"></i> Join</a>'
        : '<span class="badge-soft badge-soft--gray">In center</span>'}
    </li>`;

  const progressBar = (label, value, cls = 'progress-bu--l3') => `
    <div class="mb-3">
      <div class="progress-label"><span>${Util.esc(label)}</span><span>${value}%</span></div>
      <div class="progress progress-bu ${cls}" role="progressbar" aria-label="${Util.esc(label)}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" style="width:${value}%"></div>
      </div>
    </div>`;

  /* ======================================================================
   * Pages
   * ==================================================================== */
  const Pages = {};

  /* ---- Overview ------------------------------------------------------ */
  Pages.overview = async () => {
    const greet = $('[data-greeting]');
    if (greet) greet.textContent = `${Util.greeting()}, ${Api.parent().name.split(' ')[0]}`;

    const children = ChildSwitcher.children;
    const invoices = await Api.invoices();
    const messages = await Api.messages();

    // Stats
    const all = children.flatMap((c) => sessionsFor(c, 0, 30)).filter((s) => s.date > new Date()).sort((a, b) => a.date - b.date);
    const next = all[0];
    const due = invoices.filter((i) => i.status === 'due');
    const dueTotal = due.reduce((sum, i) => sum + i.amount, 0);
    const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
    setText('[data-stat="next"]', next ? `${Util.fmtDay(next.date)} ${Util.fmtTime(next.date)}` : 'None booked');
    setText('[data-stat="next-sub"]', next ? `${next.child.first} · ${next.title}` : 'Enroll to book classes');
    setText('[data-stat="due"]', dueTotal ? Util.money(dueTotal) : 'All paid');
    setText('[data-stat="due-sub"]', due.length ? `${due.length} invoice${due.length > 1 ? 's' : ''} due in ${due[0].dueIn} days` : 'Nothing to pay right now');
    setText('[data-stat="kids"]', String(children.length));
    setText('[data-stat="unread"]', String(messages.filter((m) => m.unread).length));

    // Children summary
    const kids = $('#children-summary');
    if (kids) {
      kids.innerHTML = children.length ? children.map((c) => `
        <div class="col-md-6">
          <article class="widget child-card">
            <div class="child-card__top">
              ${avatar(c)}
              <div>
                <h3>${Util.esc(c.first)} ${Util.esc(c.last || '')}</h3>
                <span class="level-chip level-chip--${c.level}">Level ${c.level} · ${Util.esc(levelName(c.level))}</span>
              </div>
            </div>
            ${progressBar('Level progress', c.progress, `progress-bu--l${c.level}`)}
            <p class="mb-0 small text-muted"><i class="bi bi-calendar3" aria-hidden="true"></i> ${Util.esc(c.batch || 'No batch yet')} · ${Util.esc(c.instructor || '')}</p>
            <a class="link-arrow" href="progress.html" data-open-child="${Util.esc(c.id)}">See ${Util.esc(c.first)}’s progress <i class="bi bi-arrow-right" aria-hidden="true"></i></a>
          </article>
        </div>`).join('')
        : `<div class="col-12">${emptyState({ icon: 'bi-person-plus', title: 'Add your first child', text: 'Add your child’s name and age to see their classes and progress here.', action: '<a class="btn btn-cta" href="children.html"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add a child</a>' })}</div>`;
      kids.addEventListener('click', (e) => {
        const link = e.target.closest('[data-open-child]');
        if (link) Prefs.set('bu-active-child', link.dataset.openChild);
      });
    }

    // Next sessions
    const list = $('#next-sessions');
    if (list) list.innerHTML = all.length ? `<ul class="list-unstyled m-0">${all.slice(0, 3).map(sessionRow).join('')}</ul>`
      : emptyState({ icon: 'bi-calendar-plus', title: 'No classes booked', text: 'Once your child joins a batch, their next classes show up here.', action: '<a class="btn btn-cta" href="enroll.html">Enroll in a program</a>' });

    // Pending payment
    const pay = $('#pending-payment');
    if (pay) pay.innerHTML = due.length ? `
      <p class="stat-card__value mb-1">${Util.money(dueTotal)}</p>
      <p class="text-muted">Due on ${Util.esc(Util.fmtDate(Util.dayOffset(due[0].dueIn)))} for ${due.length} invoice${due.length > 1 ? 's' : ''}.</p>
      <ul class="list-unstyled small mb-3">${due.map((i) => `<li class="d-flex justify-content-between py-1 border-bottom"><span>${Util.esc(i.item)}</span><strong>${Util.money(i.amount)}</strong></li>`).join('')}</ul>
      <a class="btn btn-cta w-100" href="payments.html"><i class="bi bi-credit-card" aria-hidden="true"></i> Pay now</a>`
      : emptyState({ icon: 'bi-check2-circle', title: 'You’re all paid up', text: 'There are no fees due right now. Thank you!' });

    // Latest progress for active child
    const renderLatest = () => {
      const c = ChildSwitcher.active();
      const box = $('#latest-progress');
      if (!box) return;
      if (!c) { box.innerHTML = emptyState({ icon: 'bi-graph-up', title: 'No progress yet', text: 'Progress appears after your child’s first assessment.' }); return; }
      const last = c.history[c.history.length - 1];
      box.innerHTML = `
        <p class="mb-3"><strong>${Util.esc(c.first)}</strong> · last check on ${Util.esc(Util.fmtDate(Util.monthsAgo(last.m)))}</p>
        ${Object.entries(c.skills).slice(0, 3).map(([k, v], i) => progressBar(k, v, ['progress-bu--l3', 'progress-bu--green', 'progress-bu--l4'][i])).join('')}
        <a class="link-arrow" href="progress.html">Open full progress report <i class="bi bi-arrow-right" aria-hidden="true"></i></a>`;
    };
    renderLatest();
    document.addEventListener('bu:childchange', renderLatest);

    // Recent messages
    const msgBox = $('#recent-messages');
    if (msgBox) msgBox.innerHTML = `<ul class="msg-list">${messages.slice(0, 3).map((m) => `
      <li><a class="msg ${m.unread ? 'is-unread' : ''} text-decoration-none" href="messages.html">
        <span class="icon-bead icon-bead--sm"><i class="bi ${m.type === 'payment' ? 'bi-credit-card' : m.type === 'event' ? 'bi-trophy' : 'bi-chat-heart'}" aria-hidden="true"></i></span>
        <span class="flex-grow-1"><span class="msg__title">${Util.esc(m.subject)}</span><span class="msg__from">${Util.esc(m.from)}</span></span>
      </a></li>`).join('')}</ul>`;

    Skeletons.doneAll();
  };

  /* ---- My Children --------------------------------------------------- */
  Pages.children = async () => {
    const grid = $('#children-grid');
    const modalEl = $('#childModal');
    const form = $('#child-form');
    const modal = modalEl && window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(modalEl) : null;

    const render = () => {
      const list = ChildSwitcher.children;
      const activeId = ChildSwitcher.activeId();
      grid.innerHTML = list.length ? list.map((c) => `
        <div class="col-md-6 col-xl-4">
          <article class="widget child-card ${c.id === activeId ? 'is-active' : ''}">
            <div class="child-card__top">
              ${avatar(c)}
              <div class="flex-grow-1">
                <h2 class="h3 mb-1">${Util.esc(c.first)} ${Util.esc(c.last || '')}</h2>
                <span class="level-chip level-chip--${c.level}">Level ${c.level} · ${Util.esc(levelName(c.level))}</span>
              </div>
            </div>
            <dl class="meta-grid">
              <div><dt>Age</dt><dd>${Util.esc(c.age)} years</dd></div>
              <div><dt>Progress</dt><dd>${Util.esc(c.progress || 0)}%</dd></div>
              <div class="col-span"><dt>Batch</dt><dd>${Util.esc(c.batch || 'Not enrolled yet')}</dd></div>
              <div><dt>Teacher</dt><dd>${Util.esc(c.instructor || '—')}</dd></div>
            </dl>
            <div class="d-flex flex-wrap gap-2 mt-auto">
              <button type="button" class="btn btn-sm btn-primary" data-switch="${Util.esc(c.id)}" ${c.id === activeId ? 'disabled' : ''}>
                <i class="bi bi-person-check" aria-hidden="true"></i> ${c.id === activeId ? 'Selected' : 'Switch to ' + Util.esc(c.first)}
              </button>
              <button type="button" class="btn btn-sm btn-outline-primary" data-edit="${Util.esc(c.id)}"><i class="bi bi-pencil" aria-hidden="true"></i> Edit</button>
              <button type="button" class="btn btn-sm btn-ghost" data-remove="${Util.esc(c.id)}" aria-label="Remove ${Util.esc(c.first)}"><i class="bi bi-trash" aria-hidden="true"></i></button>
            </div>
          </article>
        </div>`).join('')
        : `<div class="col-12">${emptyState({ icon: 'bi-person-plus', title: 'No child profiles yet', text: 'Add your child to book a free trial, enroll in a level and follow their progress.', action: '<button type="button" class="btn btn-cta" data-add-child><i class="bi bi-plus-lg" aria-hidden="true"></i> Add a child</button>' })}</div>`;
    };

    const openForm = (child) => {
      form.reset();
      form.classList.remove('was-validated');
      $('#childModalLabel').textContent = child ? `Edit ${child.first}’s profile` : 'Add a child';
      form.elements.childId.value = child ? child.id : '';
      if (child) {
        form.elements.first.value = child.first;
        form.elements.last.value = child.last || '';
        form.elements.age.value = child.age;
        form.elements.level.value = child.level;
        form.elements.notes.value = child.notes || '';
      }
      modal && modal.show();
    };

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-add-child],[data-edit],[data-remove],[data-switch]');
      if (!t) return;
      const list = ChildSwitcher.children;
      if (t.hasAttribute('data-add-child')) openForm(null);
      if (t.dataset.edit) openForm(list.find((c) => c.id === t.dataset.edit));
      if (t.dataset.switch) { ChildSwitcher.setActive(t.dataset.switch); render(); }
      if (t.dataset.remove) {
        const child = list.find((c) => c.id === t.dataset.remove);
        // eslint-disable-next-line no-alert
        if (child && window.confirm(`Remove ${child.first}’s profile? You can add it again later.`)) {
          ChildSwitcher.children = list.filter((c) => c.id !== child.id);
          Api.saveChildren(ChildSwitcher.children);
          ChildSwitcher.render();
          render();
        }
      }
    });

    // The form uses main.js validation with data-no-submit, then fires bu:valid
    form.addEventListener('bu:valid', () => {
      const f = form.elements;
      const list = ChildSwitcher.children;
      const data = { first: f.first.value.trim(), last: f.last.value.trim(), age: Number(f.age.value), level: Number(f.level.value), notes: f.notes.value.trim() };
      if (f.childId.value) {
        const idx = list.findIndex((c) => c.id === f.childId.value);
        if (idx > -1) list[idx] = { ...list[idx], ...data };
      } else {
        list.push({ id: Util.uid(), ...data, progress: 0, batch: '', instructor: '', days: [], online: [], skills: { Speed: 0, Accuracy: 0, Visualization: 0, Focus: 0, Listening: 0 }, history: [], milestones: [] });
      }
      Api.saveChildren(list);
      ChildSwitcher.render();
      render();
      modal && modal.hide();
      const toast = $('#saved-toast');
      if (toast && window.bootstrap) window.bootstrap.Toast.getOrCreateInstance(toast).show();
    });

    render();
    Skeletons.doneAll();
  };

  /* ---- Enroll wizard ------------------------------------------------- */
  Pages.enroll = async () => {
    const form = $('#enroll-form');
    if (!form) return;
    const steps = $$('[data-step]', form);
    const markers = $$('.stepper li');
    let current = 0;
    /** Value of the checked radio in a group ('' if none). */
    const picked = (name) => { const el = $(`input[name="${name}"]:checked`, form); return el ? el.value : ''; };

    // Step 1 — children
    const kidBox = $('#choose-child');
    const kids = ChildSwitcher.children;
    kidBox.innerHTML = kids.length ? kids.map((c, i) => `
      <div class="choice">
        <input type="radio" name="child" id="child-${i}" value="${Util.esc(c.id)}" ${c.id === ChildSwitcher.activeId() ? 'checked' : ''}>
        <label for="child-${i}">${avatar(c)}<span><strong>${Util.esc(c.first)} ${Util.esc(c.last || '')}</strong><small>Age ${Util.esc(c.age)} · now Level ${c.level}</small></span></label>
      </div>`).join('')
      : emptyState({ icon: 'bi-person-plus', title: 'Add a child first', text: 'You need a child profile before choosing a level.', action: '<a class="btn btn-cta" href="children.html">Add a child</a>' });

    // Step 2 — levels (recommended = one above current)
    const levelBox = $('#choose-level');
    const renderLevels = () => {
      const child = kids.find((c) => c.id === picked('child'));
      const rec = child ? Math.min(5, child.level + (child.progress >= 60 ? 1 : 0)) : 1;
      levelBox.innerHTML = LEVELS.map((l) => `
        <div class="choice">
          <input type="radio" name="level" id="level-${l.id}" value="${l.id}" ${l.id === rec ? 'checked' : ''}>
          <label for="level-${l.id}"><span class="belt-badge belt-badge--sm belt-badge--${l.id}" aria-hidden="true">${l.id}</span>
            <span><strong>${Util.esc(l.name)}</strong><small>Ages ${l.ages} · ${l.months} months · ${Util.money(l.fee)}/month</small>
            ${l.id === rec ? '<span class="badge-soft badge-soft--green mt-1"><i class="bi bi-stars" aria-hidden="true"></i> Recommended</span>' : ''}</span></label>
        </div>`).join('');
    };

    // Step 3 — batches
    $('#choose-batch').innerHTML = BATCHES.map((b) => `
      <div class="choice">
        <input type="radio" name="batch" id="batch-${b.id}" value="${b.id}" ${b.seats === 0 ? 'disabled' : ''}>
        <label for="batch-${b.id}"><span class="icon-bead icon-bead--sm"><i class="bi ${b.id === 'online' ? 'bi-laptop' : 'bi-calendar-week'}" aria-hidden="true"></i></span>
          <span><strong>${Util.esc(b.label)}</strong><small>${Util.esc(b.when)}</small>
          <span class="badge-soft ${b.seats === 0 ? 'badge-soft--red' : b.seats <= 2 ? 'badge-soft--amber' : 'badge-soft--green'} mt-1">${b.seats === 0 ? 'Full — join waitlist by message' : `${b.seats} seat${b.seats > 1 ? 's' : ''} left`}</span></span></label>
      </div>`).join('');

    const go = (i) => {
      current = i;
      steps.forEach((s, n) => { s.hidden = n !== i; });
      markers.forEach((m, n) => {
        m.classList.toggle('is-current', n === i);
        m.classList.toggle('is-done', n < i);
        if (n === i) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
      });
      if (i === 1) renderLevels();
      if (i === 3) renderSummary();
      const heading = $('h2', steps[i]);
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus(); }
    };

    const requireChoice = (name, msg) => {
      const err = $(`[data-error-for="${name}"]`, form);
      const ok = !!picked(name);
      if (err) { err.textContent = ok ? '' : msg; err.style.display = ok ? 'none' : 'flex'; }
      return ok;
    };

    const renderSummary = () => {
      const child = kids.find((c) => c.id === picked('child'));
      const level = LEVELS.find((l) => l.id === Number(picked('level')));
      const batch = BATCHES.find((b) => b.id === picked('batch'));
      $('#enroll-summary').innerHTML = `
        <dl class="meta-grid">
          <div><dt><i class="bi bi-person" aria-hidden="true"></i> Child</dt><dd>${Util.esc(child.first)} ${Util.esc(child.last || '')}</dd></div>
          <div><dt><i class="bi bi-bar-chart-steps" aria-hidden="true"></i> Level</dt><dd>Level ${level.id} · ${Util.esc(level.name)}</dd></div>
          <div><dt><i class="bi bi-calendar-week" aria-hidden="true"></i> Batch</dt><dd>${Util.esc(batch.when)}</dd></div>
          <div><dt><i class="bi bi-cash-coin" aria-hidden="true"></i> Monthly fee</dt><dd>${Util.money(level.fee)}</dd></div>
        </dl>
        <p class="small text-muted mt-3 mb-0">First class starts next week. You can pay the first month after confirming, from the Payments page.</p>`;
    };

    form.addEventListener('click', (e) => {
      const next = e.target.closest('[data-next]');
      const back = e.target.closest('[data-back]');
      if (back) go(current - 1);
      if (next) {
        const checks = [
          () => requireChoice('child', 'Please choose which child you are enrolling.'),
          () => requireChoice('level', 'Please choose a level. Not sure? Pick the recommended one.'),
          () => requireChoice('batch', 'Please choose a batch time that works for your family.')
        ];
        if (checks[current] && !checks[current]()) return;
        go(current + 1);
      }
    });

    form.addEventListener('bu:submitted', () => {
      form.hidden = true;
      $('.stepper').hidden = true;
      const done = $('#enroll-done');
      done.hidden = false;
      done.focus();
    });

    go(0);
    Skeletons.doneAll();
  };

  /* ---- Progress ------------------------------------------------------ */
  Pages.progress = async () => {
    let charts = [];
    const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    const render = () => {
      const c = ChildSwitcher.active();
      const body = $('#progress-body');
      const empty = $('#progress-empty');
      if (!c || !c.history || !c.history.length) {
        body.hidden = true;
        empty.hidden = false;
        empty.innerHTML = emptyState({ icon: 'bi-graph-up-arrow', title: 'No assessments yet', text: 'Your child’s first skill check happens in their first two weeks. Results will appear here.', action: '<a class="btn btn-cta" href="enroll.html">Enroll in a program</a>' });
        return;
      }
      body.hidden = false;
      empty.hidden = true;

      $$('[data-child-name]').forEach((el) => { el.textContent = c.first; });
      const last = c.history[c.history.length - 1];
      const first = c.history[0];
      $('#level-summary').innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-3">
          <span class="belt-badge belt-badge--${c.level}" aria-hidden="true">${c.level}</span>
          <div><p class="h3 mb-1">Level ${c.level} · ${Util.esc(levelName(c.level))}</p><p class="mb-0 text-muted">${c.progress}% of this level done</p></div>
        </div>
        ${progressBar(`Level ${c.level} progress`, c.progress, `progress-bu--l${c.level}`)}
        <div class="row g-2 text-center mt-1">
          <div class="col-4"><div class="bg-surface-2 rounded-3 p-2"><strong class="d-block h4 mb-0">${last.speed}</strong><span class="small text-muted">sums / min</span></div></div>
          <div class="col-4"><div class="bg-surface-2 rounded-3 p-2"><strong class="d-block h4 mb-0">${last.accuracy}%</strong><span class="small text-muted">accuracy</span></div></div>
          <div class="col-4"><div class="bg-surface-2 rounded-3 p-2"><strong class="d-block h4 mb-0 text-success-ink">+${last.speed - first.speed}</strong><span class="small text-muted">speed gain</span></div></div>
        </div>`;

      $('#skill-bars').innerHTML = Object.entries(c.skills).map(([k, v], i) =>
        progressBar(k, v, ['progress-bu--l3', 'progress-bu--green', 'progress-bu--l4', 'progress-bu--amber', 'progress-bu--l2'][i % 5])).join('');

      $('#history-rows').innerHTML = c.history.slice().reverse().map((h) => `
        <tr>
          <td><time datetime="${Util.monthsAgo(h.m).toISOString().slice(0, 10)}">${Util.esc(Util.fmtDate(Util.monthsAgo(h.m)))}</time></td>
          <td>${Util.esc(h.note)}</td>
          <td>${h.speed}</td>
          <td class="col-opt">${h.accuracy}%</td>
          <td class="col-opt">${h.viz}</td>
          <td><span class="badge-soft ${h.result === 'Passed' || h.result === 'Great' ? 'badge-soft--green' : 'badge-soft--indigo'}">${Util.esc(h.result)}</span></td>
        </tr>`).join('');

      $('#milestones').innerHTML = (c.milestones || []).map((m) => `
        <li class="d-flex gap-3 align-items-start py-2">
          <span class="icon-bead icon-bead--sm ${m.done ? 'icon-bead--green' : ''}"><i class="bi ${m.done ? 'bi-check-lg' : 'bi-flag'}" aria-hidden="true"></i></span>
          <span><strong class="d-block">${Util.esc(m.title)}</strong><span class="small text-muted">${m.done ? 'Achieved' : 'Next goal'}</span></span>
        </li>`).join('');

      // Charts (Chart.js). Falls back to a note if the library failed to load.
      charts.forEach((ch) => ch.destroy());
      charts = [];
      if (!window.Chart) {
        $$('.chart-box').forEach((box) => { box.innerHTML = '<p class="text-muted">The chart could not load. Please check your connection — the numbers are in the table below.</p>'; });
        return;
      }
      const rtl = document.documentElement.dir === 'rtl';
      const ink = cssVar('--bu-muted');
      const grid = cssVar('--bu-border');
      window.Chart.defaults.font.family = cssVar('--bu-font-body');
      window.Chart.defaults.font.size = 14;
      window.Chart.defaults.color = ink;
      const labels = c.history.map((h) => Util.fmtDate(Util.monthsAgo(h.m), { month: 'short' }));
      charts.push(new window.Chart($('#speedChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Speed (sums per minute)', data: c.history.map((h) => h.speed), borderColor: cssVar('--bu-primary-600'), backgroundColor: cssVar('--bu-primary-600'), tension: .35, pointRadius: 5, yAxisID: 'y' },
            { label: 'Accuracy (%)', data: c.history.map((h) => h.accuracy), borderColor: cssVar('--bu-accent-bright'), backgroundColor: cssVar('--bu-accent-bright'), borderDash: [6, 4], tension: .35, pointRadius: 5, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, locale: document.documentElement.lang,
          animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : undefined,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { rtl, position: 'bottom', labels: { usePointStyle: true, boxHeight: 8 } }, tooltip: { rtl } },
          scales: {
            x: { reverse: rtl, grid: { color: grid } },
            y: { position: rtl ? 'right' : 'left', beginAtZero: true, grid: { color: grid }, title: { display: true, text: 'Sums / min' } },
            y1: { position: rtl ? 'left' : 'right', min: 50, max: 100, grid: { display: false }, title: { display: true, text: 'Accuracy %' } }
          }
        }
      }));
      charts.push(new window.Chart($('#skillChart'), {
        type: 'radar',
        data: {
          labels: Object.keys(c.skills),
          datasets: [{ label: `${c.first}’s skills`, data: Object.values(c.skills), borderColor: cssVar('--bu-secondary-600'), backgroundColor: 'rgba(37,99,235,.22)', pointBackgroundColor: cssVar('--bu-secondary-600') }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : undefined,
          plugins: { legend: { display: false } },
          scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, backdropColor: 'transparent' }, grid: { color: grid }, angleLines: { color: grid }, pointLabels: { font: { size: 14, weight: '700' } } } }
        }
      }));
    };

    render();
    Skeletons.doneAll();
    document.addEventListener('bu:childchange', render);
    document.addEventListener('bu:themechange', render);
    document.addEventListener('bu:dirchange', render);
  };

  /* ---- Sessions (calendar + list) ----------------------------------- */
  Pages.sessions = async () => {
    const view = { month: new Date().getMonth(), year: new Date().getFullYear(), all: false };
    const allSessions = () => {
      const kids = view.all ? ChildSwitcher.children : [ChildSwitcher.active()].filter(Boolean);
      return kids.flatMap((c) => sessionsFor(c)).sort((a, b) => a.date - b.date);
    };

    const renderCalendar = () => {
      const box = $('#calendar');
      const first = new Date(view.year, view.month, 1);
      const startOffset = first.getDay();
      const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
      const today = new Date();
      const sessions = allSessions();
      $('#cal-title').textContent = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const dows = [...Array(7)].map((_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(undefined, { weekday: 'short' }));
      let cells = dows.map((d) => `<div class="cal__dow" aria-hidden="true">${Util.esc(d)}</div>`).join('');
      for (let i = 0; i < startOffset; i += 1) cells += '<div class="cal__day is-muted" aria-hidden="true"></div>';
      for (let d = 1; d <= daysInMonth; d += 1) {
        const date = new Date(view.year, view.month, d);
        const todays = sessions.filter((s) => Util.sameDay(s.date, date));
        const events = EVENTS.filter((ev) => Util.sameDay(ev.date, date));
        const label = `${date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}: ${todays.length + events.length ? `${todays.length + events.length} item(s)` : 'no classes'}`;
        cells += `<div class="cal__day ${Util.sameDay(date, today) ? 'is-today' : ''}" role="gridcell" aria-label="${Util.esc(label)}">
          <span class="num">${d}</span>
          ${todays.map((s) => `<button type="button" class="cal__event ${s.child.level === 1 ? 'cal__event--l1' : ''}" data-session="${s.date.toISOString()}|${Util.esc(s.child.id)}" title="${Util.esc(`${s.child.first} · ${Util.fmtTime(s.date)}`)}">${Util.esc(Util.fmtTime(s.date))} ${Util.esc(s.child.first)}</button>`).join('')}
          ${events.map((ev) => `<span class="cal__event cal__event--comp" title="${Util.esc(ev.title)}">${Util.esc(ev.title)}</span>`).join('')}
        </div>`;
      }
      box.innerHTML = `<div class="cal__grid" role="grid" aria-labelledby="cal-title">${cells}</div>`;
    };

    const renderList = () => {
      const upcoming = allSessions().filter((s) => s.date >= new Date()).slice(0, 10);
      $('#session-list').innerHTML = upcoming.length ? `<ul class="list-unstyled m-0">${upcoming.map(sessionRow).join('')}</ul>`
        : emptyState({ icon: 'bi-calendar-x', title: 'No upcoming classes', text: 'When your child is enrolled, their class dates appear here.', action: '<a class="btn btn-cta" href="enroll.html">Enroll in a program</a>' });
      const sel = $('#reschedule-session');
      if (sel) sel.innerHTML = '<option value="">Choose a class</option>' + upcoming.map((s) => `<option value="${s.date.toISOString()}">${Util.esc(`${s.child.first} · ${Util.fmtDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${Util.fmtTime(s.date)}`)}</option>`).join('');
    };

    const render = () => { renderCalendar(); renderList(); };

    $('#cal-prev').addEventListener('click', () => { view.month -= 1; if (view.month < 0) { view.month = 11; view.year -= 1; } renderCalendar(); });
    $('#cal-next').addEventListener('click', () => { view.month += 1; if (view.month > 11) { view.month = 0; view.year += 1; } renderCalendar(); });
    $('#cal-today').addEventListener('click', () => { view.month = new Date().getMonth(); view.year = new Date().getFullYear(); renderCalendar(); });
    const allToggle = $('#show-all-children');
    if (allToggle) allToggle.addEventListener('change', () => { view.all = allToggle.checked; render(); });

    // Clicking a calendar class pre-selects it in the reschedule form
    document.addEventListener('click', (e) => {
      const ev = e.target.closest('[data-session]');
      if (ev) {
        const [iso] = ev.dataset.session.split('|');
        const sel = $('#reschedule-session');
        if (sel && sel.querySelector(`option[value="${CSS.escape(iso)}"]`)) sel.value = iso;
        const m = $('#rescheduleModal');
        if (m && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(m).show();
      }
      const join = e.target.closest('[data-join-class]');
      if (join) {
        e.preventDefault();
        // TODO: link to your Zoom / Google Meet room, e.g. join.href = session.meetingUrl
        const toast = $('#join-toast');
        if (toast && window.bootstrap) window.bootstrap.Toast.getOrCreateInstance(toast).show();
      }
    });

    render();
    Skeletons.doneAll();
    document.addEventListener('bu:childchange', render);
  };

  /* ---- Payments ------------------------------------------------------ */
  Pages.payments = async () => {
    let invoices = await Api.invoices();
    const kidName = (id) => { const c = ChildSwitcher.children.find((k) => k.id === id); return c ? c.first : 'Family'; };

    const render = () => {
      const due = invoices.filter((i) => i.status === 'due');
      const paid = invoices.filter((i) => i.status === 'paid');
      const total = due.reduce((s, i) => s + i.amount, 0);
      $('#due-total').textContent = total ? Util.money(total) : Util.money(0);
      $('#due-note').textContent = due.length ? `Due on ${Util.fmtDate(Util.dayOffset(due[0].dueIn))}` : 'Nothing due. Thank you!';
      $('#pay-now-btn').disabled = !due.length;
      $('#paid-total').textContent = Util.money(paid.reduce((s, i) => s + i.amount, 0));

      $('#invoice-rows').innerHTML = due.length ? due.map((i) => `
        <tr>
          <th scope="row">${Util.esc(i.id)}</th>
          <td>${Util.esc(i.item)}<span class="d-block small text-muted">${Util.esc(kidName(i.child))}</span></td>
          <td class="col-opt"><time datetime="${Util.dayOffset(i.dueIn).toISOString().slice(0, 10)}">${Util.esc(Util.fmtDate(Util.dayOffset(i.dueIn)))}</time></td>
          <td><strong>${Util.money(i.amount)}</strong></td>
          <td><span class="badge-soft badge-soft--amber"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Due</span></td>
        </tr>`).join('')
        : `<tr><td colspan="5">${emptyState({ icon: 'bi-check2-circle', title: 'No open invoices', text: 'You’re all paid up. New invoices appear here at the start of each month.' })}</td></tr>`;

      $('#history-rows').innerHTML = paid.length ? paid.map((i) => `
        <tr>
          <th scope="row">${Util.esc(i.id)}</th>
          <td>${Util.esc(i.item)}<span class="d-block small text-muted">${Util.esc(kidName(i.child))}</span></td>
          <td class="col-opt"><time datetime="${Util.monthsAgo(i.m, 3).toISOString().slice(0, 10)}">${Util.esc(Util.fmtDate(i.paidOn || Util.monthsAgo(i.m, 3)))}</time></td>
          <td>${Util.money(i.amount)}</td>
          <td><button type="button" class="btn btn-sm btn-outline-primary" data-receipt="${Util.esc(i.id)}" aria-label="Download receipt ${Util.esc(i.id)}"><i class="bi bi-download" aria-hidden="true"></i> <span class="d-none d-sm-inline">Receipt</span></button></td>
        </tr>`).join('')
        : `<tr><td colspan="5">${emptyState({ icon: 'bi-receipt', title: 'No payments yet', text: 'Your receipts will be saved here after your first payment.' })}</td></tr>`;

      $('#pay-amount').textContent = Util.money(total);
    };

    /** Create a simple printable HTML receipt and download it. */
    const downloadReceipt = (id) => {
      const i = invoices.find((x) => x.id === id);
      if (!i) return;
      const p = Api.parent();
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Receipt ${i.id}</title>
        <style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;color:#0f1b3d}h1{color:#1d4ed8}td{padding:8px 0;border-bottom:1px solid #dbe3f2}table{width:100%;border-collapse:collapse}</style></head>
        <body><h1>BeadUp Academy — Receipt</h1><p>Receipt for invoice <strong>${Util.esc(i.id)}</strong></p>
        <table><tr><td>Paid by</td><td>${Util.esc(p.name)}</td></tr><tr><td>Child</td><td>${Util.esc(kidName(i.child))}</td></tr>
        <tr><td>Item</td><td>${Util.esc(i.item)}</td></tr><tr><td>Amount</td><td>${Util.money(i.amount)}</td></tr>
        <tr><td>Date</td><td>${Util.esc(Util.fmtDate(i.paidOn || Util.monthsAgo(i.m, 3)))}</td></tr></table>
        <p>Thank you! Questions? hello@beadup.example · +1 (555) 012-3456</p></body></html>`;
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `BeadUp-receipt-${i.id}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    document.addEventListener('click', (e) => {
      const r = e.target.closest('[data-receipt]');
      if (r) downloadReceipt(r.dataset.receipt);
    });

    // Pay Now — demo. TODO: create a Stripe Checkout Session or PayPal order on your server.
    const payForm = $('#pay-form');
    payForm.addEventListener('bu:submitted', () => {
      invoices = invoices.map((i) => (i.status === 'due' ? { ...i, status: 'paid', paidOn: new Date().toISOString(), m: 0 } : i));
      Api.saveInvoices(invoices);
      render();
    });
    const payModal = $('#payModal');
    if (payModal) payModal.addEventListener('hidden.bs.modal', () => { $$('.form-status', payForm).forEach((s) => s.classList.remove('is-visible')); });

    render();
    Skeletons.doneAll();
  };

  /* ---- Certificates & competitions --------------------------------- */
  Pages.certificates = async () => {
    // Pass the chosen event name into the register modal
    const modal = $('#registerModal');
    if (modal) modal.addEventListener('show.bs.modal', (e) => {
      const trigger = e.relatedTarget;
      const name = trigger && trigger.dataset.eventName;
      if (name) {
        $('#registerModalLabel').textContent = `Register for ${name}`;
        $('#register-event').value = name;
      }
      const sel = $('#register-child');
      if (sel) sel.innerHTML = '<option value="">Choose a child</option>' + ChildSwitcher.children.map((c) => `<option value="${Util.esc(c.id)}">${Util.esc(c.first)} · Level ${c.level}</option>`).join('');
    });
    Skeletons.doneAll();
  };

  /* ---- Messages ------------------------------------------------------ */
  Pages.messages = async () => {
    let messages = await Api.messages();
    let filter = 'all';
    let openId = null;
    const listEl = $('#message-list');
    const reader = $('#message-reader');

    const icon = (m) => (m.type === 'payment' ? 'bi-credit-card' : m.type === 'event' ? 'bi-trophy' : 'bi-chat-heart');
    const when = (m) => (m.ago === 0 ? 'Today' : m.ago === 1 ? 'Yesterday' : `${m.ago} days ago`);

    const render = () => {
      const shown = messages.filter((m) => filter === 'all' || (filter === 'unread' && m.unread));
      listEl.innerHTML = shown.length ? `<ul class="msg-list">${shown.map((m) => `
        <li><button type="button" class="msg ${m.unread ? 'is-unread' : ''}" data-msg="${m.id}" aria-pressed="${m.id === openId}">
          <span class="icon-bead icon-bead--sm"><i class="bi ${icon(m)}" aria-hidden="true"></i></span>
          <span class="flex-grow-1"><span class="msg__title">${Util.esc(m.subject)}</span><span class="msg__from">${Util.esc(m.from)}</span></span>
          <time>${Util.esc(when(m))}</time>
        </button></li>`).join('')}</ul>`
        : emptyState({ icon: 'bi-inbox', title: filter === 'unread' ? 'You’re all caught up' : 'No messages yet', text: filter === 'unread' ? 'There are no unread messages. Nice work!' : 'Messages from teachers and the front desk will appear here.' });
      Badges.update(messages);
    };

    const open = (id) => {
      const m = messages.find((x) => x.id === id);
      if (!m) return;
      openId = id;
      m.unread = false;
      Api.saveMessages(messages);
      reader.innerHTML = `
        <article>
          <p class="small text-muted mb-1">${Util.esc(when(m))} · from ${Util.esc(m.from)}</p>
          <h2 class="h3">${Util.esc(m.subject)}</h2>
          <p>${Util.esc(m.body)}</p>
          <a class="btn btn-outline-primary btn-sm" href="#compose" data-reply="${Util.esc(m.from)}"><i class="bi bi-reply" aria-hidden="true"></i> Reply</a>
        </article>`;
      render();
      reader.focus();
    };

    listEl.addEventListener('click', (e) => { const b = e.target.closest('[data-msg]'); if (b) open(b.dataset.msg); });
    $$('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      $$('[data-filter]').forEach((b) => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      render();
    }));
    $('#mark-all-read').addEventListener('click', () => { messages = messages.map((m) => ({ ...m, unread: false })); Api.saveMessages(messages); render(); });
    document.addEventListener('click', (e) => {
      const r = e.target.closest('[data-reply]');
      if (r) { const to = $('#compose-to'); if (to) to.value = r.dataset.reply.startsWith('Ms.') || r.dataset.reply.startsWith('Mr.') ? 'teacher' : 'desk'; }
    });

    render();
    Skeletons.doneAll();
  };

  /* ---- Settings ------------------------------------------------------ */
  Pages.settings = async () => {
    const p = Api.parent();
    const f = $('#profile-form');
    if (f) { f.elements.fullName.value = p.name; f.elements.email.value = p.email; f.elements.phone.value = p.phone; }
    const reset = $('#reset-demo');
    if (reset) reset.addEventListener('click', () => {
      Store.reset();
      reset.textContent = 'Demo data reset — reloading…';
      setTimeout(() => window.location.reload(), 600);
    });
    const clear = $('#clear-children');
    if (clear) clear.addEventListener('click', () => {
      Api.saveChildren([]);
      clear.textContent = 'Done — open Overview to see empty states';
    });
    Skeletons.doneAll();
  };

  /* ------------------------------------------------------------------------
   * Boot
   * --------------------------------------------------------------------- */
  const boot = async () => {
    Skeletons.init();
    await ChildSwitcher.init();
    Badges.update();
    const page = document.body.dataset.page;
    if (Pages[page]) await Pages[page]();
    else Skeletons.doneAll();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
