/* Monastic Psalter: the compact picker for phones and tablets (Br. Augustine, Nov 2026).
   One line, "Psalter ▾ · Week IV › · Sunday ▾ · Lauds ▾", instead of four rows of buttons. Tapping the week steps to the
   next week (I → II → III → IV → I); tapping the book, the day or the hour opens that row of buttons just below the
   line, and choosing closes it. The rows are app.js's own buttons ([data-book], [data-week], [data-day], [data-hour]),
   so nothing about choosing changes: this only shows them differently, and reads their state back for the labels.
   Wide screens (62rem and up) still show every row at once (app.css). */
(function () {
  "use strict";
  var bar = document.querySelector(".pickbar"), line = document.getElementById("pick-line");
  if (!bar || !line) return;
  var btn = function (k) { return line.querySelector('[data-pl="' + k + '"]'); };
  var pressed = function (attr) { return bar.querySelector(".seg [" + attr + '][aria-pressed="true"]'); };

  function set(k, t) { var s = btn(k).querySelector("span"); if (s.textContent !== t) s.textContent = t; }
  function sync() {
    var b = pressed("data-book"), w = pressed("data-week"), d = pressed("data-day"), h = pressed("data-hour");
    set("book", b ? b.textContent : "Psalter");
    set("week", w ? "Week " + w.textContent.trim() : "Week");
    var ow = !!(w && w.classList.contains("ordo-wk")); if (btn("week").classList.contains("ordo-wk") !== ow) btn("week").classList.toggle("ordo-wk", ow);
    set("day", d ? (d.getAttribute("aria-label") || d.textContent) : "Day");
    set("hour", h ? h.textContent : "Hour");
    ["book", "day", "hour"].forEach(function (k) { var v = String(bar.dataset.open === k); if (btn(k).getAttribute("aria-expanded") !== v) btn(k).setAttribute("aria-expanded", v); });
  }
  function open(k) { if (bar.dataset.open === k || !k) delete bar.dataset.open; else bar.dataset.open = k; sync(); }

  line.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pl]"); if (!b) return;
    var k = b.dataset.pl;
    if (k === "week") {        // step to the next week, through app.js's own week button
      delete bar.dataset.open;
      var weeks = [].slice.call(bar.querySelectorAll(".seg [data-week]")), cur = weeks.indexOf(pressed("data-week"));
      weeks[(cur + 1) % weeks.length].click();
      return;
    }
    open(k);
  });
  // A choice in an open row closes it (app.js has already acted on the click)
  bar.addEventListener("click", function (e) {
    if (bar.dataset.open && e.target.closest(".seg button")) { delete bar.dataset.open; sync(); }
  });
  document.addEventListener("click", function (e) { if (bar.dataset.open && !e.target.closest(".pickbar")) { delete bar.dataset.open; sync(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && bar.dataset.open) { delete bar.dataset.open; sync(); } });
  // Follow app.js: whatever it presses (today's hour on opening, the ordo's week, Compline/Ultima), the line says
  // (only the rows are watched, and labels are written only when they change, so the line's own updates never loop)
  var mo = new MutationObserver(sync);
  bar.querySelectorAll(".seg").forEach(function (g) { mo.observe(g, { subtree: true, attributes: true, attributeFilter: ["aria-pressed", "class"], childList: true, characterData: true }); });
  sync();
})();
