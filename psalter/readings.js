/* Matins readings, and each monk's own highlights, notes and page marks.
   The readings are the Two-Year Lectionary the abbey reads at Matins (a Biblical and a Patristic reading for
   each day, Year I and Year II, and the feasts), sealed in the vault like the book (vault/index.json "lect":
   one file per day key, built by the private psalter repo's lectionary/tools/vault.py).
   Highlights, notes and marks are kept only in this browser (localStorage): nobody else sees them. The sheet
   under the ✎ button backs them up to a file, reads a backup back in, and makes a readable copy. */
(function () {
  var IN = window.PSALTER_IN;
  if (!IN) return;
  var $ = function (s) { return document.querySelector(s); };

  // The year of the cycle changes at Advent: Year I from Advent 2026 (the abbey's ruling, 27 Oct 2026).
  // "calendar" would change it on 1 January instead (Year I in odd years).
  var YEAR_FROM = "advent";
  function cycleYear(d) {
    var y = d.getFullYear();
    if (YEAR_FROM === "advent" && d >= IN.firstAdventSunday(y)) y++;
    return y % 2 ? "I" : "II";
  }
  function sundayCycle(d) { var y = d.getFullYear(); if (d >= IN.firstAdventSunday(y)) y++; return ["C", "A", "B"][y % 3]; }

  // ---- Which readings a day takes ----
  var DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  function two(n) { return String(n).padStart(2, "0"); }
  function holyFamily(y) {   // the Sunday within the octave of Christmas, or 30 December when there is none
    for (var dd = 26; dd <= 31; dd++) if (new Date(y, 11, dd).getDay() === 0) return new Date(y, 11, dd);
    return new Date(y, 11, 30);
  }
  // The day's place in the seasons, worked out from the date (the ordo's line names a memorial, not the week)
  function seasonKey(d) {
    var y = d.getFullYear(), m = d.getMonth(), dd = d.getDate(), wd = DOW[d.getDay()], S = IN.same, B = IN.daysBetween, A = IN.addDays;
    var mmdd = two(m + 1) + "-" + two(dd), adv = IN.firstAdventSunday(y), e = IN.easter(y), ash = A(e, -46);
    var ep = IN.epiphany(y), bapt = IN.endOfChristmastide(y), ck = A(adv, -7);
    if (m === 11 && dd >= 25) return dd === 25 ? "christmas" : S(d, holyFamily(y)) ? "holy-family" : mmdd;
    if (d >= adv) return dd >= 17 && m === 11 ? mmdd : "adv" + (Math.floor(B(adv, d) / 7) + 1) + "-" + wd;
    if (d <= bapt) return S(d, ep) ? "epiphany" : S(d, bapt) ? "baptism" : d > ep ? "epi-" + wd : mmdd;
    if (S(d, ash)) return "ash-wed";
    if (d > ash && d < e) {
      if (B(ash, d) < 4) return "ash-" + wd;
      var n = Math.floor(B(A(ash, 4), d) / 7) + 1;
      return n >= 6 && wd !== "sun" ? "holy-" + wd : "lent" + n + "-" + wd;
    }
    if (S(d, A(e, 39))) return "ascension";
    if (S(d, A(e, 49))) return "pentecost";
    if (d >= e && d < A(e, 49)) return "east" + (Math.floor(B(e, d) / 7) + 1) + "-" + wd;
    if (S(d, A(e, 56))) return "trinity";
    if (S(d, A(e, 63))) return "corpus";
    if (S(d, A(e, 68))) return "sacred-heart";
    if (S(d, ck)) return "christ-king";
    var w = d < ash ? Math.max(1, Math.floor(B(IN.sundayOf(bapt), IN.sundayOf(d)) / 7) + 1)
                    : 34 - Math.round(B(IN.sundayOf(d), ck) / 7);
    return "ot" + two(w) + "-" + wd;
  }
  var WEEKDAY = /^(ot\d\d|adv\d|lent\d|east\d|ash|holy|epi)-(sun|mon|tue|wed|thu|fri|sat)$/;   // not holy-family
  var OWN_DAYS = { "11-02": "All Souls", "11-13": "the abbey's own day", "11-14": "the abbey's own day" };
  // A feast or solemnity with its own readings takes them, and so do the abbey's own days and All Souls;
  // a memorial keeps the weekday's. A day the seasons name (Christmas, the Holy Family, 17–24 December …) is its own.
  function dayKey(d, lect) {
    var season = seasonKey(d), mmdd = IN.ymd(d).slice(5);
    if (!WEEKDAY.test(season)) return season;
    var o = IN.ordoDay(d), rank = o ? IN.rankOf(o) || "" : "";
    var feast = OWN_DAYS[mmdd] || /Solemnity|Feast/.test(rank) || o === null;   // no ordo for that year: trust the Sanctoral
    return feast && lect[mmdd] ? mmdd : season;
  }

  // ---- What this browser keeps: highlights, notes, marks (and the chosen alternatives) ----
  var NOTES_KEY = "psalter-notes", CHOICE_KEY = "psalter-lect-choice";
  var notes = { hls: [], marks: [] }, choice = {};
  try { var nj = JSON.parse(localStorage.getItem(NOTES_KEY) || "null"); if (nj && nj.hls && nj.marks) notes = nj; } catch (x) {}
  try { choice = JSON.parse(localStorage.getItem(CHOICE_KEY) || "{}") || {}; } catch (x) {}
  function saveNotes() {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); return true; }
    catch (x) { toast("This browser would not keep it (private window, or storage full)."); return false; }
  }
  function saveChoice() { try { localStorage.setItem(CHOICE_KEY, JSON.stringify(choice)); } catch (x) {} }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  var COLORS = ["gold", "rose", "sage", "sky"], CNAME = { gold: "Gold", rose: "Rose", sage: "Sage", sky: "Sky" };

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var toastT = null;
  function toast(t) {
    var el = $(".nt-toast"); if (!el) { el = document.createElement("div"); el.className = "nt-toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 2600);
  }
  function sheet(html) {
    var back = document.createElement("div"); back.className = "nt-back";
    back.innerHTML = '<div class="nt-sheet" role="dialog" aria-modal="true">' + html + "</div>";
    back.addEventListener("click", function (e) { if (e.target === back) back.remove(); });
    document.body.appendChild(back);
    return back;
  }
  function dotsHtml(sel) {
    return '<div class="hl-dots" role="group" aria-label="Colour">' + COLORS.map(function (c) {
      return '<button type="button" class="hl-dot ' + c + '" data-c="' + c + '" aria-pressed="' + (c === sel) + '" aria-label="' + CNAME[c] + '"></button>';
    }).join("") + "</div>";
  }
  function wireDots(root, set) {
    root.querySelectorAll(".hl-dot").forEach(function (b) {
      b.addEventListener("click", function () { root.querySelectorAll(".hl-dot").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); set(b.dataset.c); });
    });
  }

  // ---- The readings, from the vault ----
  var days = {};   // day key -> Promise of { key, years }
  function loadDay(idx, key, k) {
    if (!days[k]) days[k] = IN.open(idx.lect[k], key).then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); },
      function (e) { delete days[k]; throw e; });
    return days[k];
  }
  function plain(segs) { return segs.map(function (s) { return s[0]; }).join(""); }
  function dayName(title) { return title.replace(/\s*[,(]?\s*\bYear\b.*$/, "").replace(/^the octave of the nativity of the lord:\s*/i, "").trim(); }
  function rid(e) { return e.title + "|" + e.heading; }   // a reading, wherever it comes again
  function startWords(e) { var t = plain(e.paras[0] || []).split(/\s+/).slice(0, 5).join(" "); return "“" + t.replace(/[,;:.]$/, "") + "…”"; }

  var token = null, shown = null;   // shown: { k, year, d, data } on screen now
  function update() {
    var box = $("#lect"), rd = $("#readings"), my = token = {};
    if (!IN.matins()) { box.hidden = true; shown = null; return; }
    var d = IN.dayDate();
    IN.index().then(function (idx) {
      if (token !== my) return;
      var lect = idx.lect || {}, k = dayKey(d, lect);
      if (!lect[k]) { box.hidden = true; shown = null; return; }   // no readings: the DivineOffice.org link stays
      rd.hidden = true;
      var keyP = IN.key();
      if (!keyP) { box.hidden = true; return; }   // locked: the password box is showing
      return keyP.then(function (key) { return loadDay(idx, key, k); }).then(function (data) {
        if (token !== my) return;
        var year = k === "08-06" ? sundayCycle(d) : cycleYear(d);
        shown = { k: k, year: year, d: d, data: data };
        draw();
      });
    }).catch(function () {
      if (token !== my) return;
      box.hidden = false; box.innerHTML = '<p class="lect-msg">Couldn\'t open the readings just now. Check the connection and try again.</p>';
    });
  }
  function entriesOf(kind) { var y = shown.data.years[shown.year]; return y && y[kind] || []; }
  function chosen(kind) {
    var es = entriesOf(kind), c = choice[shown.k + "|" + shown.year + "|" + kind];
    for (var i = 0; i < es.length; i++) if (rid(es[i]) === c) return i;
    return 0;
  }
  function draw() {
    var box = $("#lect"), first = entriesOf("Biblical")[0] || entriesOf("Patristic")[0];
    box.innerHTML = "";
    if (!first) { box.hidden = true; return; }
    var head = document.createElement("p"); head.className = "lect-day";
    head.textContent = "Matins readings · " + dayName(first.title) + " · Year " + shown.year;
    box.appendChild(head);
    ["Biblical", "Patristic"].forEach(function (kind) {
      var es = entriesOf(kind);
      if (!es.length) return;
      var at = chosen(kind), e = es[at];
      var art = document.createElement("article"); art.className = "lect-r"; art.dataset.kind = kind; art.dataset.rid = rid(e);
      var lab = document.createElement("p"); lab.className = "lect-kind"; lab.textContent = kind === "Biblical" ? "Biblical reading" : "Patristic reading";
      art.appendChild(lab);
      if (es.length > 1) {   // an alternative, or an older version: the reader chooses
        var alts = document.createElement("div"); alts.className = "lect-alts"; alts.setAttribute("role", "group"); alts.setAttribute("aria-label", "Choose the " + kind + " reading");
        es.forEach(function (x, i) {
          var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-pressed", String(i === at));
          b.textContent = (i === 0 ? "Year " + shown.year : x.older ? "Older version" : "Alternative") + " · " + startWords(x);
          b.addEventListener("click", function () { choice[shown.k + "|" + shown.year + "|" + kind] = rid(x); saveChoice(); draw(); });
          alts.appendChild(b);
        });
        art.appendChild(alts);
      }
      var h = document.createElement("h3"); h.textContent = (e.heading || "").toUpperCase(); art.appendChild(h);
      var tx = document.createElement("div"); tx.className = "lect-text";
      e.paras.forEach(function (segs, i) { var p = document.createElement("p"); p.dataset.i = i; fillPara(p, segs, hlsIn(e, kind, i)); tx.appendChild(p); });
      art.appendChild(tx);
      if (e.cite) { var c = document.createElement("p"); c.className = "lect-cite"; c.textContent = e.cite; art.appendChild(c); }
      box.appendChild(art);
    });
    box.hidden = false;
  }
  // A paragraph: Word's runs (italic kept: the Scripture a Father quotes), LORD set small, highlights marked
  function hlsIn(e, kind, i) {
    var r = rid(e), text = plain(e.paras[i]);
    return notes.hls.filter(function (h) { return h.k === shown.k && h.year === shown.year && h.kind === kind && h.rid === r && h.i === i; })
      .map(function (h) {   // the offsets may drift if a reading is corrected: find the words again
        var s = h.s, en = h.e;
        if (h.t && text.slice(s, en) !== h.t) { var j = text.indexOf(h.t); if (j >= 0) { s = j; en = j + h.t.length; } }
        return { h: h, s: Math.max(0, s), e: Math.min(text.length, en) };
      }).filter(function (x) { return x.e > x.s; }).sort(function (a, b) { return a.s - b.s; });
  }
  function fillPara(p, segs, ranges) {
    var pos = 0;
    segs.forEach(function (sg) {
      var t = sg[0], a = pos, z = pos + t.length; pos = z;
      var cuts = [a, z];
      ranges.forEach(function (r) { if (r.s > a && r.s < z) cuts.push(r.s); if (r.e > a && r.e < z) cuts.push(r.e); });
      cuts.sort(function (x, y) { return x - y; });
      for (var c = 0; c < cuts.length - 1; c++) {
        var from = cuts[c], to = cuts[c + 1]; if (to <= from) continue;
        var piece = t.slice(from - a, to - a), host = p;
        var r = ranges.filter(function (x) { return x.s <= from && x.e >= to; })[0];
        if (r) { var m = document.createElement("mark"); m.className = "hl " + r.h.color + (r.h.note ? " noted" : ""); m.dataset.hl = r.h.id; host.appendChild(m); host = m; }
        if (sg[1]) { var it = document.createElement("i"); host.appendChild(it); host = it; }
        piece.split(/\b(LORD)\b/).forEach(function (bit, j) {
          if (!bit) return;
          if (j % 2) { var l = document.createElement("span"); l.className = "lord"; l.textContent = bit; host.appendChild(l); }
          else host.appendChild(document.createTextNode(bit));
        });
      }
    });
  }

  // ---- Selecting words in a reading: choose a colour, add a note if you like ----
  function offsetsWithin(el, range) {   // the selection's characters within one paragraph (as Lumina does it)
    var start = -1, end = -1, pos = 0, w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var len = n.textContent.length, cs = 1, ce = -1;
      try { cs = range.comparePoint(n, 0); ce = range.comparePoint(n, len); } catch (x) {}
      if (n === range.startContainer) start = pos + range.startOffset; else if (start === -1 && cs === 0) start = pos;
      if (n === range.endContainer) end = pos + range.endOffset; else if (ce === 0) end = pos + len; else if (start !== -1 && end === -1 && cs === 0) end = pos + len;
      pos += len;
    }
    return start >= 0 && end > start ? { s: start, e: end } : null;
  }
  var touching = false, selT = null, pop = null;
  addEventListener("touchstart", function () { touching = true; }, { passive: true });
  addEventListener("touchend", function () { touching = false; armSel(); }, { passive: true });
  addEventListener("mouseup", function () { armSel(); });
  document.addEventListener("selectionchange", function () { armSel(); });
  function armSel() { clearTimeout(selT); selT = setTimeout(checkSel, 550); }
  function hidePop() { if (pop) { pop.remove(); pop = null; } }
  document.addEventListener("pointerdown", function (e) { if (pop && !pop.contains(e.target)) hidePop(); });
  function checkSel() {
    if (touching || !shown) return;
    var sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    var range = sel.getRangeAt(0), box = $("#lect");
    if (!box.contains(range.commonAncestorContainer)) return;
    var touched = [];
    box.querySelectorAll(".lect-r").forEach(function (art) {
      var kind = art.dataset.kind, e = entriesOf(kind)[chosen(kind)];
      art.querySelectorAll(".lect-text p").forEach(function (p) {
        if (!range.intersectsNode(p)) return;
        var off = offsetsWithin(p, range);
        if (off) touched.push({ kind: kind, e: e, i: +p.dataset.i, s: off.s, e2: off.e, t: p.textContent.slice(off.s, off.e) });
      });
    });
    touched = touched.filter(function (t) { return t.t.trim(); });
    if (!touched.length) return;
    var overlap = touched.some(function (t) { return hlsIn(t.e, t.kind, t.i).some(function (r) { return t.s < r.e && t.e2 > r.s; }); });
    showPop(range.getBoundingClientRect(), touched, overlap);
  }
  function showPop(rect, touched, overlap) {
    hidePop();
    var color = "gold";
    pop = document.createElement("div"); pop.className = "nt-pop";
    pop.innerHTML = dotsHtml(color) + (overlap ? '<p class="nt-msg">This overlaps a highlight already here.</p>' : "") +
      '<textarea aria-label="Note" placeholder="Add a note (optional)"></textarea>' +
      '<div class="nt-btns"><button type="button" data-x="cancel">Cancel</button><button type="button" class="primary" data-x="save"' + (overlap ? " disabled" : "") + ">Highlight</button></div>";
    document.body.appendChild(pop);
    var w = pop.offsetWidth, left = Math.min(Math.max(8, rect.left + rect.width / 2 - w / 2), innerWidth - w - 8), top = rect.bottom + 10;
    if (top + pop.offsetHeight > innerHeight - 8) top = Math.max(8, rect.top - pop.offsetHeight - 10);
    top = Math.min(Math.max(8, top), innerHeight - pop.offsetHeight - 8);   // always on screen
    pop.style.left = left + "px"; pop.style.top = top + "px";
    wireDots(pop, function (c) { color = c; });
    pop.querySelector('[data-x="cancel"]').addEventListener("click", function () { hidePop(); getSelection().removeAllRanges(); });
    pop.querySelector('[data-x="save"]').addEventListener("click", function () {
      var note = pop.querySelector("textarea").value.trim(), g = uid();
      touched.forEach(function (t) {
        notes.hls.push({ id: uid(), g: g, k: shown.k, year: shown.year, kind: t.kind, rid: rid(t.e), i: t.i, s: t.s, e: t.e2, t: t.t,
          color: color, note: note, day: IN.ymd(shown.d), name: dayName(t.e.title), heading: t.e.heading, added: Date.now() });
      });
      saveNotes(); hidePop(); getSelection().removeAllRanges(); draw(); toast("Highlighted. Tap it to change or remove it.");
    });
  }
  // Tap a highlight: read its note, change its colour or note, or remove it
  document.addEventListener("click", function (e) {
    var m = e.target.closest && e.target.closest("#lect mark.hl");
    if (!m) return;
    var sel = getSelection(); if (sel && !sel.isCollapsed) return;
    var h = notes.hls.filter(function (x) { return x.id === m.dataset.hl; })[0];
    if (h) editHl(h);
  });
  function editHl(h) {
    var group = notes.hls.filter(function (x) { return h.g ? x.g === h.g : x.id === h.id; }), color = h.color;
    var words = group.map(function (x) { return x.t; }).join(" ");
    var back = sheet("<h2>Highlight</h2>" + '<p class="nt-quote">“' + esc(words.length > 220 ? words.slice(0, 219) + "…" : words) + "”</p>" + dotsHtml(color) +
      '<textarea aria-label="Note" placeholder="Note">' + esc(h.note || "") + "</textarea>" +
      '<div class="nt-btns"><button type="button" class="danger" data-x="del">Remove</button><button type="button" data-x="cancel">Cancel</button><button type="button" class="primary" data-x="save">Save</button></div>');
    wireDots(back, function (c) { color = c; });
    back.querySelector('[data-x="cancel"]').addEventListener("click", function () { back.remove(); });
    back.querySelector('[data-x="del"]').addEventListener("click", function () {
      var ids = group.map(function (x) { return x.id; });
      notes.hls = notes.hls.filter(function (x) { return ids.indexOf(x.id) < 0; });
      saveNotes(); back.remove(); draw(); toast("Highlight removed");
    });
    back.querySelector('[data-x="save"]').addEventListener("click", function () {
      var note = back.querySelector("textarea").value.trim();
      group.forEach(function (x) { x.color = color; x.note = note; });
      saveNotes(); back.remove(); draw();
    });
  }

  // ---- Marks over the book's pages: drag a box over part of a page ----
  // Kept by file, page and place on the page (fractions of its width and height), so a mark stays where it was
  // at any width, and shows wherever that page is shown again (whole, or cut into an hour).
  function paintMarks() {
    document.querySelectorAll("#pdf-pages .pg").forEach(function (pg) {
      pg.querySelectorAll(".mk:not(.draft)").forEach(function (x) { x.remove(); });
      var src = pg.dataset.src, n = +pg.dataset.pg, f0 = +pg.dataset.f0, f1 = +pg.dataset.f1;
      notes.marks.forEach(function (mk) {
        if (mk.src !== src || mk.pg !== n) return;
        var a = Math.max(mk.y, f0), z = Math.min(mk.y + mk.h, f1);
        if (z - a <= 0.001) return;
        var el = document.createElement("div"); el.className = "mk " + mk.color + (mk.note ? " noted" : ""); el.dataset.mk = mk.id;
        el.style.left = mk.x * 100 + "%"; el.style.width = mk.w * 100 + "%";
        el.style.top = (a - f0) / (f1 - f0) * 100 + "%"; el.style.height = (z - a) / (f1 - f0) * 100 + "%";
        el.title = mk.note || "Marked"; el.setAttribute("role", "button"); el.setAttribute("aria-label", "Mark" + (mk.note ? ": " + mk.note : ""));
        el.tabIndex = 0;
        pg.appendChild(el);
      });
    });
    fab();
  }
  var marking = false, drag = null, bar = null;
  function startMarking() {
    marking = true; document.body.classList.add("marking"); menu(false);
    bar = document.createElement("div"); bar.className = "mk-bar";
    bar.innerHTML = "<span>Drag over the part of the page to mark.</span>";
    var b = document.createElement("button"); b.type = "button"; b.textContent = "Cancel"; b.addEventListener("click", stopMarking);
    bar.appendChild(b); document.body.appendChild(bar);
  }
  function stopMarking() {
    marking = false; document.body.classList.remove("marking");
    if (bar) { bar.remove(); bar = null; }
    if (drag) { drag.el.remove(); drag = null; }
  }
  function placeIn(pg, ev) {   // a point on the page (fractions of the whole page, not of this strip)
    var r = pg.getBoundingClientRect(), f0 = +pg.dataset.f0, f1 = +pg.dataset.f1;
    var fx = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), fy = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
    return { x: fx, y: f0 + fy * (f1 - f0), sy: fy };
  }
  var pages = $("#pdf-pages");
  pages.addEventListener("pointerdown", function (ev) {
    if (!marking) return;
    var pg = ev.target.closest(".pg"); if (!pg) return;
    ev.preventDefault();
    var p = placeIn(pg, ev), el = document.createElement("div"); el.className = "mk draft"; pg.appendChild(el);
    drag = { pg: pg, a: p, b: p, el: el, id: ev.pointerId };
    try { pg.setPointerCapture(ev.pointerId); } catch (x) {}
    sizeDraft();
  });
  pages.addEventListener("pointermove", function (ev) { if (drag && ev.pointerId === drag.id) { drag.b = placeIn(drag.pg, ev); sizeDraft(); } });
  function sizeDraft() {
    var d = drag, f0 = +d.pg.dataset.f0, f1 = +d.pg.dataset.f1;
    var x = Math.min(d.a.x, d.b.x), y = Math.min(d.a.sy, d.b.sy);
    d.el.style.left = x * 100 + "%"; d.el.style.width = Math.abs(d.a.x - d.b.x) * 100 + "%";
    d.el.style.top = y * 100 + "%"; d.el.style.height = Math.abs(d.a.sy - d.b.sy) * 100 + "%";
  }
  function endDrag(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var d = drag; drag = null; d.el.remove();
    var x = Math.min(d.a.x, d.b.x), y = Math.min(d.a.y, d.b.y), w = Math.abs(d.a.x - d.b.x), h = Math.abs(d.a.y - d.b.y);
    var r = d.pg.getBoundingClientRect(), f = (+d.pg.dataset.f1 - +d.pg.dataset.f0);
    if (w * r.width < 12 || h / f * r.height < 8) return;   // a tap, not a drag: keep waiting for one
    stopMarking();
    var src = d.pg.dataset.src, n = +d.pg.dataset.pg;
    editMark({ id: uid(), src: src, pg: n, x: x, y: y, w: w, h: h, color: "gold", note: "", p: IN.printed(src, n), where: whereLabel(src), added: Date.now() }, true);
  }
  pages.addEventListener("pointerup", endDrag);
  pages.addEventListener("pointercancel", function (ev) { if (drag && ev.pointerId === drag.id) { drag.el.remove(); drag = null; } });
  pages.addEventListener("click", function (ev) {
    var el = !marking && ev.target.closest(".mk"); if (!el) return;
    var mk = notes.marks.filter(function (x) { return x.id === el.dataset.mk; })[0];
    if (mk) editMark(mk, false);
  });
  pages.addEventListener("keydown", function (ev) { var el = ev.target.closest && ev.target.closest(".mk"); if (el && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); el.click(); } });
  function whereLabel(src) {
    var books = IN.books();
    if (books) for (var b in books) {
      var secs = books[b].sections;
      for (var i = 0; i < secs.length; i++) if (secs[i].path === src) return b === "Psalter" ? "Psalter · " + IN.label(src) : books[b].label + " · " + secs[i].title;
    }
    return IN.label(src);
  }
  function editMark(mk, isNew) {
    var color = mk.color;
    var back = sheet("<h2>" + (isNew ? "Mark this part of the page" : "Mark") + "</h2>" +
      '<p class="nt-quote">' + esc(mk.where) + ", p. " + mk.p + "</p>" + dotsHtml(color) +
      '<textarea aria-label="Note" placeholder="Add a note (optional)">' + esc(mk.note || "") + "</textarea>" +
      '<div class="nt-btns">' + (isNew ? "" : '<button type="button" class="danger" data-x="del">Remove</button>') +
      '<button type="button" data-x="cancel">Cancel</button><button type="button" class="primary" data-x="save">' + (isNew ? "Mark" : "Save") + "</button></div>");
    wireDots(back, function (c) { color = c; });
    back.querySelector('[data-x="cancel"]').addEventListener("click", function () { back.remove(); });
    var del = back.querySelector('[data-x="del"]');
    if (del) del.addEventListener("click", function () {
      notes.marks = notes.marks.filter(function (x) { return x.id !== mk.id; }); saveNotes(); back.remove(); paintMarks(); toast("Mark removed");
    });
    back.querySelector('[data-x="save"]').addEventListener("click", function () {
      mk.color = color; mk.note = back.querySelector("textarea").value.trim();
      if (isNew) notes.marks.push(mk);
      saveNotes(); back.remove(); paintMarks(); if (isNew) toast("Marked. Tap the mark to change or remove it.");
    });
  }

  // ---- The ✎ button: mark a page, or the sheet for backing up and exporting ----
  var fabEl = document.createElement("button"), menuEl = null;
  fabEl.type = "button"; fabEl.className = "mk-fab"; fabEl.textContent = "✎"; fabEl.title = "Highlights, notes and marks";
  fabEl.setAttribute("aria-label", "Highlights, notes and marks"); fabEl.setAttribute("aria-expanded", "false"); fabEl.hidden = true;
  document.body.appendChild(fabEl);
  fabEl.addEventListener("click", function () { menu(!menuEl); });
  function fab() { fabEl.hidden = $("#pdf-view").hidden && $("#lect").hidden && !notes.hls.length && !notes.marks.length; }
  function menu(open) {
    if (menuEl) { menuEl.remove(); menuEl = null; }
    fabEl.setAttribute("aria-expanded", String(!!open));
    if (!open) return;
    menuEl = document.createElement("div"); menuEl.className = "mk-menu";
    var items = [];
    if (!$("#pdf-view").hidden && document.querySelector("#pdf-pages .pg")) items.push(["Mark part of a page", startMarking]);
    if (!$("#lect").hidden) items.push(["Highlight in a reading: select the words", function () { menu(false); toast("Select some words in a reading, then choose a colour."); }]);
    items.push(["Back up and export…", function () { menu(false); backupSheet(); }]);
    items.forEach(function (it) { var b = document.createElement("button"); b.type = "button"; b.textContent = it[0]; b.addEventListener("click", it[1]); menuEl.appendChild(b); });
    document.body.appendChild(menuEl);
    menuEl.querySelector("button").focus();
  }
  document.addEventListener("pointerdown", function (e) { if (menuEl && !menuEl.contains(e.target) && e.target !== fabEl) menu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { menu(false); hidePop(); if (marking) stopMarking(); var b = $(".nt-back"); if (b) b.remove(); } });

  // ---- Back up, restore, and a readable copy ----
  function fileDate() { return IN.ymd(new Date()); }
  function giveFile(name, type, text) {
    var file = new File([text], name, { type: type });
    var download = function () {
      var a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    };
    if (navigator.canShare && navigator.canShare({ files: [file] }))
      return navigator.share({ files: [file], title: name }).catch(function (e) { if (e.name !== "AbortError") download(); });
    download();
  }
  function backupText() {
    return JSON.stringify({ app: "psalter", kind: "notes", version: 1, saved: new Date().toISOString(), data: { hls: notes.hls, marks: notes.marks } }, null, 1);
  }
  function mergeBackup(d) {   // adds what the file has and this browser lacks; nothing here is changed or removed
    var n = { hls: 0, marks: 0 };
    ["hls", "marks"].forEach(function (k) {
      if (!Array.isArray(d[k])) return;
      var have = {}; notes[k].forEach(function (x) { have[x.id] = 1; });
      d[k].forEach(function (x) { if (x && x.id && !have[x.id] && (k === "hls" ? typeof x.t === "string" : typeof x.src === "string")) { notes[k].push(x); n[k]++; } });
    });
    saveNotes();
    return n;
  }
  function backupSheet() {
    var nh = notes.hls.length, nm = notes.marks.length;
    var back = sheet("<h2>Highlights, notes and marks</h2>" +
      "<p>They are kept only in this browser: nobody else sees them, and they are lost if this browser's data is cleared. Keep a copy somewhere safe (on a phone, choose Save to Files).</p>" +
      "<p>Here now: " + nh + " highlight" + (nh === 1 ? "" : "s") + " in the readings, " + nm + " mark" + (nm === 1 ? "" : "s") + " on the pages.</p>" +
      '<div class="nt-row"><button type="button" data-x="save">Back up</button><span>a file this page can read back in, here or in another browser</span></div>' +
      '<div class="nt-row"><button type="button" data-x="restore">Restore…</button><span>adds what a backup holds; nothing here is removed</span></div>' +
      '<div class="nt-row"><button type="button" data-x="export" disabled>Readable copy</button><span>a page to read or print: the highlighted words with their notes, and each mark with its part of the page</span></div>' +
      '<p class="nt-msg" hidden></p><div class="nt-btns"><button type="button" data-x="close">Close</button></div>' +
      '<input type="file" accept=".json,application/json" hidden>');
    var q = function (s) { return back.querySelector(s); }, say = function (t) { var m = q(".nt-msg"); m.textContent = t; m.hidden = false; };
    q('[data-x="close"]').addEventListener("click", function () { back.remove(); });
    q('[data-x="save"]').addEventListener("click", function () { giveFile("psalter-notes-" + fileDate() + ".json", "application/json", backupText()); });
    q('[data-x="restore"]').addEventListener("click", function () { var f = q("input[type=file]"); f.value = ""; f.click(); });
    q("input[type=file]").addEventListener("change", function () {
      var f = this.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onerror = function () { say("Couldn't read that file."); };
      rd.onload = function () {
        var p; try { p = JSON.parse(rd.result); } catch (x) { return say("That isn't a backup of the psalter's notes."); }
        if (!p || p.app !== "psalter" || p.kind !== "notes" || !p.data) return say("That isn't a backup of the psalter's notes.");
        var n = mergeBackup(p.data);
        back.remove(); toast("Added " + n.hls + " highlight" + (n.hls === 1 ? "" : "s") + " and " + n.marks + " mark" + (n.marks === 1 ? "" : "s"));
        if (shown) draw(); paintMarks();
      };
      rd.readAsText(f);
    });
    // The readable copy needs the readings and the pages the notes point into: get them first, so the file can be
    // handed over straight from the tap (phones require that)
    readableExport().then(function (html) {
      var b = q('[data-x="export"]'); if (!b) return;
      b.disabled = false;
      b.addEventListener("click", function () { giveFile("psalter-notes-" + fileDate() + ".html", "text/html", html); });
    }, function () { say("The readable copy needs the password and a connection. The backup works without them."); });
  }
  function cropOf(mk, idx, key) {   // the marked part of the page, as a small picture
    if (!idx.pdfs[mk.src]) return Promise.resolve(null);
    return IN.getDoc(mk.src, idx, key).then(function (doc) { return doc.getPage(mk.pg + 1); }).then(function (page) {
      var v1 = page.getViewport({ scale: 1 }), scale = Math.min(3, Math.max(.6, 700 / (mk.w * v1.width))), vp = page.getViewport({ scale: scale });
      var cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(mk.w * vp.width)); cv.height = Math.max(1, Math.round(mk.h * vp.height));
      var ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
      return page.render({ canvasContext: ctx, viewport: vp, transform: [1, 0, 0, 1, -mk.x * vp.width, -mk.y * vp.height] }).promise.then(function () { return cv.toDataURL("image/jpeg", .82); });
    }).catch(function () { return null; });
  }
  function readableExport() {
    return IN.index().then(function (idx) {
      var keyP = IN.key(); if (!keyP) throw new Error("locked");
      return keyP.then(function (key) {
        var ks = []; notes.hls.forEach(function (h) { if (ks.indexOf(h.k) < 0 && idx.lect && idx.lect[h.k]) ks.push(h.k); });
        var marks = notes.marks.slice().sort(function (a, b) { return a.where < b.where ? -1 : a.where > b.where ? 1 : a.p - b.p || a.y - b.y; });
        var dayP = Promise.all(ks.map(function (k) { return loadDay(idx, key, k).catch(function () { return null; }); }));
        var cropP = marks.reduce(function (c, mk) { return c.then(function (out) { return cropOf(mk, idx, key).then(function (u) { out.push(u); return out; }); }); }, Promise.resolve([]));
        return Promise.all([dayP, cropP]).then(function (r) { var byK = {}; ks.forEach(function (k, i) { byK[k] = r[0][i]; }); return page(byK, marks, r[1]); });
      });
    });
  }
  function context(h, data) {   // the sentence(s) the highlight touches, the words marked
    var es = data && data.years[h.year] && data.years[h.year][h.kind] || [], e = es.filter(function (x) { return rid(x) === h.rid; })[0];
    var text = e && e.paras[h.i] ? plain(e.paras[h.i]) : "";
    var a = text.slice(h.s, h.e) === h.t ? h.s : text.indexOf(h.t), z = a + h.t.length;
    if (!text || a < 0) return '<mark class="' + h.color + '">' + esc(h.t) + "</mark>";
    var from = Math.max(0, text.lastIndexOf(". ", a - 1) + 2 * (text.lastIndexOf(". ", a - 1) >= 0)), stop = text.indexOf(". ", z - 1), to = stop >= 0 ? stop + 1 : text.length;
    return (from > 0 ? "… " : "") + esc(text.slice(from, a)) + '<mark class="' + h.color + '">' + esc(text.slice(a, z)) + "</mark>" + esc(text.slice(z, to)) + (to < text.length ? " …" : "");
  }
  function page(byK, marks, crops) {
    var groups = [], byG = {};
    notes.hls.slice().sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.i - b.i || a.s - b.s); })
      .forEach(function (h) { var g = h.g || h.id; if (!byG[g]) { byG[g] = { h: h, items: [] }; groups.push(byG[g]); } byG[g].items.push(h); });
    var body = "";
    if (groups.length) {
      body += "<h2>In the readings</h2>";
      groups.forEach(function (g) {
        var h = g.h;
        body += '<div class="item"><div class="cite">' + esc(h.name + " · Year " + h.year + " · " + h.kind + " reading") + '</div><div class="head">' + esc(h.heading || "") + "</div>" +
          '<p class="text">' + g.items.map(function (x) { return context(x, byK[x.k]); }).join(" ") + "</p>" +
          (h.note ? '<p class="note"><span>Note</span>' + esc(h.note) + "</p>" : "") + "</div>";
      });
    }
    if (marks.length) {
      body += "<h2>On the book's pages</h2>";
      marks.forEach(function (mk, i) {
        body += '<div class="item"><div class="cite">' + esc(mk.where + ", p. " + mk.p) + "</div>" +
          (crops[i] ? '<img class="crop ' + mk.color + '" alt="The marked part of p. ' + mk.p + '" src="' + crops[i] + '">' : '<p class="text"><i>(the picture of this part of the page could not be made)</i></p>') +
          (mk.note ? '<p class="note"><span>Note</span>' + esc(mk.note) + "</p>" : "") + "</div>";
      });
    }
    if (!body) body = "<p><i>No highlights or marks yet.</i></p>";
    var when = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      "<title>Monastic Psalter · Highlights, notes and marks</title><style>" +
      'body{font-family:"EB Garamond",Georgia,"Times New Roman",serif;max-width:40rem;margin:2rem auto;padding:0 1.2rem;color:#2b241d;background:#fbf8f2;line-height:1.6}' +
      "h1{font-weight:normal;letter-spacing:.06em;text-align:center;margin-bottom:.2rem}.sub{text-align:center;color:#6a5f52;font-style:italic;margin-top:0}" +
      "h2{font-weight:normal;font-variant:small-caps;letter-spacing:.1em;color:#9b1c1c;border-bottom:1px solid #d6cab4;padding-bottom:.2rem;margin-top:2.2rem}" +
      ".item{margin:0 0 1.4rem;page-break-inside:avoid}.cite{font-variant:small-caps;letter-spacing:.06em;color:#8a6d1e}.head{font-size:.9rem;letter-spacing:.04em;color:#6a5f52}" +
      ".text{margin:.25rem 0}.note{margin:.35rem 0 0 .9rem;padding-left:.7rem;border-left:3px solid #d6cab4;font-style:italic;color:#4a3f2e;white-space:pre-wrap}" +
      ".note span{font-style:normal;font-variant:small-caps;letter-spacing:.1em;color:#6a5f52;margin-right:.5rem}" +
      "mark{padding:0 .1em;border-radius:.15em;color:inherit}mark.gold{background:#f0dc9a}mark.rose{background:#f0c3bd}mark.sage{background:#cfdcb4}mark.sky{background:#c2d7e8}" +
      "img.crop{display:block;max-width:100%;margin:.4rem 0;border:4px solid #f0dc9a;border-radius:4px}img.crop.rose{border-color:#f0c3bd}img.crop.sage{border-color:#cfdcb4}img.crop.sky{border-color:#c2d7e8}" +
      ".foot{margin-top:2.5rem;font-size:.85rem;color:#6a5f52;font-style:italic;text-align:center}" +
      '</style></head><body><h1>✠ Monastic Psalter</h1><p class="sub">Highlights, notes and marks · ' + esc(when) + "</p>" + body +
      '<p class="foot">From the community\'s psalter and lectionary at Saint Bernard Abbey: for your own use; please don\'t share it outside the community.</p></body></html>';
  }

  window.LECT = { update: function () { update(); fab(); }, pages: paintMarks, _test: { seasonKey: seasonKey, dayKey: dayKey, cycleYear: cycleYear, sundayCycle: sundayCycle, notes: function () { return notes; } } };
  update(); fab();
})();
