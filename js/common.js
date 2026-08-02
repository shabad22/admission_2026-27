/* Shared helpers used by app.js, attendance.js and reports.js. */
window.LKCUtil = {
  pad: function (n) { return n < 10 ? '0' + n : String(n); },
  toStr: function (d) {
    return d.getFullYear() + '-' + window.LKCUtil.pad(d.getMonth() + 1) + '-' + window.LKCUtil.pad(d.getDate());
  },
  todayStr: function () { return window.LKCUtil.toStr(new Date()); },
  esc: function (str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
  getMain: function () { return document.getElementById('main-content'); }
};
