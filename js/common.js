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

  getMain: function () { return document.getElementById('main-content'); }
};