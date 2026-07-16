var Visitor = (function () {
  function init() {
    var today = new Date().toDateString();
    var data = JSON.parse(localStorage.getItem("lkc_visitors"));
    if (!data || data.date !== today) {
      data = {
        today: 0,
        total: data ? data.total : 0,
        date: today,
      };
      localStorage.setItem("lkc_visitors", JSON.stringify(data));
    }
    updateDisplay(data);
  }

  function track() {
    var today = new Date().toDateString();
    var data = JSON.parse(localStorage.getItem("lkc_visitors"));
    if (!data || data.date !== today) {
      data = { today: 0, total: data ? data.total : 0, date: today };
    }
    data.today++;
    data.total++;
    localStorage.setItem("lkc_visitors", JSON.stringify(data));
    updateDisplay(data);
  }

  function updateDisplay(data) {
    var t = document.getElementById("today-visitors");
    var tt = document.getElementById("total-visitors");
    if (t) Utils.animateValue(t, data.today);
    if (tt) Utils.animateValue(tt, data.total);
  }

  return {
    init: init,
    track: track,
  };
})();
