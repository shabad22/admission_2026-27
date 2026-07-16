(function () {
  var navBtns = document.querySelectorAll(".nav-btn[data-page]");
  var deptList = document.getElementById("dept-list");
  var content = document.getElementById("content");
  var frame = document.getElementById("frame");
  var breadcrumb = document.getElementById("breadcrumb");
  var searchDept = document.getElementById("search-dept");
  var menuToggle = document.getElementById("menu-toggle");
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebar-overlay");

  var refs = {
    navBtns: navBtns,
    deptList: deptList,
    content: content,
    frame: frame,
    breadcrumb: breadcrumb,
    searchDept: searchDept,
    sidebar: sidebar,
    overlay: overlay,
  };

  Dashboard.init(refs);

  navBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.dataset.page === "dashboard") Dashboard.showDashboard();
    });
  });

  menuToggle.addEventListener("click", function () {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("active");
  });

  overlay.addEventListener("click", function () {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  });

  document.querySelector(".nav").addEventListener("click", function (e) {
    if (e.target.closest(".nav-btn") && window.innerWidth <= 768) {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    }
  });

  searchDept.addEventListener("input", function () {
    Dashboard.renderDeptSidebar(searchDept.value);
  });

  API.loadAll()
    .then(function (result) {
      Dashboard.setData(result.students, result.dashboard);
      Visitor.init();
      Dashboard.showDashboard();
    })
    .catch(function (err) {
      console.error("Failed to load data:", err);
      content.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:18px">Failed to load data. Please ensure the data files exist.</div>';
    });
})();
