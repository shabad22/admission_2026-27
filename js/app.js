(function () {
  var students = [];
  var state = { view: 'dashboard', dept: null, course: null };
  var main, searchInput, searchDropdown, backBtn;

  function init() {
    main = document.getElementById('main-content');
    searchInput = document.getElementById('search-input');
    searchDropdown = document.getElementById('search-dropdown');
    backBtn = document.getElementById('back-btn');

    var data = window.__DATA__;
    if (data && data.students && data.students.length) {
      students = data.students;
    }

    backBtn.addEventListener('click', goBack);
    searchInput.addEventListener('input', onSearchInput);
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

    render();
  }

  function getDepartments() {
    var map = {};
    students.forEach(function (s) { map[s.dept] = (map[s.dept] || 0) + 1; });
    return Object.keys(map).sort().map(function (d) { return { name: d, count: map[d] }; });
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

  function getSessionCounts() {
    var map = {};
    students.forEach(function (s) {
      var roll = String(s.roll);
      var match = roll.match(/^(\d{2})/);
      if (match) {
        var p = match[1];
        var yr = Number(p);
        var session = '20' + p + '-' + (yr + 1);
        map[session] = (map[session] || 0) + 1;
      }
    });
    var sorted = {};
    Object.keys(map).sort().forEach(function (k) { sorted[k] = map[k]; });
    return sorted;
  }

  function getGenderCounts() {
    var m = 0, f = 0;
    students.forEach(function (s) {
      if (s.gender === 'M' || s.gender === 'Male') m++;
      else if (s.gender === 'F' || s.gender === 'Female') f++;
    });
    return { male: m, female: f, total: m + f };
  }

  function escapeHtml(str) {
    return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getUniqueCourseCount() {
    var map = {};
    students.forEach(function (s) { map[s.course] = true; });
    return Object.keys(map).length;
  }

  function render() {
    if (state.view === 'dashboard') renderDashboard();
    else if (state.view === 'department') renderDepartment();
    else if (state.view === 'course') renderCourse();
    backBtn.style.display = state.view === 'dashboard' ? 'none' : 'flex';
  }

  /* ══════ DASHBOARD ══════ */
  function renderDashboard() {
    var depts = getDepartments();
    var gender = getGenderCounts();
    var sessions = getSessionCounts();
    var sessionKeys = Object.keys(sessions).reverse();
    var maxSession = sessionKeys.length ? sessions[sessionKeys[0]] : 1;
    var totalCourses = getUniqueCourseCount();
    var totalDepts = depts.length;

    var genderPctM = gender.total ? Math.round(gender.male / gender.total * 100) : 0;
    var genderPctF = 100 - genderPctM;
    var donutDeg = genderPctM * 3.6;

    var html =
      '<h2 class="dashboard-title">Admissions Dashboard</h2>' +
      '<p class="dashboard-subtitle">' + students.length + ' total students enrolled for 2026-27</p>' +

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
              '<div class="gender-ring-inner">' + gender.total + '</div>' +
            '</div>' +
            '<div class="gender-legend">' +
              '<div class="gender-item"><span class="gender-dot male"></span> Male <span class="gender-count">' + gender.male + '</span><span class="gender-pct">' + genderPctM + '%</span></div>' +
              '<div class="gender-item"><span class="gender-dot female"></span> Female <span class="gender-count">' + gender.female + '</span><span class="gender-pct">' + genderPctF + '%</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="section-title">Departments (' + totalDepts + ')</div>' +
      '<div class="dept-grid">' +
      depts.map(function (d) {
        var barPct = Math.round(d.count / students.length * 100);
        return '<div class="dept-card" data-dept="' + escapeHtml(d.name) + '">' +
          '<div class="dept-name">' + escapeHtml(d.name) + '</div>' +
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
      '<h2 class="page-title">' + escapeHtml(state.dept) + '</h2>' +
      '<p class="page-subtitle">' + total + ' students &middot; ' + courses.length + ' programs</p>' +
      '</div>' +
      '<div class="course-grid">' +
      courses.map(function (c) {
        return '<div class="course-card" data-course="' + escapeHtml(c.name) + '">' +
          '<div class="course-name">' + escapeHtml(c.name) + '</div>' +
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
    main.innerHTML =
      '<div class="section-top">' +
      '<h2 class="page-title">' + escapeHtml(state.course) + '</h2>' +
      '<p class="page-subtitle">' + list.length + ' students enrolled</p>' +
      '</div>' +
      '<div class="student-list">' +
      '<div class="student-header">' +
      '<span>Roll Number</span>' +
      '<span>Student Name</span>' +
      '<span>Gender</span>' +
      '</div>' +
      list.map(function (s) {
        return '<div class="student-row">' +
          '<span class="col-roll">' + escapeHtml(s.roll) + '</span>' +
          '<span class="col-name">' + escapeHtml(s.name) + '</span>' +
          '<span class="col-gender">' + (s.gender === 'M' ? 'Male' : s.gender === 'F' ? 'Female' : escapeHtml(s.gender)) + '</span>' +
          '</div>';
      }).join('') +
      '</div>';
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
          '<div class="search-item" data-dept="' + escapeHtml(s.dept) + '" data-course="' + escapeHtml(s.course) + '">' +
          '<span class="sr-roll">' + escapeHtml(s.roll) + '</span>' +
          '<span class="sr-name">' + escapeHtml(s.name) + '</span>' +
          '<span class="sr-course">' + escapeHtml(s.course) + '</span>' +
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
