(function () {
  var students = [];
  var teachers = [];
  var searchContainer, backBtn, reportsBtn;

  var pad = window.LKCUtil.pad;
  var toStr = window.LKCUtil.toStr;
  var todayStr = window.LKCUtil.todayStr;
  var esc = window.LKCUtil.esc;
  var getMain = window.LKCUtil.getMain;
  function fmtPct(n) { return isFinite(n) ? n.toFixed(1) + '%' : '—'; }

  var state = {
    active: false,
    tab: 'summary',
    period: 'daily',
    date: todayStr(),
    month: todayStr().slice(0, 7),
    teacher: '',
    dept: '',
    course: '',
    subject: ''
  };

  /* ══════ INIT ══════ */
  function init() {
    students = (window.__DATA__ && window.__DATA__.students) || [];
    teachers = (window.__TEACHERS__ && window.__TEACHERS__.teachers) || [];
    reportsBtn = document.getElementById('reports-btn');
    searchContainer = document.querySelector('.search-container');
    backBtn = document.getElementById('back-btn');

    if (reportsBtn) reportsBtn.addEventListener('click', openReports);

    /* Re-render reports immediately whenever attendance data changes
       (this tab's saves, other tabs, or server sync). */
    document.addEventListener('lkc:attendance-changed', function () {
      if (state.active) renderReports();
    });

    /* Re-render when server reachability changes (show/hide local-only notice). */
    document.addEventListener('lkc:storage-status', function () {
      if (state.active) renderReports();
    });

    /* While reports are open, poll the shared store so saves made on other
       browsers/teachers appear without reopening. */
    setInterval(function () {
      if (state.active && window.LKCStorage) window.LKCStorage.refresh();
    }, 10000);
  }

  function getSession() {
    try {
      var raw = localStorage.getItem('lkcTeacherSession');
      if (!raw) return null;
      var s = JSON.parse(raw);
      for (var i = 0; i < teachers.length; i++) {
        if (teachers[i].name === s.name && teachers[i].id === s.id) return teachers[i];
      }
    } catch (e) {}
    return null;
  }

  /* ══════ OPEN / CLOSE ══════ */
  function openReports() {
    var s = getSession();
    if (!s || s.id !== 'MSL') return;
    state.active = true;
    state.tab = 'summary';
    state.period = 'daily';
    state.date = todayStr();
    state.month = todayStr().slice(0, 7);
    state.teacher = '';
    state.dept = '';
    state.course = '';
    state.subject = '';
    if (searchContainer) searchContainer.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    renderReports();
    var m = getMain();
    if (m) m.scrollTop = 0;
  }

  function closeReports() {
    state.active = false;
    if (window.LKC && window.LKC.enterAdminMode) window.LKC.enterAdminMode();
    else location.reload();
  }

  /* ══════ DATA ══════ */
  function getStore() {
    return window.LKCStorage.get();
  }

  function isLegacyDay(day) {
    if (!day || typeof day !== 'object') return false;
    if (day.rolls || day.slot) return false;
    return Object.keys(day).some(function (k) { return /^\d+$/.test(k) && (day[k] === 'P' || day[k] === 'A'); });
  }

  function allLectures() {
    var store = getStore();
    var recs = [];
    Object.keys(store).forEach(function (classKey) {
      var i = classKey.indexOf('|');
      var dept = classKey.slice(0, i);
      var course = classKey.slice(i + 1);
      var dates = store[classKey];
      Object.keys(dates).forEach(function (date) {
        var day = dates[date];
        var norm;
        if (isLegacyDay(day)) norm = { general: { teacher: null, subject: null, time: null, rolls: day } };
        else norm = day;
        Object.keys(norm).forEach(function (slot) {
          var e = norm[slot];
          if (!e || !e.rolls || typeof e.rolls !== 'object') return;
          recs.push({
            classKey: classKey,
            dept: dept,
            course: course,
            date: date,
            slot: slot,
            teacher: e.teacher || '',
            subject: e.subject || '',
            time: e.time || '',
            rolls: e.rolls
          });
        });
      });
    });
    return recs;
  }

  function dayRange(period, anchor) {
    if (period === 'monthly') {
      var y = +anchor.slice(0, 4), m = +anchor.slice(5, 7);
      var last = new Date(y, m, 0).getDate();
      return { start: anchor + '-01', end: anchor + '-' + pad(last) };
    }
    if (period === 'weekly') {
      var d = new Date(anchor + 'T00:00:00');
      var wd = (d.getDay() + 6) % 7;
      var mon = new Date(d); mon.setDate(d.getDate() - wd);
      var sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: toStr(mon), end: toStr(sun) };
    }
    return { start: anchor, end: anchor };
  }

  function currentRange() {
    return dayRange(state.period, state.period === 'monthly' ? state.month + '-01' : state.date);
  }

  function filteredLectures(all) {
    all = all || allLectures();
    var range = currentRange();
    var recs = all.filter(function (r) {
      if (r.date < range.start || r.date > range.end) return false;
      if (state.teacher && r.teacher !== state.teacher) return false;
      if (state.dept && r.dept !== state.dept) return false;
      if (state.course && r.course !== state.course) return false;
      if (state.subject && r.subject !== state.subject) return false;
      return true;
    });
    recs.sort(function (a, b) {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      if (a.slot < b.slot) return -1;
      if (a.slot > b.slot) return 1;
      if (a.course < b.course) return -1;
      return 1;
    });
    return recs;
  }

  function lectureCounts(l) {
    var p = 0, a = 0;
    Object.keys(l.rolls).forEach(function (roll) { if (l.rolls[roll] === 'A') a++; else p++; });
    return { p: p, a: a, t: p + a };
  }

  function groupByClass(recs) {
    var map = {};
    recs.forEach(function (l) {
      if (!map[l.classKey]) map[l.classKey] = { dept: l.dept, course: l.course, lectures: [] };
      map[l.classKey].lectures.push(l);
    });
    return Object.keys(map).sort().map(function (k) { return map[k]; });
  }

  function enrolledCount(dept, course) {
    return students.filter(function (s) { return s.dept === dept && s.course === course; }).length;
  }

  function classOptions() {
    var dept = state.dept;
    var set = {};
    students.forEach(function (s) {
      if (dept && s.dept !== dept) return;
      set[s.course] = 1;
    });
    return Object.keys(set).sort();
  }

  function deptOptions() {
    var set = {};
    students.forEach(function (s) { set[s.dept] = 1; });
    return Object.keys(set).sort();
  }

  function subjectOptions(all) {
    var set = {};
    (all || allLectures()).forEach(function (l) {
      if (state.teacher && l.teacher !== state.teacher) return;
      if (state.dept && l.dept !== state.dept) return;
      if (state.course && l.course !== state.course) return;
      if (l.subject) set[l.subject] = 1;
    });
    return Object.keys(set).sort();
  }

  /* ══════ RENDER ══════ */
  function renderReports() {
    var main = getMain();
    if (!main) return;
    var range = currentRange();

    var localOnly = window.LKCStorage && window.LKCStorage.isServerUp && window.LKCStorage.isServerUp() === false;
    var localOnlyBanner = localOnly
      ? '<div class="storage-warning">' +
          '<strong>Local-only mode.</strong> No attendance server is reachable, so records shown here are only from this device/browser. ' +
          'Records saved by other teachers or devices will not appear. Deploy and run <code>server.js</code> (and set the API in ' +
          '<code>js/config.js</code>) to share data across everyone.' +
        '</div>'
      : '';

    var teacherOpts = '<option value="">All Teachers</option>' + teachers.map(function (t) {
      return '<option value="' + esc(t.name) + '"' + (state.teacher === t.name ? ' selected' : '') + '>' + esc(t.name) + '</option>';
    }).join('');

    var deptOpts = '<option value="">All Departments</option>' + deptOptions().map(function (d) {
      return '<option value="' + esc(d) + '"' + (state.dept === d ? ' selected' : '') + '>' + esc(d) + '</option>';
    }).join('');

    var cOpts = '<option value="">All Classes</option>' + classOptions().map(function (c) {
      return '<option value="' + esc(c) + '"' + (state.course === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');

    var all = allLectures();

    var sOpts = '<option value="">All Subjects</option>' + subjectOptions(all).map(function (s) {
      return '<option value="' + esc(s) + '"' + (state.subject === s ? ' selected' : '') + '>' + esc(s) + '</option>';
    }).join('');

    main.innerHTML =
      '<div class="section-top">' +
        '<button type="button" class="btn-secondary btn-sm" id="reports-close">&larr; Back</button>' +
        '<h2 class="page-title">Attendance Reports</h2>' +
        '<p class="page-subtitle">LKC College &middot; Admissions 2026-27</p>' +
      '</div>' +
      localOnlyBanner +

      '<div class="reports-filters">' +
        '<div class="rf-group">' +
          '<label class="att-date-label">Period</label>' +
          '<select id="r-period" class="field-input">' +
            '<option value="daily"' + (state.period === 'daily' ? ' selected' : '') + '>Daily</option>' +
            '<option value="weekly"' + (state.period === 'weekly' ? ' selected' : '') + '>Weekly</option>' +
            '<option value="monthly"' + (state.period === 'monthly' ? ' selected' : '') + '>Monthly</option>' +
          '</select>' +
        '</div>' +
        '<div class="rf-group" id="rf-date"' + (state.period === 'monthly' ? ' style="display:none"' : '') + '>' +
          '<label class="att-date-label">' + (state.period === 'weekly' ? 'Week (Mon&ndash;Sun)' : 'Date') + '</label>' +
          '<input type="date" id="r-date" class="field-input" value="' + state.date + '" />' +
        '</div>' +
        '<div class="rf-group" id="rf-month"' + (state.period === 'monthly' ? '' : ' style="display:none"') + '>' +
          '<label class="att-date-label">Month</label>' +
          '<input type="month" id="r-month" class="field-input" value="' + state.month + '" />' +
        '</div>' +
        '<div class="rf-group">' +
          '<label class="att-date-label">Teacher</label>' +
          '<select id="r-teacher" class="field-input">' + teacherOpts + '</select>' +
        '</div>' +
        '<div class="rf-group">' +
          '<label class="att-date-label">Department</label>' +
          '<select id="r-dept" class="field-input">' + deptOpts + '</select>' +
        '</div>' +
        '<div class="rf-group">' +
          '<label class="att-date-label">Class</label>' +
          '<select id="r-course" class="field-input">' + cOpts + '</select>' +
        '</div>' +
        '<div class="rf-group">' +
          '<label class="att-date-label">Subject</label>' +
          '<select id="r-subject" class="field-input">' + sOpts + '</select>' +
        '</div>' +
        '<div class="rf-range">' + esc(range.start) + ' &rarr; ' + esc(range.end) + '</div>' +
      '</div>' +

      '<div class="reports-tabs no-print">' +
        '<button type="button" class="report-tab' + (state.tab === 'summary' ? ' active' : '') + '" data-tab="summary">Dashboard</button>' +
        '<button type="button" class="report-tab' + (state.tab === 'student' ? ' active' : '') + '" data-tab="student">Student Reports</button>' +
        '<button type="button" class="report-tab' + (state.tab === 'lecture' ? ' active' : '') + '" data-tab="lecture">Lecture Reports</button>' +
        '<span class="att-spacer"></span>' +
        '<button type="button" class="btn-secondary btn-sm no-print" id="r-print">Print / PDF</button>' +
        '<button type="button" class="btn-secondary btn-sm no-print" id="r-export">Export Excel</button>' +
      '</div>' +

      '<div id="report-content" class="report-content"></div>';

    var recs = filteredLectures(all);

    if (state.tab === 'summary') renderSummary(document.getElementById('report-content'), recs, all);
    else if (state.tab === 'student') renderStudent(document.getElementById('report-content'), recs);
    else renderLecture(document.getElementById('report-content'), recs);

    main.querySelector('#reports-close').addEventListener('click', closeReports);
    main.querySelector('#r-period').addEventListener('change', function (e) {
      state.period = e.target.value;
      if (state.period === 'monthly' && state.month > state.date.slice(0, 7)) state.month = state.date.slice(0, 7);
      renderReports();
    });
    var rdate = main.querySelector('#r-date');
    if (rdate) rdate.addEventListener('change', function (e) { if (e.target.value) { state.date = e.target.value; renderReports(); } });
    var rmonth = main.querySelector('#r-month');
    if (rmonth) rmonth.addEventListener('change', function (e) { if (e.target.value) { state.month = e.target.value; renderReports(); } });
    var rteacher = main.querySelector('#r-teacher');
    if (rteacher) rteacher.addEventListener('change', function (e) { state.teacher = e.target.value; state.dept = ''; state.course = ''; state.subject = ''; renderReports(); });
    var rdept = main.querySelector('#r-dept');
    if (rdept) rdept.addEventListener('change', function (e) { state.dept = e.target.value; state.course = ''; state.subject = ''; renderReports(); });
    var rcourse = main.querySelector('#r-course');
    if (rcourse) rcourse.addEventListener('change', function (e) { state.course = e.target.value; state.subject = ''; renderReports(); });
    var rsubject = main.querySelector('#r-subject');
    if (rsubject) rsubject.addEventListener('change', function (e) { state.subject = e.target.value; renderReports(); });

    main.querySelectorAll('.report-tab').forEach(function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); renderReports(); });
    });
    main.querySelector('#r-print').addEventListener('click', printReport);
    main.querySelector('#r-export').addEventListener('click', exportReport);
  }

  /* ══════ SUMMARY ══════ */
  function renderSummary(el, recs, all) {
    var today = todayStr();
    var wR = dayRange('weekly', today);
    var mR = dayRange('monthly', today.slice(0, 7));
    all = all || allLectures();
    function inRange(l, s, e) { return l.date >= s && l.date <= e; }
    function teacherBlocked(l) { return state.teacher && l.teacher !== state.teacher; }
    var todays = all.filter(function (l) { return l.date === today && !teacherBlocked(l); }).length;
    var weeks = all.filter(function (l) { return inRange(l, wR.start, wR.end) && !teacherBlocked(l); }).length;
    var months = all.filter(function (l) { return inRange(l, mR.start, mR.end) && !teacherBlocked(l); }).length;

    var t = 0, p = 0, a = 0;
    recs.forEach(function (l) { var c = lectureCounts(l); t += c.t; p += c.p; a += c.a; });
    var avgPct = t ? p / t * 100 : 0;
    var daysCovered = {};
    recs.forEach(function (l) { daysCovered[l.date] = 1; });

    var byTeacher = {};
    recs.forEach(function (l) {
      var key = l.teacher || 'Unknown';
      if (!byTeacher[key]) byTeacher[key] = { lectures: 0, p: 0, a: 0 };
      var c = lectureCounts(l);
      byTeacher[key].lectures++; byTeacher[key].p += c.p; byTeacher[key].a += c.a;
    });
    var teacherNames = Object.keys(byTeacher).sort();

    var byClass = {};
    recs.forEach(function (l) {
      if (!byClass[l.classKey]) byClass[l.classKey] = { dept: l.dept, course: l.course, p: 0, a: 0, lectures: 0 };
      var c = lectureCounts(l);
      byClass[l.classKey].p += c.p; byClass[l.classKey].a += c.a; byClass[l.classKey].lectures++;
    });
    var classRows = Object.keys(byClass).map(function (k) {
      var r = byClass[k];
      var pct = (r.p + r.a) ? r.p / (r.p + r.a) * 100 : 0;
      return { key: k, dept: r.dept, course: r.course, pct: pct, lectures: r.lectures };
    }).sort(function (x, y) { return y.pct - x.pct; });
    var top = classRows.slice(0, 3);
    var bottom = classRows.slice(-3).reverse();

    el.innerHTML =
      '<div class="stats-row">' +
        statCard('Today', todays, 'blue', 'lectures') +
        statCard('This Week', weeks, 'green', 'lectures') +
        statCard('This Month', months, 'purple', 'lectures') +
        statCard('Avg Attendance', avgPct.toFixed(1) + '%', 'amber', 'across range') +
        statCard('Marks Marked', t, 'cyan', 'present + absent') +
        statCard('Days Covered', Object.keys(daysCovered).length, 'rose', 'unique dates') +
      '</div>' +

      '<div class="charts-row">' +
        '<div class="chart-card">' +
          '<div class="chart-card-title">Highest Attendance Classes</div>' +
          (top.length ? top.map(function (r) { return miniBar(r.course, r.pct, r.dept, r.lectures); }).join('') : emptyNote()) +
        '</div>' +
        '<div class="chart-card">' +
          '<div class="chart-card-title">Lowest Attendance Classes</div>' +
          (bottom.length ? bottom.map(function (r) { return miniBar(r.course, r.pct, r.dept, r.lectures); }).join('') : emptyNote()) +
        '</div>' +
      '</div>' +

      '<div class="section-title">Teacher Lecture Summary</div>' +
      '<div class="student-list">' +
        '<div class="student-header rep-4">' +
          '<span>Teacher</span><span>Lectures</span><span>Present / Absent</span><span>Avg Attendance</span>' +
        '</div>' +
        (teacherNames.length ? teacherNames.map(function (n) {
          var r = byTeacher[n];
          var pct = (r.p + r.a) ? r.p / (r.p + r.a) * 100 : 0;
          return '<div class="student-row rep-4">' +
            '<span class="col-name">' + esc(n) + '</span>' +
            '<span>' + r.lectures + '</span>' +
            '<span>' + r.p + ' / ' + r.a + '</span>' +
            '<span class="rep-pct' + (pct >= 75 ? ' ok' : pct < 60 ? ' bad' : ' mid') + '">' + fmtPct(pct) + '</span>' +
          '</div>';
        }).join('') : emptyNoteRow('No lectures recorded in the selected range.')) +
      '</div>';
  }

  function miniBar(course, pct, dept, lectures) {
    var w = Math.max(pct, 0);
    return '<div class="mini-bar-row">' +
      '<div class="mini-bar-head"><span class="mini-bar-name">' + esc(course) + '</span><span class="mini-bar-val">' + pct.toFixed(1) + '%</span></div>' +
      '<div class="bar-track"><div class="bar-fill s4" style="width:' + w + '%"></div></div>' +
      '<div class="mini-bar-sub">' + esc(dept) + ' &middot; ' + lectures + ' lecture(s)</div>' +
    '</div>';
  }

  function emptyNote() {
    return '<div class="rep-empty">No data for the selected range.</div>';
  }
  function emptyNoteRow(msg) {
    return '<div class="rep-empty" style="padding:18px;grid-column:1/-1">' + msg + '</div>';
  }

  function statCard(label, value, color, sub) {
    var icons = {
      blue: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
      green: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
      purple: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
      amber: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
      cyan: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>',
      rose: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>'
    };
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + color + '">' + (icons[color] || '') + '</div>' +
      '<div class="stat-body"><div class="stat-value">' + esc(value) + '</div><div class="stat-label">' + esc(label) + (sub ? ' &middot; ' + esc(sub) : '') + '</div></div>' +
    '</div>';
  }

  /* ══════ STUDENT REPORT ══════ */
  function renderStudent(el, recs) {
    var groups = groupByClass(recs);
    if (!groups.length) {
      el.innerHTML = emptyNote();
      return;
    }
    var html = '<div class="student-list">' +
      '<div class="student-header rep-7">' +
        '<span>Class</span><span>Department</span><span>Students</span><span>Lectures</span><span>Present</span><span>Absent</span><span>Attendance</span>' +
      '</div>';

    groups.forEach(function (g) {
      var enrolled = enrolledCount(g.dept, g.course);
      var p = 0, a = 0, possible = 0;
      g.lectures.forEach(function (l) { var c = lectureCounts(l); p += c.p; a += c.a; possible += c.t; });
      var pct = possible ? p / possible * 100 : 0;

      html += '<details class="rep-details">' +
        '<summary class="rep-summary student-row rep-7">' +
          '<span class="col-name">' + esc(g.course) + '</span>' +
          '<span>' + esc(g.dept) + '</span>' +
          '<span>' + enrolled + '</span>' +
          '<span>' + g.lectures.length + '</span>' +
          '<span class="ok">' + p + '</span>' +
          '<span class="bad">' + a + '</span>' +
          '<span class="rep-pct' + (pct >= 75 ? ' ok' : pct < 60 ? ' bad' : ' mid') + '">' + fmtPct(pct) + '</span>' +
        '</summary>' +
        '<div class="rep-detail-body">' + studentDetails(g.dept, g.course, g.lectures) + '</div>' +
      '</details>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function studentDetails(dept, course, lectures) {
    var per = {};
    lectures.forEach(function (l) {
      Object.keys(l.rolls).forEach(function (roll) {
        var st = per[roll] || (per[roll] = { p: 0, a: 0 });
        if (l.rolls[roll] === 'A') st.a++; else st.p++;
      });
    });
    var list = students.filter(function (s) { return s.dept === dept && s.course === course; })
      .sort(function (x, y) { return x.roll < y.roll ? -1 : 1; });
    if (!list.length) return '<div class="rep-empty">No students found.</div>';
    return '<div class="student-list">' +
      '<div class="student-header rep-5">' +
        '<span>Roll Number</span><span>Student Name</span><span>Present</span><span>Absent</span><span>Days</span>' +
      '</div>' +
      list.map(function (s) {
        var st = per[s.roll] || { p: 0, a: 0 };
        var days = st.p + st.a;
        var pct = days ? st.p / days * 100 : 0;
        return '<div class="student-row rep-5">' +
          '<span class="col-roll">' + esc(s.roll) + '</span>' +
          '<span class="col-name">' + esc(s.name) + '</span>' +
          '<span>' + st.p + '</span>' +
          '<span>' + st.a + '</span>' +
          '<span class="rep-pct' + (pct >= 75 ? ' ok' : pct < 60 ? ' bad' : ' mid') + '">' + fmtPct(pct) + '</span>' +
        '</div>';
      }).join('') +
      '</div>';
  }

  /* ══════ LECTURE REPORT ══════ */
  function renderLecture(el, recs) {
    if (!recs.length) { el.innerHTML = emptyNote(); return; }
    el.innerHTML = '<div class="student-list">' +
      '<div class="student-header rep-8">' +
        '<span>Date</span><span>Time</span><span>Teacher</span><span>Class</span><span>Subject</span><span>Present</span><span>Absent</span><span>Attendance</span>' +
      '</div>' +
      recs.map(function (l) {
        var c = lectureCounts(l);
        var pct = c.t ? c.p / c.t * 100 : 0;
        return '<div class="student-row rep-8">' +
          '<span class="col-roll">' + esc(l.date) + '</span>' +
          '<span>' + esc((l.time || '').replace(/[()]/g, '')) + '</span>' +
          '<span class="col-name">' + esc(l.teacher || '—') + '</span>' +
          '<span>' + esc(l.course) + ' <span class="rep-dept">' + esc(l.dept) + '</span></span>' +
          '<span>' + esc(l.subject || '—') + '</span>' +
          '<span class="ok">' + c.p + '</span>' +
          '<span class="bad">' + c.a + '</span>' +
          '<span class="rep-pct' + (pct >= 75 ? ' ok' : pct < 60 ? ' bad' : ' mid') + '">' + fmtPct(pct) + '</span>' +
        '</div>';
      }).join('') +
      '</div>';
  }

  /* ══════ PRINT / EXPORT ══════ */
  function printReport() {
    var content = document.getElementById('report-content');
    var range = currentRange();
    var w = window.open('', '_blank');
    if (!w) { window.alert('Please allow pop-ups to print the report.'); return; }
    w.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>Attendance Report</title>' +
      '<style>' +
        'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1e293b;margin:24px;}' +
        'h1{font-size:20px;margin:0 0 2px;} p{margin:0 0 16px;color:#64748b;font-size:13px;}' +
        'table{width:100%;border-collapse:collapse;font-size:12px;} th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;}' +
        'th{background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.4px;}' +
        '.ok{color:#15803d;font-weight:600;} .bad{color:#b91c1c;font-weight:600;}' +
        '@media print{body{display:block;}}' +
      '</style></head><body>' +
      '<h1>Attendance Report</h1>' +
      '<p>' + esc(range.start) + ' &rarr; ' + esc(range.end) +
      (state.teacher ? ' &middot; ' + esc(state.teacher) : '') +
      (state.course ? ' &middot; ' + esc(state.course) : '') +
      (state.subject ? ' &middot; ' + esc(state.subject) : '') + '</p>' +
      content.innerHTML +
      '</body></html>'
    );
    w.document.close();
    w.focus();
    w.print();
  }

  function exportReport() {
    var range = currentRange();
    var recs = filteredLectures();
    var rows = [['LKC College - Attendance Report', '', '', '', '', '', '', '']];
    rows.push(['Period', state.period.charAt(0).toUpperCase() + state.period.slice(1), range.start + ' to ' + range.end, state.teacher, state.dept, state.course, state.subject, '']);
    rows.push(['']);

    if (state.tab === 'summary') {
      rows.push(['Teacher', 'Lectures', 'Present', 'Absent', 'Avg Attendance']);
      var byTeacher = {};
      recs.forEach(function (l) {
        var key = l.teacher || 'Unknown';
        if (!byTeacher[key]) byTeacher[key] = { lectures: 0, p: 0, a: 0 };
        var c = lectureCounts(l);
        byTeacher[key].lectures++; byTeacher[key].p += c.p; byTeacher[key].a += c.a;
      });
      Object.keys(byTeacher).sort().forEach(function (n) {
        var r = byTeacher[n];
        var pct = (r.p + r.a) ? (r.p / (r.p + r.a) * 100).toFixed(1) + '%' : '—';
        rows.push([n, r.lectures, r.p, r.a, pct]);
      });
    } else if (state.tab === 'student') {
      rows.push(['Class', 'Department', 'Students', 'Lectures', 'Present', 'Absent', 'Attendance %']);
      groupByClass(recs).forEach(function (g) {
        var enrolled = enrolledCount(g.dept, g.course);
        var p = 0, a = 0;
        g.lectures.forEach(function (l) { var c = lectureCounts(l); p += c.p; a += c.a; });
        var pct = (p + a) ? (p / (p + a) * 100).toFixed(1) + '%' : '—';
        rows.push([g.course, g.dept, enrolled, g.lectures.length, p, a, pct]);
      });
    } else {
      rows.push(['Date', 'Time', 'Teacher', 'Class', 'Department', 'Subject', 'Present', 'Absent', 'Total', 'Attendance %']);
      recs.forEach(function (l) {
        var c = lectureCounts(l);
        var pct = c.t ? (c.p / c.t * 100).toFixed(1) + '%' : '—';
        rows.push([l.date, (l.time || '').replace(/[()]/g, ''), l.teacher || '—', l.course, l.dept, l.subject || '—', c.p, c.a, c.t, pct]);
      });
    }

    var csv = rows.map(function (r) {
      return r.map(function (v) {
        v = String(v === undefined || v === null ? '' : v);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(',');
    }).join('\r\n');

    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Attendance_Report_' + state.period + '_' + range.start + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
