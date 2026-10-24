(function () {
  var root = document.documentElement;
  var toggle = document.getElementById("themeToggle");
  var expand = document.getElementById("expandAll");

  function label() {
    var dark = root.getAttribute("data-theme") === "dark";
    if (toggle) {
      toggle.textContent = dark ? "☀ Light" : "☾ Dark";
      toggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  if (toggle) {
    label();
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("sd-theme", next); } catch (e) {}
      label();
    });
  }

  if (expand) {
    expand.addEventListener("click", function () {
      var open = expand.getAttribute("data-open") !== "true";
      document.querySelectorAll(".qa details").forEach(function (d) { d.open = open; });
      expand.setAttribute("data-open", String(open));
      expand.textContent = open ? "Collapse all answers" : "Expand all answers";
    });
  }

  var links = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));
  if (links.length && "IntersectionObserver" in window) {
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-15% 0px -72% 0px", threshold: 0 });
    targets.forEach(function (t) { obs.observe(t); });
  }
})();
