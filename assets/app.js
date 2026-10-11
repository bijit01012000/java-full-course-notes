/* ===========================================================================
   Java + Spring Boot Full Course Notes — site behaviour
   Theme toggle · sidebar · search · bookmarks · active-section highlight
   No dependencies. Works from file:// and any static host.
   =========================================================================== */
(function () {
  "use strict";

  var LS_THEME = "jfc:theme", LS_STARS = "jfc:stars", LS_LAST = "jfc:last";

  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function loadJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }

  /* ---------------- theme ---------------- */
  var THEMES = ["light", "dark", "nord", "dracula", "solarized-light", "solarized-dark", "paper"];
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    return THEMES.indexOf(t) !== -1 ? t : "light";
  }
  function applyTheme(t) {
    if (THEMES.indexOf(t) === -1) t = "light";
    document.documentElement.setAttribute("data-theme", t);
    store(LS_THEME, t);
    var sel = document.getElementById("theme-select");
    if (sel) sel.value = t;
  }
  var themeSelect = document.getElementById("theme-select");
  applyTheme(currentTheme());
  if (themeSelect) {
    themeSelect.addEventListener("change", function () { applyTheme(themeSelect.value); });
  }

  /* ---------------- mobile sidebar ---------------- */
  var burger = document.getElementById("hamburger");
  var scrim = document.querySelector(".scrim");
  if (burger) {
    burger.addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
  }
  if (scrim) { scrim.addEventListener("click", function () { document.body.classList.remove("nav-open"); }); }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".sidebar a");
    if (a && window.matchMedia("(max-width: 1000px)").matches) document.body.classList.remove("nav-open");
  });

  /* ---------------- bookmarks (stars) ---------------- */
  function padNum(n) { return n < 10 ? "0" + n : String(n); }
  function fileFor(course, n) {
    var prefix = course === "spring" ? "spring-" : course === "dsa" ? "dsa-" : "lecture-";
    return prefix + padNum(n);
  }
  function lectMap(course) {
    return course === "spring" ? (window.SPRING || {}) : course === "dsa" ? (window.DSA || {}) : (window.LECTURES || {});
  }
  var COURSE_ORDER = { java: 0, spring: 1, dsa: 2 };
  function normStar(k) { return typeof k === "number" ? "java:" + k : String(k); }
  var stars = (loadJSON(LS_STARS, []) || []).map(normStar);
  function starKey(btn) {
    var course = btn.getAttribute("data-course") || "java";
    return course + ":" + parseInt(btn.getAttribute("data-lecture"), 10);
  }
  function isStarred(key) { return stars.indexOf(key) !== -1; }
  function saveStars() { store(LS_STARS, JSON.stringify(stars)); renderBookmarks(); }
  function renderBookmarks() {
    var block = document.getElementById("bookmarks");
    var list = document.getElementById("bookmarks-list");
    if (!block || !list) return;
    list.innerHTML = "";
    if (!stars.length) { block.style.display = "none"; return; }
    block.style.display = "";
    function splitKey(k) { var i = k.indexOf(":"); return [k.slice(0, i), parseInt(k.slice(i + 1), 10)]; }
    stars.slice().sort(function (a, b) {
      var pa = splitKey(a), pb = splitKey(b);
      if (pa[0] !== pb[0]) return (COURSE_ORDER[pa[0]] || 0) - (COURSE_ORDER[pb[0]] || 0);
      return pa[1] - pb[1];
    }).forEach(function (key) {
      var p = splitKey(key), course = p[0], n = p[1];
      var meta = lectMap(course)[n];
      if (!meta) return;
      var li = document.createElement("li");
      li.className = "side-link-row";
      var a = document.createElement("a");
      a.href = (meta.file || fileFor(course, n)) + ".html";
      a.innerHTML = '<span class="num">' + (meta.label || padNum(n)) + "</span>" + meta.short;
      var b = document.createElement("button");
      b.className = "star on"; b.textContent = "★"; b.title = "Remove bookmark";
      b.addEventListener("click", function (e) {
        e.preventDefault();
        stars = stars.filter(function (x) { return x !== key; });
        saveStars(); syncStarButtons();
      });
      li.appendChild(a); li.appendChild(b);
      list.appendChild(li);
    });
  }
  function syncStarButtons() {
    document.querySelectorAll(".star[data-lecture]").forEach(function (btn) {
      var on = isStarred(starKey(btn));
      var label = btn.getAttribute("data-label");
      btn.classList.toggle("on", on);
      btn.textContent = label ? ((on ? "★ " : "☆ ") + label) : (on ? "★" : "☆");
      btn.title = on ? "Remove bookmark" : "Bookmark this lecture";
    });
  }
  document.querySelectorAll(".star[data-lecture]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var key = starKey(btn);
      if (isStarred(key)) stars = stars.filter(function (x) { return x !== key; });
      else stars.push(key);
      saveStars(); syncStarButtons();
    });
  });

  /* ---------------- search ---------------- */
  var q = document.getElementById("q");
  var results = document.getElementById("search-results");
  var parts = document.getElementById("parts");
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function runSearch(term) {
    var idx = window.SEARCH_INDEX || [];
    term = term.trim().toLowerCase();
    if (term.length < 2) {
      results.classList.remove("show"); results.innerHTML = "";
      if (parts) parts.style.display = "";
      return;
    }
    var hits = idx.filter(function (r) { return r.text.toLowerCase().indexOf(term) !== -1; }).slice(0, 40);
    if (parts) parts.style.display = "none";
    results.classList.add("show");
    if (!hits.length) { results.innerHTML = '<div class="sr-empty">No matches for "' + esc(term) + '"</div>'; return; }
    results.innerHTML = hits.map(function (r) {
      var lect = r.course ? r.course + " · " + r.lecture : r.lecture;
      var label = r.section ? '<span class="sr-lect">' + esc(lect) + " ›</span> " : '<span class="sr-lect">' + esc(lect) + " ·</span> ";
      return '<a class="sr-item" href="' + esc(r.url) + '">' + label + esc(r.section || r.lectureTitle) + "</a>";
    }).join("");
  }
  if (q) {
    q.addEventListener("input", function () { runSearch(q.value); });
    q.addEventListener("keydown", function (e) { if (e.key === "Escape") { q.value = ""; runSearch(""); q.blur(); } });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== q && !e.target.matches("input,textarea")) {
        e.preventDefault(); q.focus();
      }
    });
  }

  /* ---------------- last visited / continue reading ---------------- */
  var pageLect = document.body.getAttribute("data-lecture");
  if (pageLect) {
    store(LS_LAST, JSON.stringify({
      course: document.body.getAttribute("data-course") || "java",
      n: parseInt(pageLect, 10),
      title: document.body.getAttribute("data-lecture-title") || ""
    }));
  }
  function fillContinue(el, course) {
    if (!el) return;
    var last = loadJSON(LS_LAST, null);
    if (last && last.n != null && (last.course || "java") === course) {
      el.href = fileFor(course, last.n) + ".html";
      var b = el.querySelector("b");
      if (b) b.textContent = last.title;
      el.style.display = "";
    }
  }
  fillContinue(document.getElementById("continue"), "java");
  fillContinue(document.getElementById("continue-spring"), "spring");
  fillContinue(document.getElementById("continue-dsa"), "dsa");

  /* ---------------- active section highlight ---------------- */
  var sectionLinks = document.querySelectorAll(".sections a");
  if (sectionLinks.length) {
    var map = {};
    sectionLinks.forEach(function (a) { map[a.getAttribute("href").split("#")[1]] = a; });
    var heads = document.querySelectorAll(".article h2[id]");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          sectionLinks.forEach(function (a) { a.classList.remove("active"); });
          var a = map[en.target.id];
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-70px 0px -75% 0px", threshold: 0 });
    heads.forEach(function (h) { io.observe(h); });
  }

  /* ---------------- heading anchor copy ---------------- */
  document.querySelectorAll(".article h2[id], .article h3[id]").forEach(function (h) {
    var b = document.createElement("button");
    b.className = "anchor-btn"; b.textContent = "#"; b.title = "Copy link to this section";
    b.addEventListener("click", function () {
      var url = location.href.split("#")[0] + "#" + h.id;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { flash(b, "copied"); },
        function () { flash(b, "copy?"); });
      else flash(b, "copy?");
    });
    h.appendChild(b);
  });
  function flash(el, txt) {
    var old = el.textContent; el.textContent = txt;
    setTimeout(function () { el.textContent = old; }, 1100);
  }

  renderBookmarks();
  syncStarButtons();
})();
