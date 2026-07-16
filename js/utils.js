var Utils = (function () {
  function toIndian(n) {
    var num = Math.round(n).toString();
    if (num.length <= 3) return num;
    var last3 = num.slice(-3);
    var rest = num.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }

  function animateValue(el, to) {
    var from = Number(el.dataset.prev) || 0;
    if (from === to) return;
    el.dataset.prev = to;
    var dur = Math.min(400, 200 + Math.abs(to - from) * 8);
    var start = performance.now();
    function tick(now) {
      var t = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function destroyCharts(activeCharts) {
    activeCharts.forEach(function (c) { c.destroy(); });
    activeCharts.length = 0;
  }

  function closeMobileSidebar(sidebar, overlay) {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    }
  }

  return {
    toIndian: toIndian,
    animateValue: animateValue,
    destroyCharts: destroyCharts,
    closeMobileSidebar: closeMobileSidebar,
  };
})();
