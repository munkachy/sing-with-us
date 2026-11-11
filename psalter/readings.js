/* Matins readings, and each monk's own highlights, notes and page marks.
   The readings are the Two-Year Lectionary the abbey reads at Matins (a Biblical and a Patristic reading for
   each day, Year I and Year II, and the feasts), sealed in the vault like the book (vault/index.json "lect":
   one file per day key, built by the private psalter repo's lectionary/tools/vault.py).
   Highlights (select words: they turn yellow; tap one to remove it) are kept only in this browser (localStorage): nobody
   else sees them, and there is no backup. In the readings and in the set text of the hours. */
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
  // The abbey usually keeps the Ascension on the Sunday after (the Seventh Sunday of Easter); "thursday" keeps it
  // on its own day, and that Sunday then has no readings of its own in the files.
  var ASCENSION_ON = "sunday";
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
    if (S(d, A(e, ASCENSION_ON === "sunday" ? 42 : 39))) return "ascension";
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
    var box = $("#lect"), my = token = {};
    if (!IN.matins()) { box.hidden = true; shown = null; return; }
    var d = IN.dayDate();
    if (shown && IN.ymd(shown.d) !== IN.ymd(d)) shown = null;   // another day: no old readings in the new pages' slots
    IN.index().then(function (idx) {
      if (token !== my) return;
      var lect = idx.lect || {}, k = dayKey(d, lect);
      if (!lect[k]) { box.hidden = true; shown = null; return; }   // no readings for this day
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
  // Each reading goes in its place among the pages ("First Reading", "Second Reading": app.js leaves a slot for it),
  // or, where the pages have no slots (the book's own pages, a feast), both go in the box after the pages.
  function el2(tag, cls, text) { var e = document.createElement(tag); e.className = cls; e.textContent = text; return e; }
  function slotFor(kind) { return document.querySelector('#pdf-pages .lect-slot[data-kind="' + kind + '"]'); }
  function draw() {
    var box = $("#lect"), first = entriesOf("Biblical")[0] || entriesOf("Patristic")[0];
    box.innerHTML = "";
    document.querySelectorAll("#pdf-pages .lect-slot").forEach(function (sl) { sl.innerHTML = ""; });
    var inSlots = !!(slotFor("Biblical") || slotFor("Patristic"));
    if (!first) { box.hidden = true; return; }
    var head = document.createElement("p"); head.className = "lect-day";
    head.textContent = "Matins readings · " + dayName(first.title) + " · Year " + shown.year;
    (inSlots ? slotFor("Biblical") || slotFor("Patristic") : box).appendChild(head);
    ["Biblical", "Patristic"].forEach(function (kind) {
      var es = entriesOf(kind), host = inSlots ? slotFor(kind) : box;
      if (!es.length || !host) return;
      var at = chosen(kind), e = es[at];
      var art = document.createElement("article"); art.className = "lect-r"; art.dataset.kind = kind; art.dataset.rid = rid(e);
      var lab = document.createElement("p"); lab.className = "lect-kind"; lab.textContent = kind === "Biblical" ? "Biblical reading" : "Patristic reading";
      if (!inSlots || host.dataset.label) art.appendChild(lab);   // among the weekly pages the book's own heading says which reading it is (not in a feast)
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
      if (inSlots && host.dataset.swapped) {   // Friday of Week II: the book prints the two headings the other way round
        art.appendChild(el2("p", "lect-swap", kind === "Biblical" ? "The book prints “Second Reading” above this by mistake: the Biblical reading is read first."
                                                                : "The book prints “First Reading” above this by mistake: the Patristic reading is read second."));
      }
      var h = document.createElement("h3"); h.textContent = (e.heading || "").toUpperCase(); art.appendChild(h);
      var tx = document.createElement("div"); tx.className = "lect-text";
      e.paras.forEach(function (segs, i) { var p = document.createElement("p"); p.dataset.i = i; fillPara(p, segs, hlsIn(e, kind, i)); tx.appendChild(p); });
      art.appendChild(tx);
      if (e.cite) { var c = document.createElement("p"); c.className = "lect-cite"; c.textContent = e.cite; art.appendChild(c); }
      host.appendChild(art);
    });
    box.hidden = inSlots;
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

  // ---- Highlights: select words and they turn yellow, kept on this phone (Nov 2026: simplified) ----
  // In a reading (kept by reading and paragraph) and in the set text of the hours (Text and Text with notation: kept by
  // book file and page, as a quotation with the words around it, so it is found again wherever the page is shown).
  // Tap a highlight to remove it. Nothing is sent anywhere, and there is no backup.
  function offsetsWithin(el, range) {   // the selection's characters within one element (as Lumina does it)
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
  var HL_KEY = "psalter-hl", txhl = [];
  try { var hj = JSON.parse(localStorage.getItem(HL_KEY) || "[]"); if (Array.isArray(hj)) txhl = hj; } catch (x) {}
  function saveTx() { try { localStorage.setItem(HL_KEY, JSON.stringify(txhl)); return true; } catch (x) { toast("This browser would not keep it (private window, or storage full)."); return false; } }
  function stripKey(el) { return el.dataset.src + "#" + el.dataset.pg; }
  // where a saved quotation is in a strip's text: the occurrence with the most of its surrounding words matching
  function locate(text, h) {
    var best = -1, score = -1, at = text.indexOf(h.t);
    while (at >= 0) {
      var sc = 0, i = 0;
      while (i < h.pre.length && text[at - 1 - i] === h.pre[h.pre.length - 1 - i]) i++;
      sc += i; i = 0;
      while (i < h.post.length && text[at + h.t.length + i] === h.post[i]) i++;
      sc += i;
      if (sc > score) { score = sc; best = at; }
      at = text.indexOf(h.t, at + 1);
    }
    return best;
  }
  function unwrap(strip) {
    strip.querySelectorAll("mark.tx-hl").forEach(function (m) { var par = m.parentNode; while (m.firstChild) par.insertBefore(m.firstChild, m); par.removeChild(m); });
    strip.normalize();
  }
  function wrap(strip, s, e, id) {
    var parts = [], pos = 0, w = document.createTreeWalker(strip, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var len = n.textContent.length, a = Math.max(s, pos), z = Math.min(e, pos + len);
      if (z > a && n.textContent.slice(a - pos, z - pos).trim()) parts.push([n, a - pos, z - pos]);
      pos += len;
    }
    parts.forEach(function (x) {
      var node = x[0], mid = x[1] > 0 ? node.splitText(x[1]) : node;
      if (x[2] - x[1] < mid.textContent.length) mid.splitText(x[2] - x[1]);
      var m = document.createElement("mark"); m.className = "hl gold tx-hl"; m.dataset.tx = id;
      mid.parentNode.insertBefore(m, mid); m.appendChild(mid);
    });
  }
  function paintStrip(strip) {
    unwrap(strip);
    var key = stripKey(strip), text = strip.textContent;
    txhl.forEach(function (h) { if (h.k !== key) return; var at = locate(text, h); if (at >= 0) wrap(strip, at, at + h.t.length, h.id); });
  }
  function paintAll() { document.querySelectorAll("#pdf-pages .tx-strip").forEach(paintStrip); }
  var paintT = null;
  var pdfBox = $("#pdf-pages");
  if (pdfBox && window.MutationObserver) new MutationObserver(function () { cancelAnimationFrame(paintT); paintT = requestAnimationFrame(paintAll); }).observe(pdfBox, { childList: true });

  // A selection becomes a yellow highlight by itself once the finger or mouse lets go and the selection has stopped
  // moving (no box to compete with the phone's own menu). Words already highlighted are left as they are.
  var touching = false, selT = null;
  addEventListener("touchstart", function () { touching = true; }, { passive: true });
  addEventListener("touchend", function () { touching = false; armSel(); }, { passive: true });
  addEventListener("mouseup", function () { armSel(); });
  document.addEventListener("selectionchange", function () { armSel(); });
  function armSel() { clearTimeout(selT); selT = setTimeout(autoHighlight, 900); }
  function autoHighlight() {
    if (touching) return;
    var sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    var range = sel.getRangeAt(0), did = false;
    // the readings
    if (shown) {
      var touched = [];
      document.querySelectorAll(".lect-r").forEach(function (art) {
        var kind = art.dataset.kind, e = entriesOf(kind)[chosen(kind)];
        art.querySelectorAll(".lect-text p").forEach(function (p) {
          if (!range.intersectsNode(p)) return;
          var off = offsetsWithin(p, range);
          if (off) touched.push({ kind: kind, e: e, i: +p.dataset.i, s: off.s, e2: off.e, t: p.textContent.slice(off.s, off.e) });
        });
      });
      var fresh = touched.filter(function (t) { return t.t.trim() && !hlsIn(t.e, t.kind, t.i).some(function (r) { return t.s < r.e && t.e2 > r.s; }); });
      if (fresh.length) {
        var g = uid();
        fresh.forEach(function (t) {
          notes.hls.push({ id: uid(), g: g, k: shown.k, year: shown.year, kind: t.kind, rid: rid(t.e), i: t.i, s: t.s, e: t.e2, t: t.t,
            color: "gold", note: "", day: IN.ymd(shown.d), name: dayName(t.e.title), heading: t.e.heading, added: Date.now() });
        });
        saveNotes(); draw(); did = true;
      }
    }
    // the set text of the hours
    var added = false;
    document.querySelectorAll("#pdf-pages .tx-strip").forEach(function (strip) {
      if (!range.intersectsNode(strip)) return;
      var off = offsetsWithin(strip, range); if (!off) return;
      var text = strip.textContent, t = text.slice(off.s, off.e), key = stripKey(strip);
      if (!t.trim()) return;
      var over = txhl.some(function (h) { if (h.k !== key) return false; var at = locate(text, h); return at >= 0 && off.s < at + h.t.length && off.e > at; });
      if (over) return;
      txhl.push({ id: uid(), k: key, t: t, pre: text.slice(Math.max(0, off.s - 30), off.s), post: text.slice(off.e, off.e + 30), added: Date.now() });
      added = true;
    });
    if (added && saveTx()) { paintAll(); did = true; }
    if (did) { sel.removeAllRanges(); toast("Highlighted. Tap it to remove it."); }
  }
  // Tap a highlight to remove it
  function askRemove(remove) {
    var back = sheet("<h2>Highlight</h2><p>Remove this highlight?</p>" +
      '<div class="nt-btns"><button type="button" data-x="cancel">Keep</button><button type="button" class="primary" data-x="del">Remove</button></div>');
    back.querySelector('[data-x="cancel"]').addEventListener("click", function () { back.remove(); });
    back.querySelector('[data-x="del"]').addEventListener("click", function () { remove(); back.remove(); toast("Highlight removed"); });
  }
  document.addEventListener("click", function (e) {
    var m = e.target.closest && e.target.closest("mark.hl");
    if (!m) return;
    var sel = getSelection(); if (sel && !sel.isCollapsed) return;
    if (m.dataset.tx) askRemove(function () { txhl = txhl.filter(function (x) { return x.id !== m.dataset.tx; }); saveTx(); paintAll(); });
    else {
      var h = notes.hls.filter(function (x) { return x.id === m.dataset.hl; })[0];
      if (!h) return;
      var ids = notes.hls.filter(function (x) { return h.g ? x.g === h.g : x.id === h.id; }).map(function (x) { return x.id; });
      askRemove(function () { notes.hls = notes.hls.filter(function (x) { return ids.indexOf(x.id) < 0; }); saveNotes(); draw(); });
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { var b = $(".nt-back"); if (b) b.remove(); } });

  window.LECT = { update: function () { update(); }, pages: function () { paintAll(); if (shown && IN.matins()) draw(); }, _test: { seasonKey: seasonKey, dayKey: dayKey, cycleYear: cycleYear, sundayCycle: sundayCycle, notes: function () { return notes; } } };
  update();
})();
