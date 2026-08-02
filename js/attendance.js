(function () {
  var students = [];
  var teachers = [];
  var session = null;
  var state = { dept: null, course: null, date: null, slot: 'general', statuses: {} };

  var searchContainer, backBtn, dashBtn, reportsBtn, userBtn;
  var adminMode = false;

  var LS_SESSION = 'lkcTeacherSession';

  var pad = window.LKCUtil.pad;
  var todayStr = window.LKCUtil.todayStr;
  var esc = window.LKCUtil.esc;
  var getMain = window.LKCUtil.getMain;

  /* ══════ INIT ══════ */
  function init() {
    students = (window.__DATA__ && window.__DATA__.students) || [];
    teachers = (window.__TEACHERS__ && window.__TEACHERS__.teachers) || [];
    searchContainer = document.querySelector('.search-container');
    backBtn = document.getElementById('back-btn');
    dashBtn = document.getElementById('dash-btn');
    reportsBtn = document.getElementById('reports-btn');
    userBtn = document.getElementById('user-btn');

    if (dashBtn) dashBtn.addEventListener('click', onDashClick);
    if (userBtn) userBtn.addEventListener('click', onUserClick);

    session = loadSession();
    if (session) enterTeacherMode();
    else showLoginGate();

    window.LKC = {
      enterAdminMode: enterAdminMode,
      enterTeacherMode: enterTeacherMode,
      showLoginGate: showLoginGate
    };
  }

  /* ══════ SESSION ══════ */
  function loadSession() {
    try {
      var raw = localStorage.getItem(LS_SESSION);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return findBySession(s);
    } catch (e) { return null; }
  }

  function findBySession(s) {
    if (!s || !s.name) return null;
    for (var i = 0; i < teachers.length; i++) {
      if (teachers[i].name === s.name && teachers[i].id === s.id) return teachers[i];
    }
    return null;
  }

  function findTeacher(id, password) {
    for (var i = 0; i < teachers.length; i++) {
      if (teachers[i].id === id && teachers[i].password === password) return teachers[i];
    }
    return null;
  }

  function onDashClick() {
    if (!session || session.id !== 'MSL') return;
    if (adminMode) enterTeacherMode();
    else enterAdminMode();
  }

  function onUserClick() {
    if (!session) return;
    if (window.confirm('Log out ' + session.name + '?')) {
      try { localStorage.removeItem(LS_SESSION); } catch (e) {}
      session = null;
      adminMode = false;
      showLoginGate();
    }
  }

  function updateTopBar() {
    var isMsl = session && session.id === 'MSL';
    if (dashBtn) {
      dashBtn.hidden = !isMsl;
      dashBtn.textContent = adminMode ? 'My Classes' : 'Dashboard';
    }
    if (reportsBtn) reportsBtn.hidden = !isMsl;
    if (userBtn) {
      userBtn.hidden = !session;
      if (session) {
        userBtn.textContent = session.name.split(' ')[0];
        userBtn.title = session.name + ' \u2014 click to log out';
      }
    }
  }

  /* ══════ LOGIN GATE ══════ */
  function showLoginGate() {
    adminMode = false;
    if (searchContainer) searchContainer.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    updateTopBar();
    state.dept = null; state.course = null; state.date = null; state.slot = 'general'; state.statuses = {};
    renderLoginGate();
    var main = getMain();
    if (main) main.scrollTop = 0;
  }

  function renderLoginGate() {
    var main = getMain();
    if (!main) return;
    main.innerHTML =
      '<div class="login-gate">' +
        '<div class="login-gate-card">' +
          '<div class="modal-logo"><img src="LKC-Logo.png" alt="LKC College" /></div>' +
          '<h3 class="modal-title">Teacher Login</h3>' +
          '<p class="modal-sub">LKC College &middot; Admissions 2026-27</p>' +
          '<form id="login-form" novalidate>' +
            '<label class="field-label" for="login-id">Teacher ID</label>' +
            '<input class="field-input" id="login-id" type="text" autocomplete="username" placeholder="e.g. MSL" />' +
            '<label class="field-label" for="login-password">Password</label>' +
            '<input class="field-input" id="login-password" type="password" autocomplete="current-password" placeholder="Password" />' +
            '<div class="login-error" id="login-error"></div>' +
            '<button type="submit" class="btn-primary btn-block">Login</button>' +
          '</form>' +
        '</div>' +
      '</div>';

    main.querySelector('#login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var id = main.querySelector('#login-id').value.trim();
      var pw = main.querySelector('#login-password').value;
      var err = main.querySelector('#login-error');
      var t = findTeacher(id, pw);
      if (!t) {
        err.textContent = 'Invalid Teacher ID or password.';
        return;
      }
      try { localStorage.setItem(LS_SESSION, JSON.stringify({ name: t.name, id: t.id })); } catch (e2) {}
      session = t;
      enterTeacherMode();
    });
    var fi = main.querySelector('#login-id');
    if (fi) fi.focus();
  }

  /* ══════ TEACHER MODE / ADMIN MODE ══════ */
  function enterTeacherMode() {
    adminMode = false;
    if (searchContainer) searchContainer.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    updateTopBar();
    state.dept = null; state.course = null; state.date = null; state.slot = 'general'; state.statuses = {};
    render();
    var main = getMain();
    if (main) main.scrollTop = 0;
  }

  function enterAdminMode() {
    adminMode = true;
    if (searchContainer) searchContainer.style.display = '';
    if (backBtn) backBtn.style.display = '';
    updateTopBar();
    if (window.LKCAdmin && window.LKCAdmin.showDashboard) window.LKCAdmin.showDashboard();
  }

  function render() {
    var main = getMain();
    if (!main) return;
    if (state.dept && state.course) renderAttendanceSheet(main);
    else renderClassList(main);
  }

  /* ══════ CLASS LIST ══════ */
  function renderClassList(main) {
    var classes = (session.classes || []).map(function (c) {
      var list = students.filter(function (s) { return s.dept === c.dept && s.course === c.course; });
      return { dept: c.dept, course: c.course, count: list.length, last: getLastSavedDate(c.dept, c.course) };
    });

    main.innerHTML =
      '<h2 class="dashboard-title">Welcome, ' + esc(session.name) + '</h2>' +
      '<p class="dashboard-subtitle">Select a class to mark attendance</p>' +
      '<div class="section-title">My Classes (' + classes.length + ')</div>' +
      '<div class="course-grid">' +
      classes.map(function (c) {
        return '<div class="course-card att-class-card" data-dept="' + esc(c.dept) + '" data-course="' + esc(c.course) + '">' +
          '<div class="course-name">' + esc(c.course) + '</div>' +
          '<div class="att-class-meta">' +
            '<span class="att-dept">' + esc(c.dept) + '</span>' +
            '<span class="course-count"><strong>' + c.count + '</strong> students</span>' +
          '</div>' +
          (c.last ? '<div class="att-last">Last saved: ' + esc(c.last) + '</div>' : '') +
        '</div>';
      }).join('') +
      '</div>';

    main.querySelectorAll('.att-class-card').forEach(function (el) {
      el.addEventListener('click', function () {
        state.dept = el.getAttribute('data-dept');
        state.course = el.getAttribute('data-course');
        state.date = todayStr();
        state.slot = defaultSlot(state.dept, state.course);
        state.statuses = {};
        render();
      });
    });
  }

  /* ══════ ATTENDANCE SHEET ══════ */
  function getAttendanceStore() {
    return window.LKCStorage.get();
  }

  function getClassKey(dept, course) { return dept + '|' + course; }

  /* timetable slot info for a teacher's class */
  function getSlotInfo(dept, course, teacherName) {
    var lookup = (window.__TIMETABLE__ && window.__TIMETABLE__.slotLookup) || {};
    var byClass = lookup[getClassKey(dept, course)] || {};
    return byClass[teacherName] || [];
  }

  function slotTime(slotKey) {
    var i = slotKey.indexOf('_');
    return i !== -1 ? slotKey.slice(i + 1) : '';
  }

  function slotSubject(slotKey, dept, course) {
    var slots = getSlotInfo(dept, course, session ? session.name : '');
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].slot === slotKey) return slots[i].subject;
    }
    return '';
  }

  function defaultSlot(dept, course) {
    var slots = getSlotInfo(dept, course, session ? session.name : '');
    if (!slots.length) return 'general';
    var now = new Date();
    var curMin = now.getHours() * 60 + now.getMinutes();
    var best = null, bestDiff = Infinity;
    for (var i = 0; i < slots.length; i++) {
      var m = slots[i].time.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
      if (!m) continue;
      var sMin = (+m[1]) * 60 + (+m[2]);
      var eMin = (+m[3]) * 60 + (+m[4]);
      if (curMin >= sMin && curMin <= eMin) { best = slots[i].slot; break; }
      var diff = Math.abs(curMin - sMin);
      if (diff < bestDiff) { bestDiff = diff; best = slots[i].slot; }
    }
    return best || slots[0].slot;
  }

  /* normalise a day record into { slotKey: {teacher, subject, time, rolls} } */
  function normaliseDay(dayRec) {
    if (!dayRec) return {};
    if (!dayRec.rolls && !dayRec.slot && Object.keys(dayRec).some(function (k) { return /^\d+$/.test(k) && (dayRec[k] === 'P' || dayRec[k] === 'A'); })) {
      return { general: { teacher: null, subject: null, time: null, rolls: dayRec } };
    }
    var out = {};
    Object.keys(dayRec).forEach(function (k) {
      var v = dayRec[k];
      if (v && typeof v === 'object' && v.rolls) {
        out[k] = { teacher: v.teacher || null, subject: v.subject || null, time: v.time || null, rolls: v.rolls };
      }
    });
    return out;
  }

  function getSavedRecord(dept, course, date, slotKey) {
    var store = getAttendanceStore();
    var recs = store[getClassKey(dept, course)];
    if (!recs || !recs[date]) return null;
    var day = normaliseDay(recs[date]);
    var entry = day[slotKey];
    return entry ? entry.rolls : null;
  }

  function getLastSavedDate(dept, course) {
    var store = getAttendanceStore();
    var recs = store[getClassKey(dept, course)];
    if (!recs) return null;
    var dates = Object.keys(recs).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }

  function renderAttendanceSheet(main) {
    var list = students.filter(function (s) { return s.dept === state.dept && s.course === state.course; });
    var slots = getSlotInfo(state.dept, state.course, session ? session.name : '');
    if (slots.length && state.slot === 'general') state.slot = defaultSlot(state.dept, state.course);
    var saved = getSavedRecord(state.dept, state.course, state.date, state.slot);
    var statuses = {};
    list.forEach(function (s) { statuses[s.roll] = saved && saved[s.roll] ? saved[s.roll] : 'P'; });
    state.statuses = statuses;

    var slotHtml = '';
    if (slots.length) {
      slotHtml =
        '<label class="att-date-label" for="att-slot">Lecture</label>' +
        '<select id="att-slot" class="field-input att-date-input">' +
        slots.map(function (s) {
          var label = s.slot + ' \u00b7 ' + s.time + (s.subject ? ' \u00b7 ' + s.subject : '');
          return '<option value="' + esc(s.slot) + '"' + (s.slot === state.slot ? ' selected' : '') + '>' + esc(label) + '</option>';
        }).join('') +
        '<option value="general"' + (state.slot === 'general' ? ' selected' : '') + '>General (no timetable slot)</option>' +
        '</select>';
    }

    var html =
      '<div class="section-top">' +
        '<button type="button" class="btn-secondary btn-sm" id="att-back">&larr; All classes</button>' +
        '<h2 class="page-title">' + esc(state.course) + '</h2>' +
        '<p class="page-subtitle">' + esc(state.dept) + ' &middot; ' + list.length + ' students</p>' +
      '</div>' +
      '<div class="att-toolbar">' +
        '<label class="att-date-label" for="att-date">Date</label>' +
        '<input type="date" id="att-date" class="field-input att-date-input" value="' + state.date + '" />' +
        slotHtml +
        '<span class="att-summary" id="att-summary"></span>' +
        '<span class="att-spacer"></span>' +
        '<button type="button" class="btn-secondary btn-sm" id="att-all-p">All Present</button>' +
        '<button type="button" class="btn-secondary btn-sm" id="att-all-a">All Absent</button>' +
        '<button type="button" class="btn-secondary btn-sm" id="att-all-l">All Leave</button>' +
      '</div>' +
      '<div class="student-list att-list">' +
        '<div class="student-header att-header">' +
          '<span>Roll Number</span><span>Student Name</span><span class="att-col">Attendance</span>' +
        '</div>' +
        list.map(function (s) {
          return '<div class="student-row att-row" data-roll="' + esc(s.roll) + '">' +
            '<span class="col-roll">' + esc(s.roll) + '</span>' +
            '<span class="col-name">' + esc(s.name) + '</span>' +
            '<span class="att-toggle">' +
              '<button type="button" class="att-btn present" data-v="P">Present</button>' +
              '<button type="button" class="att-btn absent" data-v="A">Absent</button>' +
              '<button type="button" class="att-btn leave" data-v="L">Leave</button>' +
            '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="att-actions">' +
        '<button type="button" class="btn-primary" id="att-save">Save Attendance</button>' +
        '<button type="button" class="btn-secondary" id="att-export">Export CSV</button>' +
      '</div>';

    if (list.length === 0) {
      main.innerHTML =
        '<div class="section-top">' +
          '<button type="button" class="btn-secondary btn-sm" id="att-back">&larr; All classes</button>' +
          '<h2 class="page-title">' + esc(state.course) + '</h2>' +
          '<p class="page-subtitle">No students found for this class.</p>' +
        '</div>';
      main.querySelector('#att-back').addEventListener('click', backToClasses);
      return;
    }

    main.innerHTML = html;

    main.querySelector('#att-back').addEventListener('click', backToClasses);
    main.querySelector('#att-date').addEventListener('change', function (e) {
      if (!e.target.value) return;
      state.date = e.target.value;
      render();
    });
    var slotSel = main.querySelector('#att-slot');
    if (slotSel) {
      slotSel.addEventListener('change', function (e) {
        state.slot = e.target.value;
        render();
      });
    }

    function updateRow(row, v) {
      row.querySelector('.att-btn.present').classList.toggle('active', v === 'P');
      row.querySelector('.att-btn.absent').classList.toggle('active', v === 'A');
      row.querySelector('.att-btn.leave').classList.toggle('active', v === 'L');
      row.classList.toggle('absent-row', v === 'A');
      row.classList.toggle('leave-row', v === 'L');
    }

    function updateSummary() {
      var p = 0, a = 0, l = 0;
      Object.keys(statuses).forEach(function (r) {
        if (statuses[r] === 'A') a++;
        else if (statuses[r] === 'L') l++;
        else p++;
      });
      var el = document.getElementById('att-summary');
      if (el) el.textContent = 'Present: ' + p + '  \u00b7  Absent: ' + a + '  \u00b7  Leave: ' + l + '  \u00b7  Total: ' + (p + a + l);
    }

    main.querySelectorAll('.att-row').forEach(function (row) {
      var roll = row.getAttribute('data-roll');
      row.querySelectorAll('.att-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          statuses[roll] = btn.getAttribute('data-v');
          updateRow(row, statuses[roll]);
          updateSummary();
        });
      });
      updateRow(row, statuses[roll]);
    });

    function setAll(v) { Object.keys(statuses).forEach(function (r) { statuses[r] = v; }); }
    main.querySelector('#att-all-p').addEventListener('click', function () {
      setAll('P');
      main.querySelectorAll('.att-row').forEach(function (row) { updateRow(row, 'P'); });
      updateSummary();
    });
    main.querySelector('#att-all-a').addEventListener('click', function () {
      setAll('A');
      main.querySelectorAll('.att-row').forEach(function (row) { updateRow(row, 'A'); });
      updateSummary();
    });
    main.querySelector('#att-all-l').addEventListener('click', function () {
      setAll('L');
      main.querySelectorAll('.att-row').forEach(function (row) { updateRow(row, 'L'); });
      updateSummary();
    });

    main.querySelector('#att-save').addEventListener('click', saveRecord);
    main.querySelector('#att-export').addEventListener('click', function () { exportCsv(list, statuses); });

    updateSummary();
  }

  function backToClasses() {
    state.dept = null; state.course = null; state.date = null; state.slot = 'general'; state.statuses = {};
    render();
  }

  /* ══════ SAVE / EXPORT ══════ */
  function saveRecord() {
    if (!state.date) state.date = todayStr();
    var list = students.filter(function (s) { return s.dept === state.dept && s.course === state.course; });
    var store = getAttendanceStore();
    var key = getClassKey(state.dept, state.course);
    if (!store[key]) store[key] = {};
    if (!store[key][state.date]) store[key][state.date] = {};
    var rollsArr = [];
    var p = 0, a = 0, l = 0;
    list.forEach(function (s) {
      var v = state.statuses[s.roll] === 'A' ? 'A' : (state.statuses[s.roll] === 'L' ? 'L' : 'P');
      rollsArr.push([s.roll, v]);
      if (v === 'A') a++;
      else if (v === 'L') l++;
      else p++;
    });
    store[key][state.date][state.slot] = {
      teacher: session ? session.name : null,
      subject: slotSubject(state.slot, state.dept, state.course) || null,
      time: slotTime(state.slot),
      submittedAt: new Date().toISOString(),
      rolls: rollsArr
    };
    if (!window.LKCStorage.put(store)) {
      window.alert('Could not save attendance (browser storage is full).');
      return;
    }
    var label = state.slot !== 'general' ? ' \u00b7 ' + state.slot : '';
    var msg = 'Attendance saved for ' + state.date + label + ' \u00b7 Present: ' + p + ', Absent: ' + a + ', Leave: ' + l;
    if (window.LKCStorage && window.LKCStorage.isServerUp && window.LKCStorage.isServerUp() === false) {
      msg += '  (Saved on this device only \u2014 server unreachable; other teachers won\u2019t see this. Deploy server.js to share data.)';
    }
    toast(msg);
  }

  function exportCsv(list, statuses) {
    var rows = [['Roll Number', 'Student Name', 'Attendance', 'Date', 'Lecture', 'Subject', 'Class', 'Department', 'Teacher']];
    list.forEach(function (s) {
      rows.push([
        s.roll,
        s.name,
        statuses[s.roll] === 'A' ? 'Absent' : (statuses[s.roll] === 'L' ? 'Leave' : 'Present'),
        state.date,
        state.slot,
        slotSubject(state.slot, state.dept, state.course),
        state.course,
        state.dept,
        session ? session.name : ''
      ]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (v) {
        v = String(v);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(',');
    }).join('\r\n');

    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var fname = 'Attendance_' + (state.dept + '_' + state.course).replace(/[^\w]+/g, '_') + '_' + state.date + '.csv';    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
  }

  /* ══════ TOAST ══════ */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.classList.add('show');
      setTimeout(function () {
        t.classList.remove('show');
        setTimeout(function () { t.remove(); }, 300);
      }, 2600);
    }, 10);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
