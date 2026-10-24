/* Sing With Us — small helpers. No tracking, no cookies, nothing sent anywhere.
   1. Theme switcher (the choice is kept only in this browser).
   2. Gentle questions: every answer moves forward; nothing is ever blocked.
   3. Review mode: add ?review to any address to see which quotes still need checking. */
(function () {
  var root = document.documentElement;

  function store(kind, key, value) {
    try {
      var s = kind === "local" ? window.localStorage : window.sessionStorage;
      if (value === undefined) return s.getItem(key);
      if (value === null) s.removeItem(key); else s.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ---- 1. Themes ---- */
  function currentTheme() {
    return root.getAttribute("data-theme") ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "habit" : "cloister");
  }
  function markTheme() {
    var t = currentTheme();
    document.querySelectorAll(".theme-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set") === t ? "true" : "false");
    });
  }
  document.querySelectorAll(".theme-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-set");
      root.setAttribute("data-theme", t);
      store("local", "swu-theme", t);
      markTheme();
    });
  });
  markTheme();

  /* ---- Meditations: on phones, tap a psalm box to reveal the reply ---- */
  document.querySelectorAll(".exchange").forEach(function (ex) {
    var heard = ex.querySelector(".heard");
    if (!heard) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reveal";
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="reveal-open">Tap for the meditation</span><span class="reveal-close">Hide the meditation</span>';
    ex.insertBefore(btn, ex.firstChild);
    function toggle() {
      var open = ex.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", toggle);
    var verse = ex.querySelector(".psalm");
    if (verse) verse.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width: 43.99rem)").matches && !e.target.closest("a")) toggle();
    });
  });

  /* ---- 3. Review mode ---- */
  var q = window.location.search;
  if (/[?&]review=off\b/.test(q)) store("session", "swu-review", null);
  else if (/[?&]review\b/.test(q)) store("session", "swu-review", "1");
  if (store("session", "swu-review") === "1") root.classList.add("review");

  /* ---- 2. Questions ---- */
  // Things that wait for an answer start hidden (only when JavaScript runs;
  // without it, the whole page simply shows).
  document.querySelectorAll("[data-after]").forEach(function (el) { el.hidden = true; });
  document.querySelectorAll(".ask .reply").forEach(function (el) { el.hidden = true; el.setAttribute("tabindex", "-1"); });

  function reveal(id) {
    document.querySelectorAll('[data-after="' + id + '"]').forEach(function (el) { el.hidden = false; });
  }

  document.querySelectorAll(".ask").forEach(function (ask) {
    ask.querySelectorAll(".choice").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ask.querySelectorAll(".choice").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        ask.querySelectorAll(".reply").forEach(function (r) { r.hidden = true; });
        var target = document.getElementById(btn.getAttribute("data-reply"));
        if (target) { target.hidden = false; target.focus({ preventScroll: true }); }
        (btn.getAttribute("data-open") || "").split(/\s+/).forEach(function (pid) {
          var p = pid && document.getElementById(pid);
          if (p) { p.classList.add("suggested"); p.open = true; }
        });
        if (ask.id) reveal(ask.id);
        if (target && target.scrollIntoView) {
          var r = target.getBoundingClientRect();
          if (r.bottom > window.innerHeight) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });
  });

  document.querySelectorAll(".skip-questions").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelectorAll("[data-after]").forEach(function (el) { el.hidden = false; });
      var to = document.querySelector(a.getAttribute("href"));
      if (to) to.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Opening a link to a hidden section (e.g. #common-questions) shows it.
  function showHash() {
    if (!location.hash) return;
    var el = document.getElementById(location.hash.slice(1));
    while (el && el !== document.body) {
      if (el.hidden) el.hidden = false;
      if (el.tagName === "DETAILS") el.open = true;
      el = el.parentElement;
    }
  }
  window.addEventListener("hashchange", showHash);
  showHash();
})();
