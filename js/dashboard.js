var Dashboard = (function () {
  var students = [];
  var dashData = null;
  var activeCharts = [];
  var currentState = { page: "dashboard", dept: null, course: null };
  var breadcrumb, content, frame, searchDept, deptList, navBtns, sidebar, overlay;

  function init(refs) {
    breadcrumb = refs.breadcrumb;
    content = refs.content;
    frame = refs.frame;
    searchDept = refs.searchDept;
    deptList = refs.deptList;
    navBtns = refs.navBtns;
    sidebar = refs.sidebar;
    overlay = refs.overlay;
  }

  function setData(stu, dd) {
    students = stu;
    dashData = dd;
  }

  function getDeptCourses(dept) {
    var set = {};
    students.forEach(function (s) {
      if (s.dept === dept) set[s.course] = true;
    });
    return Object.keys(set);
  }

  function getDeptStudentCount(dept) {
    var c = 0;
    students.forEach(function (s) { if (s.dept === dept) c++; });
    return c;
  }

  function getCourseStudentCount(dept, course) {
    var c = 0;
    students.forEach(function (s) {
      if (s.dept === dept && s.course === course) c++;
    });
    return c;
  }

  function departments() {
    var set = {};
    students.forEach(function (s) { set[s.dept] = true; });
    return Object.keys(set).sort();
  }

  function renderDeptSidebar(filter) {
    var q = filter ? filter.toLowerCase() : "";
    deptList.innerHTML = "";
    departments().forEach(function (d) {
      if (q && !d.toLowerCase().includes(q)) return;
      var btn = document.createElement("button");
      btn.className =
        "nav-btn" +
        (currentState.page === "department" && currentState.dept === d
          ? " active"
          : "");
      btn.textContent = d + " (" + getDeptStudentCount(d) + ")";
      btn.addEventListener("click", function () { showDepartment(d); });
      deptList.appendChild(btn);
    });
  }

  function setActiveNav(page) {
    navBtns.forEach(function (b) {
      b.classList.toggle("active", b.dataset.page === page);
    });
  }

  function showDashboard() {
    Utils.destroyCharts(activeCharts);
    currentState = { page: "dashboard", dept: null, course: null };
    setActiveNav("dashboard");
    breadcrumb.textContent = "Dashboard";
    frame.style.display = "none";
    content.style.display = "";
    Utils.closeMobileSidebar(sidebar, overlay);

    var total = students.length;
    var genderCount = {};
    var deptCount = {};

    students.forEach(function (s) {
      genderCount[s.gender] = (genderCount[s.gender] || 0) + 1;
      deptCount[s.dept] = (deptCount[s.dept] || 0) + 1;
    });

    var depts = Object.keys(deptCount).sort();

    content.innerHTML = [
      '<div class="strength-card" id="strength-card">',
      '<div class="strength-inner">',
      '<div class="strength-metric">',
      '<span class="str-total-num">' + total + '</span>',
      '<span class="str-total-lbl">Total Students</span>',
      '</div>',
      '<div class="strength-timeline" id="strength-body"></div>',
      '</div>',
      '</div>',
      '<div class="dashboard">',
      '<div class="stat-card"><div class="label">Total Students</div><div class="value">' + total + '</div><div class="sub">Enrolled 2026-27</div></div>',
      '<div class="stat-card"><div class="label">Departments</div><div class="value">' + depts.length + '</div><div class="sub">Programs offered</div></div>',
      '<div class="stat-card"><div class="label">Courses</div><div class="value">' + new Set(students.map(function (s) { return s.course; })).size + '</div><div class="sub">Active courses</div></div>',
      '</div>',
      '<div class="charts-grid">',
      '<div class="chart-card"><h3>Department-wise Strength</h3><canvas id="chart-dept"></canvas></div>',
      '<div class="chart-card"><h3>Gender-wise Distribution</h3><canvas id="chart-gender"></canvas></div>',
      '</div>',
    ].join("");

    var colors = [
      "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
      "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
    ];
    var deptColors = depts.map(function (_, i) { return colors[i % colors.length]; });

    activeCharts.push(
      new Chart(document.getElementById("chart-dept"), {
        type: "bar",
        data: {
          labels: depts,
          datasets: [{
            label: "Students",
            data: depts.map(function (d) { return deptCount[d]; }),
            backgroundColor: deptColors,
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 50 } } },
        },
      })
    );

    activeCharts.push(
      new Chart(document.getElementById("chart-gender"), {
        type: "doughnut",
        data: {
          labels: Object.keys(genderCount),
          datasets: [{
            data: Object.values(genderCount),
            backgroundColor: ["#3b82f6", "#ec4899"],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, padding: 12 } },
          },
        },
      })
    );

    var sessionCounts = {};
    students.forEach(function (s) {
      var roll = s.roll || "";
      if (roll.startsWith("26")) sessionCounts["2026-27"] = (sessionCounts["2026-27"] || 0) + 1;
      else if (roll.startsWith("25")) sessionCounts["2025-26"] = (sessionCounts["2025-26"] || 0) + 1;
      else if (roll.startsWith("24")) sessionCounts["2024-25"] = (sessionCounts["2024-25"] || 0) + 1;
      else if (roll.startsWith("23")) sessionCounts["2023-24"] = (sessionCounts["2023-24"] || 0) + 1;
    });
    var sessionColors = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b"];
    var sessionEntries = Object.entries(sessionCounts);

    document.getElementById("strength-body").innerHTML = sessionEntries
      .map(function (entry, i) {
        var session = entry[0], count = entry[1];
        return [
          '<div class="str-row">',
          '<span class="str-label" style="color:' + sessionColors[i] + '">' + session + '</span>',
          '<div class="str-track">',
          '<div class="str-fill" style="width:' + (count / total) * 100 + '%;background:' + sessionColors[i] + '"></div>',
          '</div>',
          '<span class="str-val">' + count + '</span>',
          '<span class="str-pct">' + ((count / total) * 100).toFixed(1) + '%</span>',
          '</div>',
        ].join("");
      })
      .join("");

    renderDeptSidebar(searchDept.value);
  }

  function showDepartment(dept) {
    Utils.destroyCharts(activeCharts);
    currentState = { page: "department", dept: dept, course: null };
    setActiveNav(null);
    breadcrumb.textContent = dept;
    frame.style.display = "none";
    content.style.display = "";
    renderDeptSidebar(searchDept.value);
    Utils.closeMobileSidebar(sidebar, overlay);

    var courses = getDeptCourses(dept);
    content.innerHTML = [
      '<div class="dept-header">' + dept + '</div>',
      '<div class="dept-sub">' + getDeptStudentCount(dept) + ' students · ' + courses.length + ' courses</div>',
      '<div class="course-grid">',
      courses.map(function (c) {
        var count = getCourseStudentCount(dept, c);
        return '<div class="course-card" data-course="' + c.replace(/"/g, "&quot;") + '"><h4>' + c + '</h4><div class="count"><strong>' + count + '</strong> students</div></div>';
      }).join(""),
      '</div>',
    ].join("");

    content.querySelectorAll(".course-card").forEach(function (el) {
      el.addEventListener("click", function () { showCourse(el.dataset.course); });
    });
  }

  function showCourse(course) {
    currentState = { page: "course", dept: currentState.dept, course: course };
    breadcrumb.textContent = course;
    frame.style.display = "none";
    content.style.display = "";

    var list = students.filter(function (s) { return s.course === course; });
    var dept = currentState.dept;

    content.innerHTML = [
      '<div class="course-view-header">',
      '<button class="back-btn" id="back-to-dept">← Back</button>',
      '<h2>' + course + '</h2>',
      '</div>',
      '<div class="course-stats">',
      '<div class="stat-card"><div class="label">Students</div><div class="value">' + list.length + '</div></div>',
      '</div>',
      '<div class="table-wrap"><table class="student-table">',
      '<thead><tr><th class="sno">#</th><th>Roll No</th><th>Name</th><th>Gender</th></tr></thead>',
      '<tbody>',
      list.map(function (s, i) {
        return '<tr><td class="sno">' + (i + 1) + '</td><td>' + s.roll + '</td><td><strong>' + s.name + '</strong></td><td>' + s.gender + '</td></tr>';
      }).join(""),
      '</tbody></table></div>',
    ].join("");

    document.getElementById("back-to-dept").addEventListener("click", function () {
      showDepartment(dept);
    });
  }



  return {
    init: init,
    setData: setData,
    showDashboard: showDashboard,
    showDepartment: showDepartment,
    showCourse: showCourse,
    renderDeptSidebar: renderDeptSidebar,
  };
})();
