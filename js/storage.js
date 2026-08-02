/* Shared attendance storage layer.
 *
 * Primary store: the app backend's /api/attendance endpoint (shared by all
 * browsers/teachers/MSL on the network). Configure the endpoint in
 * js/config.js — 'auto' uses the same-origin /api/attendance, or set a full
 * URL for a separately hosted backend. When no backend is reachable the app
 * falls back to browser localStorage (per device) and reports a "local-only"
 * status so the limitation is visible instead of silent.
 *
 * Any change dispatches 'lkc:attendance-changed'; server reachability
 * changes dispatch 'lkc:storage-status'. A 'storage' event listener keeps
 * tabs in the same browser in sync.
 */
(function () {
  var LS_KEY = 'lkcAttendance';
  var config = window.LKC_CONFIG || {};
  var API = config.attendanceApi && config.attendanceApi !== 'auto'
    ? config.attendanceApi
    : 'api/attendance';
  var serverOk = null; /* null = unknown, true/false = reachable */
  var cache = null;

  function readLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function get() {
    if (cache === null) cache = readLocal();
    return cache;
  }

  function notifyChanged() {
    try { document.dispatchEvent(new CustomEvent('lkc:attendance-changed')); } catch (e) {}
  }

  function notifyStatus() {
    try {
      document.dispatchEvent(new CustomEvent('lkc:storage-status', { detail: { serverOk: serverOk } }));
    } catch (e) {}
  }

  function setServerOk(v) {
    if (serverOk !== v) { serverOk = v; notifyStatus(); }
  }

  /* Replace the store (from server sync) and notify listeners only when it changed. */
  function importStore(store) {
    if (JSON.stringify(store) === JSON.stringify(get())) return false;
    cache = store;
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) {}
    notifyChanged();
    return true;
  }

  function pushToServer(store) {
    if (typeof fetch !== 'function') { setServerOk(false); return; }
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: store })
    })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function () { setServerOk(true); })
      .catch(function () { setServerOk(false); });
  }

  /* Save locally + sync to the server (fire-and-forget). Returns false only
     if the local write itself fails (storage full). */
  function put(store) {
    cache = store;
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { return false; }
    notifyChanged();
    pushToServer(store);
    return true;
  }

  /* Pull the latest store from the server. */
  function refresh() {
    if (typeof fetch !== 'function') { setServerOk(false); return; }
    fetch(API, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        setServerOk(true);
        if (data && data.records && typeof data.records === 'object') importStore(data.records);
      })
      .catch(function () { setServerOk(false); });
  }

  /* Same-browser cross-tab sync (localStorage writes from other tabs). */
  window.addEventListener('storage', function (e) {
    if (e.key === LS_KEY && e.newValue) {
      try { importStore(JSON.parse(e.newValue)); } catch (err) {}
    }
  });

  get();
  refresh();

  window.LKCStorage = {
    get: get,
    put: put,
    refresh: refresh,
    importStore: importStore,
    isServerUp: function () { return serverOk; },
    api: API
  };
})();
