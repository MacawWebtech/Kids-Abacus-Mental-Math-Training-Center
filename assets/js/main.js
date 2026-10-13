/**
 * ==========================================================================
 * BeadUp Academy — main.js
 * Shared behaviour for every page (public site + parent dashboard).
 * Vanilla ES6+, no dependencies besides Bootstrap's bundle (for tooltips,
 * collapse, carousel, modals). Each feature is a small module with init().
 *
 * MODULES
 *   Prefs        – read/write saved preferences in localStorage
 *   Theme        – dark / light toggle with system-preference detection
 *   Direction    – LTR / RTL toggle (swaps Bootstrap RTL stylesheet)
 *   Header       – sticky header shadow on scroll
 *   Tooltips     – Bootstrap tooltip init
 *   Forms        – friendly client-side validation + submit handling
 *   Passwords    – show/hide toggle, strength meter
 *   Counters     – animated numbers in the trust row
 *   Reveal       – fade-in on scroll (skipped with reduced motion)
 *   Countdown    – coming-soon countdown
 *   Billing      – monthly / per-term price switch on Pricing
 *   Misc         – current year, URL notices
 * ==========================================================================
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ------------------------------------------------------------------------
   * Prefs — tiny wrapper so storage errors (private mode) never break the page
   * --------------------------------------------------------------------- */
  const Prefs = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
    },
    remove(key) {
      try { window.localStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
    }
  };

  /* ------------------------------------------------------------------------
   * Theme — the inline <head> script applies the theme before first paint;
   * this module wires up the toggle buttons and follows OS changes until the
   * visitor picks a theme themselves.
   * --------------------------------------------------------------------- */
  const Theme = {
    key: 'bu-theme',
    media: window.matchMedia('(prefers-color-scheme: dark)'),

    current() { return root.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light'; },

    apply(theme, save = false) {
      root.setAttribute('data-bs-theme', theme);
      if (save) Prefs.set(this.key, theme);
      this.syncButtons();
      document.dispatchEvent(new CustomEvent('bu:themechange', { detail: { theme } }));
    },

    syncButtons() {
      const dark = this.current() === 'dark';
      $$('[data-theme-toggle]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(dark));
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
        const icon = $('.bi', btn);
        if (icon) icon.className = dark ? 'bi bi-sun' : 'bi bi-moon-stars';
      });
      $$('[data-theme-select]').forEach((sel) => { sel.value = Prefs.get(this.key) || 'system'; });
    },

    init() {
      $$('[data-theme-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => this.apply(this.current() === 'dark' ? 'light' : 'dark', true));
      });
      // Settings page: <select data-theme-select> with light / dark / system
      $$('[data-theme-select]').forEach((sel) => {
        sel.addEventListener('change', () => {
          if (sel.value === 'system') {
            Prefs.remove(this.key);
            this.apply(this.media.matches ? 'dark' : 'light');
          } else {
            this.apply(sel.value, true);
          }
        });
      });
      // Follow the OS only while no explicit choice has been saved
      this.media.addEventListener('change', (e) => {
        if (!Prefs.get(this.key)) this.apply(e.matches ? 'dark' : 'light');
      });
      this.syncButtons();
    }
  };

  /* ------------------------------------------------------------------------
   * Direction — switches between LTR and RTL.
   * The Bootstrap <link id="bootstrap-css"> carries data-ltr / data-rtl URLs.
   * --------------------------------------------------------------------- */
  const Direction = {
    key: 'bu-dir',

    current() { return root.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr'; },

    apply(dir) {
      root.setAttribute('dir', dir);
      const link = document.getElementById('bootstrap-css');
      if (link && link.dataset[dir]) link.href = link.dataset[dir];
      Prefs.set(this.key, dir);
      this.syncButtons();
      document.dispatchEvent(new CustomEvent('bu:dirchange', { detail: { dir } }));
    },

    syncButtons() {
      const rtl = this.current() === 'rtl';
      $$('[data-dir-toggle]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(rtl));
        btn.setAttribute('aria-label', rtl ? 'Switch to left-to-right layout' : 'Switch to right-to-left layout (Arabic, Hebrew)');
        btn.setAttribute('title', rtl ? 'Left-to-right' : 'Right-to-left');
      });
      $$('[data-dir-select]').forEach((sel) => { sel.value = this.current(); });
    },

    init() {
      $$('[data-dir-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => this.apply(this.current() === 'rtl' ? 'ltr' : 'rtl'));
      });
      $$('[data-dir-select]').forEach((sel) => sel.addEventListener('change', () => this.apply(sel.value)));
      this.syncButtons();
    }
  };

  /* ------------------------------------------------------------------------
   * Header — adds .is-scrolled once the page moves, for a subtle shadow
   * --------------------------------------------------------------------- */
  const Header = {
    init() {
      const header = $('.site-header');
      if (!header) return;
      const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
      update();
      window.addEventListener('scroll', update, { passive: true });
    }
  };

  /* ------------------------------------------------------------------------
   * Tooltips — Bootstrap tooltips for [data-bs-toggle="tooltip"]
   * --------------------------------------------------------------------- */
  const Tooltips = {
    init() {
      if (!window.bootstrap || !window.bootstrap.Tooltip) return;
      $$('[data-bs-toggle="tooltip"]').forEach((el) => new window.bootstrap.Tooltip(el));
    }
  };

  /* ------------------------------------------------------------------------
   * Forms — friendly validation
   * Markup contract:
   *   <form class="needs-validation" novalidate data-form="contact">
   *     <input id="x" required data-msg-required="…" data-msg-type="…"
   *            aria-describedby="x-error">
   *     <div class="invalid-feedback" id="x-error"></div>
   *   </form>
   * Submission:
   *   - action contains "YOUR_" (placeholder) → demo mode: shows success.
   *   - real action (Formspree / Netlify / Mailchimp) → sent with fetch.
   *   - data-success-redirect="url" → navigates after success (login demo).
   * --------------------------------------------------------------------- */
  const Forms = {
    defaults: {
      required: 'Please fill in this field.',
      email: 'Please enter an email like name@example.com.',
      tel: 'Please enter a phone number with digits only, e.g. 555 012 3456.',
      pattern: 'That doesn’t look quite right. Please check the format.',
      min: 'That number is too small.',
      max: 'That number is too big.',
      minlength: 'This is a little short. Please add a few more characters.',
      checkbox: 'Please tick this box to continue.',
      select: 'Please choose an option.',
      radio: 'Please choose one of the options.',
      match: 'These don’t match yet. Please type the same value again.'
    },

    /** Return the friendliest message for a field's current validity state. */
    messageFor(field) {
      const v = field.validity;
      const d = field.dataset;
      if (v.valueMissing) {
        if (field.type === 'checkbox') return d.msgRequired || this.defaults.checkbox;
        if (field.type === 'radio') return d.msgRequired || this.defaults.radio;
        if (field.tagName === 'SELECT') return d.msgRequired || this.defaults.select;
        return d.msgRequired || this.defaults.required;
      }
      if (v.typeMismatch) return d.msgType || this.defaults[field.type] || this.defaults.pattern;
      if (v.patternMismatch) return d.msgPattern || (field.type === 'tel' ? this.defaults.tel : this.defaults.pattern);
      if (v.tooShort) return d.msgMinlength || this.defaults.minlength;
      if (v.rangeUnderflow) return d.msgMin || this.defaults.min;
      if (v.rangeOverflow) return d.msgMax || this.defaults.max;
      if (v.customError) return field.validationMessage;
      return '';
    },

    /** Check "confirm password"-style fields: data-match="#otherFieldId" */
    checkMatch(field) {
      if (!field.dataset.match) return;
      const other = $(field.dataset.match);
      field.setCustomValidity(other && field.value && other.value !== field.value
        ? (field.dataset.msgMatch || this.defaults.match) : '');
    },

    /** Update one field's error text + ARIA state. */
    validateField(field) {
      this.checkMatch(field);
      const ok = field.checkValidity();
      const feedbackId = (field.getAttribute('aria-describedby') || '').split(' ').find((id) => id.endsWith('-error'));
      const feedback = feedbackId ? document.getElementById(feedbackId) : null;
      if (feedback) feedback.textContent = ok ? '' : this.messageFor(field);
      field.setAttribute('aria-invalid', String(!ok));
      return ok;
    },

    setLoading(form, loading) {
      const btn = $('[type="submit"]', form);
      if (!btn) return;
      btn.classList.toggle('is-loading', loading);
      btn.disabled = loading;
      btn.setAttribute('aria-busy', String(loading));
    },

    showStatus(form, type) {
      $$('.form-status', form).forEach((el) => el.classList.remove('is-visible'));
      const status = $(`.form-status[data-status="${type}"]`, form);
      if (status) {
        status.classList.add('is-visible');
        status.focus({ preventScroll: false });
      }
    },

    async submit(form) {
      const action = form.getAttribute('action') || '';
      const isDemo = !action || action.includes('YOUR_') || form.dataset.demo === 'true';
      this.setLoading(form, true);
      try {
        if (isDemo) {
          // TODO: Replace the form action with your Formspree / Netlify / Mailchimp URL.
          await new Promise((resolve) => setTimeout(resolve, 900));
        } else {
          const res = await fetch(action, {
            method: form.method || 'POST',
            body: new FormData(form),
            headers: { Accept: 'application/json' }
          });
          if (!res.ok) throw new Error('Request failed');
        }
        this.showStatus(form, 'success');
        if (form.dataset.successRedirect) {
          window.setTimeout(() => { window.location.href = form.dataset.successRedirect; }, 700);
          return;
        }
        form.reset();
        form.classList.remove('was-validated');
        $$('[aria-invalid]', form).forEach((f) => f.removeAttribute('aria-invalid'));
        $$('[data-strength]', form).forEach((m) => m.setAttribute('data-score', '0'));
        form.dispatchEvent(new CustomEvent('bu:submitted', { bubbles: true }));
      } catch (err) {
        this.showStatus(form, 'error');
      } finally {
        this.setLoading(form, false);
      }
    },

    init() {
      $$('form.needs-validation').forEach((form) => {
        form.setAttribute('novalidate', '');
        const fields = $$('input, select, textarea', form).filter((f) => f.type !== 'hidden' && f.type !== 'submit');

        form.addEventListener('submit', (event) => {
          event.preventDefault();
          let firstInvalid = null;
          fields.forEach((field) => {
            if (!this.validateField(field) && !firstInvalid) firstInvalid = field;
          });
          form.classList.add('was-validated');
          if (firstInvalid) {
            this.showStatus(form, 'invalid');
            firstInvalid.focus();
            return;
          }
          if (form.dataset.noSubmit === 'true') {
            form.dispatchEvent(new CustomEvent('bu:valid', { bubbles: true }));
            return;
          }
          this.submit(form);
        });

        // Re-validate as the parent types, but only after a first attempt
        fields.forEach((field) => {
          const evt = field.tagName === 'SELECT' || field.type === 'checkbox' || field.type === 'radio' ? 'change' : 'input';
          field.addEventListener(evt, () => {
            if (form.classList.contains('was-validated')) this.validateField(field);
            if (field.dataset.matchedBy) {
              const twin = $(field.dataset.matchedBy);
              if (twin && form.classList.contains('was-validated')) this.validateField(twin);
            }
          });
        });
      });
    }
  };

  /* ------------------------------------------------------------------------
   * Passwords — show / hide and a simple 4-step strength meter
   * --------------------------------------------------------------------- */
  const Passwords = {
    score(value) {
      let s = 0;
      if (value.length >= 8) s += 1;
      if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s += 1;
      if (/\d/.test(value)) s += 1;
      if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) s += 1;
      return value ? Math.max(1, s) : 0;
    },
    labels: ['', 'Too easy to guess', 'Getting there', 'Good password', 'Strong password'],

    init() {
      $$('[data-password-toggle]').forEach((btn) => {
        const input = document.getElementById(btn.getAttribute('aria-controls'));
        if (!input) return;
        btn.addEventListener('click', () => {
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          btn.setAttribute('aria-pressed', String(show));
          btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
          const icon = $('.bi', btn);
          if (icon) icon.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
        });
      });
      $$('[data-strength]').forEach((meter) => {
        const input = document.getElementById(meter.dataset.strength);
        const label = document.getElementById(`${meter.dataset.strength}-strength-label`);
        if (!input) return;
        input.addEventListener('input', () => {
          const s = this.score(input.value);
          meter.setAttribute('data-score', String(s));
          if (label) label.textContent = this.labels[s];
        });
      });
    }
  };

  /* ------------------------------------------------------------------------
   * Counters — <strong data-count-to="4800" data-suffix="+">4,800+</strong>
   * The final value is already in the HTML (good for SEO / no-JS).
   * --------------------------------------------------------------------- */
  const Counters = {
    format(n) { return Math.round(n).toLocaleString(); },
    run(el) {
      const target = Number(el.dataset.countTo);
      const suffix = el.dataset.suffix || '';
      const duration = 1200;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = this.format(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    init() {
      const els = $$('[data-count-to]');
      if (!els.length || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { this.run(entry.target); io.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      els.forEach((el) => io.observe(el));
    }
  };

  /* ------------------------------------------------------------------------
   * Reveal — adds .is-visible to .reveal elements as they enter the viewport
   * --------------------------------------------------------------------- */
  const Reveal = {
    init() {
      const els = $$('.reveal');
      if (!els.length) return;
      if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
        els.forEach((el) => el.classList.add('is-visible'));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      els.forEach((el) => io.observe(el));
    }
  };

  /* ------------------------------------------------------------------------
   * Countdown — <ul data-countdown="2027-01-10T09:00:00"> with [data-unit]
   * --------------------------------------------------------------------- */
  const Countdown = {
    init() {
      const box = $('[data-countdown]');
      if (!box) return;
      const target = new Date(box.dataset.countdown).getTime();
      const units = { days: 86400000, hours: 3600000, minutes: 60000, seconds: 1000 };
      const render = () => {
        let diff = Math.max(0, target - Date.now());
        Object.entries(units).forEach(([unit, ms]) => {
          const el = $(`[data-unit="${unit}"]`, box);
          const val = Math.floor(diff / ms);
          diff -= val * ms;
          if (el) el.textContent = String(val).padStart(2, '0');
        });
      };
      render();
      window.setInterval(render, 1000);
    }
  };

  /* ------------------------------------------------------------------------
   * Billing — pricing page monthly / per-term switch
   * Buttons: [data-billing="monthly|term"]; prices: [data-monthly][data-term]
   * --------------------------------------------------------------------- */
  const Billing = {
    init() {
      const buttons = $$('[data-billing]');
      if (!buttons.length) return;
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.billing;
          buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
          $$('[data-monthly]').forEach((el) => { el.textContent = el.dataset[mode]; });
          $$('[data-period]').forEach((el) => { el.textContent = el.dataset[`period${mode === 'term' ? 'Term' : 'Monthly'}`]; });
        });
      });
    }
  };

  /* ------------------------------------------------------------------------
   * Misc — footer year, URL-driven notices (e.g. ?loggedout=1)
   * --------------------------------------------------------------------- */
  const Misc = {
    init() {
      $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
      const params = new URLSearchParams(window.location.search);
      $$('[data-show-if-param]').forEach((el) => {
        if (params.has(el.dataset.showIfParam)) el.hidden = false;
      });
      // Prefill a select from ?level=3 (Programs → Contact trial form)
      $$('[data-prefill-param]').forEach((el) => {
        const val = params.get(el.dataset.prefillParam);
        if (val && el.querySelector(`option[value="${CSS.escape(val)}"]`)) el.value = val;
      });
      // Open a tab from #hash (e.g. contact.html#trial)
      if (window.location.hash && window.bootstrap && window.bootstrap.Tab) {
        const trigger = $(`[data-bs-toggle="pill"][data-bs-target="${CSS.escape(window.location.hash)}-pane"]`);
        if (trigger) window.bootstrap.Tab.getOrCreateInstance(trigger).show();
      }
    }
  };

  /* ------------------------------------------------------------------------
   * Boot
   * --------------------------------------------------------------------- */
  const boot = () => {
    root.classList.remove('no-js');
    [Theme, Direction, Header, Tooltips, Forms, Passwords, Counters, Reveal, Countdown, Billing, Misc]
      .forEach((mod) => mod.init());
  };

  // Expose a small API for dashboard.js and custom code
  window.BeadUp = { Prefs, Theme, Direction, Forms };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
