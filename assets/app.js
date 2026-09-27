/* ===========================================================================
   Java Full Course Notes — site behaviour
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
  function currentTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store(LS_THEME, t);
    var b = document.getElementById("theme-toggle");
    if (b) {
      b.textContent = (t === "dark") ? "Light" : "Dark";
      b.setAttribute("aria-label", "Switch to " + ((t === "dark") ? "light" : "dark") + " theme");
    }
  }
  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    applyTheme(currentTheme());
    toggle.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
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
  var stars = loadJSON(LS_STARS, []);
  function isStarred(n) { return stars.indexOf(n) !== -1; }
  function saveStars() { store(LS_STARS, JSON.stringify(stars)); renderBookmarks(); }
  function renderBookmarks() {
    var block = document.getElementById("bookmarks");
    var list = document.getElementById("bookmarks-list");
    if (!block || !list) return;
    list.innerHTML = "";
    if (!stars.length) { block.style.display = "none"; return; }
    block.style.display = "";
    stars.slice().sort(function (a, b) { return a - b; }).forEach(function (n) {
      var meta = (window.LECTURES || {})[n];
      if (!meta) return;
      var li = document.createElement("li");
      li.className = "side-link-row";
      var a = document.createElement("a");
      a.href = "lecture-" + (n < 10 ? "0" + n : n) + ".html";
      a.innerHTML = '<span class="num">' + (n < 10 ? "0" + n : n) + "</span>" + meta.short;
      var b = document.createElement("button");
      b.className = "star on"; b.textContent = "★"; b.title = "Remove bookmark";
      b.addEventListener("click", function (e) {
        e.preventDefault();
        stars = stars.filter(function (x) { return x !== n; });
        saveStars(); syncStarButtons();
      });
      li.appendChild(a); li.appendChild(b);
      list.appendChild(li);
    });
  }
  function syncStarButtons() {
    document.querySelectorAll(".star[data-lecture]").forEach(function (btn) {
      var n = parseInt(btn.getAttribute("data-lecture"), 10);
      var on = isStarred(n);
      var label = btn.getAttribute("data-label");
      btn.classList.toggle("on", on);
      btn.textContent = label ? ((on ? "★ " : "☆ ") + label) : (on ? "★" : "☆");
      btn.title = on ? "Remove bookmark" : "Bookmark this lecture";
    });
  }
  document.querySelectorAll(".star[data-lecture]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var n = parseInt(btn.getAttribute("data-lecture"), 10);
      if (isStarred(n)) stars = stars.filter(function (x) { return x !== n; });
      else stars.push(n);
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
      var label = r.section ? '<span class="sr-lect">' + esc(r.lecture) + " ›</span> " : '<span class="sr-lect">' + esc(r.lecture) + " ·</span> ";
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
    var lt = document.body.getAttribute("data-lecture-title") || "";
    store(LS_LAST, JSON.stringify({ n: parseInt(pageLect, 10), title: lt }));
  }
  var cont = document.getElementById("continue");
  if (cont) {
    var last = loadJSON(LS_LAST, null);
    if (last && last.n) {
      cont.href = "lecture-" + (last.n < 10 ? "0" + last.n : last.n) + ".html";
      cont.querySelector("b").textContent = last.title;
      cont.style.display = "";
    }
  }

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
