/* Shared helpers used by app.js, attendance.js and reports.js. */
window.LKCUtil = {
  pad: function (n) { return n < 10 ? '0' + n : String(n); },

  toStr: function (d) {
    return d.getFullYear() + '-' + window.LKCUtil.pad(d.getMonth() + 1) + '-' + window.LKCUtil.pad(d.getDate());
  },

  todayStr: function () { return window.LKCUtil.toStr(new Date()); },

  /* Indian date format: DD/MM/YYYY */
  toIndianStr: function (d) {
    return window.LKCUtil.pad(d.getDate()) + '/' + window.LKCUtil.pad(d.getMonth() + 1) + '/' + d.getFullYear();
  },

  todayIndianStr: function () { return window.LKCUtil.toIndianStr(new Date()); },

  /* Parse YYYY-MM-DD to Indian format */
  toIndianFromISO: function (iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  },

  /* Parse DD/MM/YYYY to YYYY-MM-DD (for storage) */
  toISOFromIndian: function (indian) {
    if (!indian) return '';
    var parts = indian.split('/');
    if (parts.length !== 3) return indian;
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  },

  /* For <input type="date"> - always YYYY-MM-DD */
  toInputDate: function (d) {
    if (d instanceof Date) return window.LKCUtil.toStr(d);
    if (typeof d === 'string') return d; // assume already ISO
    return window.LKCUtil.toStr(new Date());
  },

  /* For display - DD/MM/YYYY */
  toDisplayDate: function (d) {
    if (d instanceof Date) return window.LKCUtil.toIndianStr(d);
    if (typeof d === 'string' && d.includes('-')) return window.LKCUtil.toIndianFromISO(d);
    if (typeof d === 'string' && d.includes('/')) return d;
    return String(d);
  },

  esc: function (str) {
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  },

  getMain: function () { return document.getElementById('main-content'); },

  /* ── Theme Management ── */
  THEME_KEY: 'lkc-theme',
  THEMES: ['light', 'dark', 'system'],

  getTheme: function () {
    try {
      return localStorage.getItem(window.LKCUtil.THEME_KEY) || 'system';
    } catch (e) { return 'system'; }
  },

  setTheme: function (theme) {
    if (!window.LKCUtil.THEMES.includes(theme)) theme = 'system';
    try { localStorage.setItem(window.LKCUtil.THEME_KEY, theme); } catch (e) {}
    window.LKCUtil.applyTheme(theme);
  },

  applyTheme: function (theme) {
    var root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    if (theme === 'system') {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('theme-dark');
    } else if (theme === 'dark') {
      root.classList.add('theme-dark');
    } else {
      root.classList.add('theme-light');
    }
    window.LKCUtil.updateThemeIcons(theme);
  },

  updateThemeIcons: function (theme) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.setAttribute('data-theme', theme);
    var title = theme === 'system' ? 'System preference' : theme.charAt(0).toUpperCase() + theme.slice(1);
    btn.title = 'Current: ' + title + ' (click to change)';
  },

  initTheme: function () {
    var theme = window.LKCUtil.getTheme();
    window.LKCUtil.applyTheme(theme);
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var current = window.LKCUtil.getTheme();
        var idx = window.LKCUtil.THEMES.indexOf(current);
        var next = window.LKCUtil.THEMES[(idx + 1) % window.LKCUtil.THEMES.length];
        window.LKCUtil.setTheme(next);
      });
    }
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (window.LKCUtil.getTheme() === 'system') window.LKCUtil.applyTheme('system');
    });
  }
};