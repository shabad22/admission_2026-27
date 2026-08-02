/* Shared attendance storage layer.
 *
 * Primary store: the app server's /api/attendance endpoint (shared by all
 * browsers/teachers/MSL on the network, persisted to data/attendance-store.json).
 * Fallback: browser localStorage when no server is reachable (e.g. file://).
 *
 * Any change dispatches a 'lkc:attendance-changed' CustomEvent so open
 * reports re-render immediately; a 'storage' event listener keeps tabs in
 * the same browser in sync.
 */
(function () {
  var LS_KEY = 'lkcAttendance';
  var API = 'api/attendance';
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

  function notify() {
    try {
      document.dispatchEvent(new CustomEvent('lkc:attendance-changed'));
    } catch (e) {}
  }

  function setLocal(store) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) {}
  }

  /* Replace the store (from server sync) and notify listeners only when it changed. */
  function importStore(store) {
    if (JSON.stringify(store) === JSON.stringify(get())) return false;
    cache = store;
    setLocal(store);
    notify();
    return true;
  }

  /* Save a store locally + sync to the server (fire-and-forget). Returns false
     only if the local write fails (storage full). */
  function put(store) {
    cache = store;
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { return false; }
    notify();
    if (typeof fetch === 'function') {
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: store })
      }).catch(function () {});
    }
    return true;
  }

  /* Pull the latest store from the server. */
  function refresh() {
    if (typeof fetch !== 'function') return;
    fetch(API, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (data && data.records && typeof data.records === 'object') importStore(data.records);
      })
      .catch(function () {});
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
    api: API
  };
})();
