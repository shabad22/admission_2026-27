var API = (function () {
  var cache = {};

  function fetchJSON(url) {
    if (cache[url]) {
      return Promise.resolve(cache[url]);
    }
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
        return r.json();
      })
      .then(function (data) {
        cache[url] = data;
        return data;
      });
  }

  function loadViaScript(url) {
    if (cache[url]) {
      return Promise.resolve(cache[url]);
    }
    var jsUrl = url.replace(/\.json$/, ".js");
    var key = url.indexOf("students") !== -1 ? "students" : "dashboard";
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error("Script load timeout: " + jsUrl));
      }, 10000);
      var checkData = function () {
        if (window.__DATA__ && window.__DATA__[key] !== undefined) {
          clearTimeout(timer);
          var data = window.__DATA__[key];
          cache[url] = data;
          resolve(data);
        } else {
          setTimeout(checkData, 50);
        }
      };
      var s = document.createElement("script");
      s.src = jsUrl;
      s.onerror = function () {
        clearTimeout(timer);
        reject(new Error("Failed to load: " + jsUrl));
      };
      document.head.appendChild(s);
      checkData();
    });
  }

  function getCached(url) {
    return cache[url] || null;
  }

  function loadAll() {
    function doFetch() {
      return Promise.all([
        fetchJSON("data/students.json"),
        fetchJSON("data/dashboard.json"),
      ]).then(function (results) {
        return { students: results[0], dashboard: results[1] };
      });
    }
    function doScript() {
      return Promise.all([
        loadViaScript("data/students.json"),
        loadViaScript("data/dashboard.json"),
      ]).then(function (results) {
        return { students: results[0], dashboard: results[1] };
      });
    }
    return doFetch().catch(doScript);
  }

  return {
    fetchJSON: fetchJSON,
    getCached: getCached,
    loadAll: loadAll,
  };
})();
