#!/usr/bin/env node
/**
 * LKC College | Admissions 2026-27 — local app server
 *
 * Serves the static site AND shares attendance storage across all
 * browsers/teachers/MSL on the network. Attendance is persisted to
 * data/attendance-store.json so every save is visible everywhere.
 *
 * Usage:  node server.js            (default port 3000)
 *         PORT=8080 node server.js
 *
 * Open http://localhost:3000  in each browser. If the server is not
 * running, the app still works using browser localStorage as a fallback.
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = process.env.PORT || 3000;
var ROOT = path.resolve(__dirname);
var DATA_FILE = path.join(ROOT, 'data', 'attendance-store.json');

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return {}; }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

/* Merge incoming (partial client store) into base so concurrent saves
   from different teachers never overwrite each other. */
function deepMerge(base, incoming) {
  Object.keys(incoming || {}).forEach(function (k) {
    var v = incoming[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!base[k] || typeof base[k] !== 'object' || Array.isArray(base[k])) base[k] = {};
      deepMerge(base[k], v);
    } else {
      base[k] = v;
    }
  });
  return base;
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

var server = http.createServer(function (req, res) {
  var pathname = decodeURIComponent((req.url || '/').split('?')[0]);

  if (pathname === '/api/attendance' && req.method === 'GET') {
    sendJson(res, 200, { records: readStore() });
    return;
  }

  if (pathname === '/api/attendance' && req.method === 'POST') {
    var body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () {
      try {
        var data = JSON.parse(body || '{}');
        var store = deepMerge(readStore(), data.records || {});
        writeStore(store);
        sendJson(res, 200, { ok: true, records: store });
      } catch (e) {
        sendJson(res, 400, { error: 'invalid json' });
      }
    });
    return;
  }

  /* static files */
  var rel = pathname === '/' ? '/index.html' : pathname;
  var file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, function (err, buf) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

server.listen(PORT, function () {
  console.log('LKC College app: http://localhost:' + PORT);
  console.log('Attendance store: ' + DATA_FILE);
});
