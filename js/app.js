(function () {
  var students = [];
  var state = { view: 'dashboard', dept: null, course: null, sortCol: null, sortDir: null };
  var main, searchInput, searchDropdown, backBtn;
  var esc = window.LKCUtil.esc;
  var searchTimer = null;

  function init() {
    main = document.getElementById('main-content');
    searchInput = document.getElementById('search-input');
    searchDropdown = document.getElementById('search-dropdown');
    backBtn = document.getElementById('back-btn');

    /* Initialize theme (must run early to avoid flash) */
    window.LKCUtil.initTheme();

    var data = window.__DATA__;
    if (data && data.students && data.students.length) {
      students = data.students;
    }

    backBtn.addEventListener('click', goBack);
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(onSearchInput, 200);
    });
    searchInput.addEventListener('focus', onSearchFocus);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-container')) {
        searchDropdown.classList.remove('active');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        searchDropdown.classList.remove('active');
        searchInput.blur();
      }
    });

    window.LKCAdmin = {
      showDashboard: function () {
        state.view = 'dashboard';
        state.dept = null;
        state.course = null;
        searchInput.value = '';
        searchDropdown.innerHTML = '';
        searchDropdown.classList.remove('active');
        render();
      }
    };
  }

  function getCourses(dept) {
    var map = {};
    students.forEach(function (s) {
      if (s.dept === dept) map[s.course] = (map[s.course] || 0) + 1;
    });
    return Object.keys(map).sort().map(function (c) { return { name: c, count: map[c] }; });
  }

  function getStudentList(dept, course) {
    return students.filter(function (s) { return s.dept === dept && s.course === course; });
  }

  function render() {
    if (state.view === 'dashboard') renderDashboard();
    else if (state.view === 'department') renderDepartment();
    else if (state.view === 'course') renderCourse();
    backBtn.style.display = state.view === 'dashboard' ? 'none' : 'flex';
  }

  /* ══════ DASHBOARD ══════ */
  function renderDashboard() {
    var deptMap = {}, courseSet = {}, sessionMap = {}, male = 0, female = 0;
    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      deptMap[s.dept] = (deptMap[s.dept] || 0) + 1;
      courseSet[s.course] = 1;
      if (s.gender === 'M' || s.gender === 'Male') male++;
      else if (s.gender === 'F' || s.gender === 'Female') female++;
      var match = String(s.roll).match(/^(\d{2})/);
      if (match) {
        var yr = Number(match[1]);
        var sess = '20' + match[1] + '-' + (yr + 1);
        sessionMap[sess] = (sessionMap[sess] || 0) + 1;
      }
    }

    var depts = Object.keys(deptMap).sort().map(function (d) { return { name: d, count: deptMap[d] }; });
    var sessions = {};
    Object.keys(sessionMap).sort().forEach(function (k) { sessions[k] = sessionMap[k]; });
    var sessionKeys = Object.keys(sessions).reverse();
    var maxSession = sessionKeys.length ? sessions[sessionKeys[0]] : 1;
    var totalCourses = Object.keys(courseSet).length;
    var totalDepts = depts.length;
    var total = male + female;

    var genderPctM = total ? Math.round(male / total * 100) : 0;
    var genderPctF = 100 - genderPctM;
    var donutDeg = genderPctM * 3.6;

    var html =
      '<h2 class="dashboard-title">Attendance System</h2>' +
      '<p class="dashboard-subtitle">' + students.length + ' total students enrolled</p>' +

      '<div class="stats-row">' +
        statCard('Users', students.length, 'blue') +
        statCard('Departments', totalDepts, 'green') +
        statCard('Programes', totalCourses, 'purple') +
      '</div>' +

      '<div class="charts-row">' +
        '<div class="chart-card">' +
          '<div class="chart-card-title">Session Enrollment</div>' +
          '<div class="bar-chart">' +
            sessionKeys.map(function (s) {
              var pct = Math.max(Math.round(sessions[s] / maxSession * 100), 4);
              var cls = s === '2026-27' ? 's4' : s === '2025-26' ? 's3' : s === '2024-25' ? 's2' : 's1';
              return '<div class="bar-row">' +
                '<span class="bar-label">' + s + '</span>' +
                '<div class="bar-track"><div class="bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
                '<span class="bar-val">' + sessions[s] + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="chart-card">' +
          '<div class="chart-card-title">Gender Distribution</div>' +
          '<div class="gender-chart">' +
            '<div class="gender-ring" style="background: conic-gradient(#3b82f6 0deg ' + donutDeg + 'deg, #f472b6 ' + donutDeg + 'deg 360deg)">' +
              '<div class="gender-ring-inner">' + total + '</div>' +
            '</div>' +
            '<div class="gender-legend">' +
              '<div class="gender-item"><span class="gender-dot male"></span> Male <span class="gender-count">' + male + '</span><span class="gender-pct">' + genderPctM + '%</span></div>' +
              '<div class="gender-item"><span class="gender-dot female"></span> Female <span class="gender-count">' + female + '</span><span class="gender-pct">' + genderPctF + '%</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="section-title">Departments (' + totalDepts + ')</div>' +
      '<div class="dept-grid">' +
      depts.map(function (d) {
        var barPct = Math.round(d.count / students.length * 100);
        return '<div class="dept-card" data-dept="' + esc(d.name) + '">' +
          '<div class="dept-name">' + esc(d.name) + '</div>' +
          '<div class="dept-count"><strong>' + d.count + '</strong> students</div>' +
          '<div class="dept-bar-mini"><div class="dept-bar-mini-fill" style="width:' + barPct + '%"></div></div>' +
          '</div>';
      }).join('') +
      '</div>';

    main.innerHTML = html;

    main.querySelectorAll('.dept-card').forEach(function (el) {
      el.addEventListener('click', function () {
        state.view = 'department';
        state.dept = el.getAttribute('data-dept');
        state.course = null;
        render();
      });
    });
  }

  function statCard(icon, value, color) {
    var icons = {
      Users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      'Departments': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>',
      'Programes': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',

    };
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + color + '">' + (icons[icon] || '') + '</div>' +
      '<div class="stat-body"><div class="stat-value">' + value + '</div><div class="stat-label">' + icon + '</div></div>' +
    '</div>';
  }

  /* ══════ DEPARTMENT VIEW ══════ */
  function renderDepartment() {
    var courses = getCourses(state.dept);
    var total = courses.reduce(function (s, c) { return s + c.count; }, 0);
    main.innerHTML =
      '<div class="section-top">' +
      '<h2 class="page-title">' + esc(state.dept) + '</h2>' +
      '<p class="page-subtitle">' + total + ' students &middot; ' + courses.length + ' programs</p>' +
      '</div>' +
      '<div class="course-grid">' +
      courses.map(function (c) {
        return '<div class="course-card" data-course="' + esc(c.name) + '">' +
          '<div class="course-name">' + esc(c.name) + '</div>' +
          '<div class="course-count"><strong>' + c.count + '</strong> students</div>' +
          '</div>';
      }).join('') +
      '</div>';

    main.querySelectorAll('.course-card').forEach(function (el) {
      el.addEventListener('click', function () {
        state.view = 'course';
        state.course = el.getAttribute('data-course');
        render();
      });
    });
  }

  /* ══════ COURSE VIEW ══════ */
  function renderCourse() {
    var list = getStudentList(state.dept, state.course);
    state.sortCol = null;
    state.sortDir = null;
    renderSortedCourse(list);
  }

  function renderSortedCourse(list) {
    var sortCol = state.sortCol;
    var sortDir = state.sortDir;

    if (sortCol) {
      list = list.slice().sort(function (a, b) {
        var va = a[sortCol], vb = b[sortCol];
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    function th(label, col) {
      var arrow = sortCol === col ? (sortDir === 'asc' ? ' &#9650;' : ' &#9660;') : '';
      return '<span class="sortable-header" data-col="' + col + '">' + label + arrow + '</span>';
    }

    main.innerHTML =
      '<div class="section-top">' +
      '<h2 class="page-title">' + esc(state.course) + '</h2>' +
      '<p class="page-subtitle">' + list.length + ' students enrolled</p>' +
      '</div>' +
      '<div class="student-list">' +
      '<div class="student-header">' +
      th('Roll Number', 'roll') +
      th('Student Name', 'name') +
      '<span>Gender</span>' +
      '</div>' +
      list.map(function (s) {
        return '<div class="student-row">' +
          '<span class="col-roll">' + esc(s.roll) + '</span>' +
          '<span class="col-name">' + esc(s.name) + '</span>' +
          '<span class="col-gender">' + (s.gender === 'M' ? 'Male' : s.gender === 'F' ? 'Female' : esc(s.gender)) + '</span>' +
          '</div>';
      }).join('') +
      '</div>';

    main.querySelectorAll('.sortable-header').forEach(function (el) {
      el.addEventListener('click', function () {
        var col = el.getAttribute('data-col');
        if (state.sortCol === col) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortCol = col;
          state.sortDir = 'asc';
        }
        renderSortedCourse(getStudentList(state.dept, state.course));
      });
    });
  }

  /* ══════ NAVIGATION ══════ */
  function goBack() {
    if (state.view === 'course') {
      state.view = 'department';
      state.course = null;
    } else if (state.view === 'department') {
      state.view = 'dashboard';
      state.dept = null;
    }
    render();
  }

  /* ══════ SEARCH ══════ */
  function onSearchInput() {
    var q = searchInput.value.trim();
    if (!q) {
      searchDropdown.innerHTML = '';
      searchDropdown.classList.remove('active');
      return;
    }
    showSearchResults(q);
  }

  function onSearchFocus() {
    if (searchInput.value.trim()) {
      showSearchResults(searchInput.value.trim());
    }
  }

  function showSearchResults(q) {
    var lower = q.toLowerCase();
    var matches = students.filter(function (s) {
      return s.name.toLowerCase().indexOf(lower) !== -1 || s.roll.indexOf(q) !== -1;
    });

    if (matches.length === 0) {
      searchDropdown.innerHTML = '<div class="search-empty">No students found</div>';
    } else {
      var html = '';
      var limit = Math.min(matches.length, 80);
      for (var i = 0; i < limit; i++) {
        var s = matches[i];
        html +=
          '<div class="search-item" data-dept="' + esc(s.dept) + '" data-course="' + esc(s.course) + '">' +
          '<span class="sr-roll">' + esc(s.roll) + '</span>' +
          '<span class="sr-name">' + esc(s.name) + '</span>' +
          '<span class="sr-course">' + esc(s.course) + '</span>' +
          '</div>';
      }
      if (matches.length > limit) {
        html += '<div class="search-empty" style="padding:10px;font-size:11px">' + (matches.length - limit) + ' more results. Type more to refine.</div>';
      }
      searchDropdown.innerHTML = html;

      searchDropdown.querySelectorAll('.search-item').forEach(function (el) {
        el.addEventListener('click', function () {
          state.view = 'course';
          state.dept = el.getAttribute('data-dept');
          state.course = el.getAttribute('data-course');
          searchInput.value = '';
          searchDropdown.innerHTML = '';
          searchDropdown.classList.remove('active');
          render();
        });
      });
    }
    searchDropdown.classList.add('active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
