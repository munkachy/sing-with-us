/* Monastic Psalter for the monks of Saint Bernard Abbey.
   Every file of the book on this site is sealed (AES-GCM). It opens only on a phone that
   has the community password; to anyone else it is unreadable. The files are built from the
   private psalter repo (beta/build.py). PDFs are drawn here with PDF.js.
   Week rule (Br. Augustine): the four-week count starts fresh at Week I after
   Christmastide and again at Easter. Advent-Christmastide and Lent use their
   own volumes. */
(function () {
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var ROMAN = ["I", "II", "III", "IV"];
  var HOURS = ["Matins", "Lauds", "Sext", "Vespers", "Compline"];
  var DAY_MS = 864e5;

  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function daysBetween(a, b) { return Math.round((midnight(b) - midnight(a)) / DAY_MS); }

  function easter(y) {            // Gregorian computus (Meeus/Jones/Butcher)
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function firstAdventSunday(y) {
    var xmas = new Date(y, 11, 25), back = xmas.getDay() || 7;
    return addDays(xmas, -back - 21);
  }
  // U.S. calendar (as in the Congregation's ordo): Epiphany is the Sunday from 2 to 8 January; the Baptism
  // of the Lord is the next Sunday, or the Monday after Epiphany when Epiphany falls on 7 or 8 January.
  function epiphany(y) { var jan2 = new Date(y, 0, 2); return addDays(jan2, (7 - jan2.getDay()) % 7); }
  function endOfChristmastide(y) {
    var ep = epiphany(y);
    return addDays(ep, ep.getDate() >= 7 ? 1 : 7);
  }

  // What the calendar says for a date: which volume, and which psalter week.
  function calendar(date) {
    var y = date.getFullYear(), d = midnight(date);
    var base = endOfChristmastide(y), e = easter(y), ash = addDays(e, -46);
    var weekFrom = function (start) { return Math.floor(daysBetween(start, d) / 7) % 4; };
    if (d >= firstAdventSunday(y)) return { volume: "Advent-Christmas", week: 0 };
    if (d <= base) return { volume: "Advent-Christmas", week: 0 };
    if (d >= ash && d < e) return { volume: "Lent", week: weekFrom(base) };
    if (d >= e) return { volume: null, week: weekFrom(e) };
    return { volume: null, week: weekFrom(base) };
  }

  // The abbey's horarium (stbernardabbey.com, October 2026), in minutes after midnight:
  // Matins, Lauds (after Matins), Sext, Vespers, Compline. An hour stays up while it is being prayed
  // (LAST minutes after it starts); then the page moves on to the next one.
  var HORARIUM = { 0: [420, 465, 600, 1050, 1155], 6: [360, 405, 645, 1050, 1155], weekday: [360, 405, 715, 1050, 1155] };
  var LAST = [45, 30, 20, 35, 25];
  function nextHour(date) {   // { day (0-6), hour (0-4) }: the hour being prayed now, or the next one
    var t = date.getHours() * 60 + date.getMinutes(), wd = date.getDay(), times = HORARIUM[wd] || HORARIUM.weekday;
    for (var i = 0; i < 5; i++) if (t < times[i] + LAST[i]) return { day: wd, hour: i };
    return wd === 6 ? { day: 6, hour: 4 } : { day: wd + 1, hour: 0 };   // after Compline: tomorrow's Matins (not past Saturday)
  }
  function hourFor(date) { return nextHour(date).hour; }

  function fileKey(week, day, hour) {
    var dayDir = (day + 1) + " " + DAYS[day];
    if (hour <= 2) return "Week " + ROMAN[week] + "/" + dayDir + "/" + (hour + 1) + " " + HOURS[hour] + ".pdf";
    if (hour === 3) return "Vespers (same every week)/" + (day + 1) + " " + DAYS[day] + " at Vespers.pdf";
    return "Compline (every night).pdf";
  }

  // The week the monk picks is an anchor: it moves on by itself every Sunday.
  function sundayOf(d) { return addDays(midnight(d), -d.getDay()); }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function weekOverride(now) {
    var o = store("psalter-anchor");
    if (!o || typeof o.week !== "number" || !o.sunday) return null;
    var weeks = Math.floor(daysBetween(new Date(o.sunday), sundayOf(now)) / 7);
    return (((o.week + weeks) % 4) + 4) % 4;
  }

  // ---- The seasonal books (Advent-Christmas, Lent, Sanctoral): sections and their calendar tags (books.json) ----
  var ROMANS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII",
    "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI", "XXXII", "XXXIII", "XXXIV"];
  // Which tags fit a date, best first. Also the weekday or Sunday to look for among a section's hours.
  function tagsFor(date) {
    var d = midnight(date), y = d.getFullYear(), m = d.getMonth(), dd = d.getDate(), wd = d.getDay();
    var e = easter(y), adv = firstAdventSunday(y), bapt = endOfChristmastide(y), ash = addDays(e, -46);
    var mmdd = String(m + 1).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
    var tags = [], day = DAYS[wd];
    var dated = "d:" + mmdd;
    if (d >= adv && d < new Date(y, 11, 25)) {
      var n = Math.floor(daysBetween(adv, d) / 7) + 1;
      if (wd === 0) tags.push("adv:" + n, dated); else tags.push(dated, "advw:" + n);
    } else tags.push(dated);
    var hf = new Date(y, 11, 26 + ((7 - new Date(y, 11, 26).getDay()) % 7));   // the Sunday after Christmas
    if (same(d, hf.getMonth() === 11 ? hf : new Date(y, 11, 30))) tags.unshift("xmas:holyfamily");
    var ep = epiphany(y);
    if (m === 0 && dd >= 2 && d < ep) tags.unshift("xmas:before-epiphany");
    if (d > ep && d < bapt) tags.unshift("xmas:after-epiphany");
    if (same(d, ep)) tags.unshift("xmas:epiphany");
    if (same(d, bapt)) tags.unshift("xmas:baptism");
    tags.push({ e: daysBetween(e, d) });
    var ck = addDays(adv, -7);
    if (same(d, ck)) tags.unshift("ck");
    var ot = null;
    if (d > bapt && d < ash) ot = { early: true, n: Math.floor(daysBetween(bapt, sundayOf(d)) / 7) + 1 };
    else if (d > addDays(e, 49) && d < ck) ot = { early: false, n: 34 - Math.round(daysBetween(sundayOf(d), ck) / 7) };
    if (ot && wd === 0) { tags.push(ot); day = "Sunday " + ROMANS[ot.n]; }   // weekdays through the year: the psalter alone
    return { tags: tags, day: day };
  }
  function tagFits(tag, t) {
    return tag.split(" ").some(function (one) {
      if (typeof t === "string") return one === t;
      var m;
      if ("e" in t && (m = one.match(/^e:(-?\d+)(?:-(-?\d+))?$/))) return t.e >= +m[1] && t.e <= +(m[2] === undefined ? m[1] : m[2]);
      if ("n" in t && (m = one.match(/^ot:(\d+)-(\d+)$/))) return t.n >= +m[1] && t.n <= +m[2] && (+m[1] < 6) === t.early;
      return false;
    });
  }
  // Today's section in one book, or -1
  function todayIn(book, date) {
    var secs = books[book].sections, ft = tagsFor(date);
    for (var i = 0; i < ft.tags.length; i++)
      for (var k = 0; k < secs.length; k++) if (secs[k].tag && tagFits(secs[k].tag, ft.tags[i])) return k;
    return -1;
  }
  // The best hour to open in a section: the right day if the section has several, then the hour by the clock
  function jumpFor(sec, date) {
    var day = tagsFor(date).day, j = sec.jumps;
    var mine = j.filter(function (x) { return x[0].indexOf(day + " · ") === 0; });
    if (!mine.length) mine = j.filter(function (x) { return x[0].indexOf(" · ") < 0; });
    if (!mine.length) return -1;
    var want = [["Matins"], ["Lauds"], ["Sext"], ["II Vespers", "Vespers", "I Vespers"], ["II Vespers", "Vespers", "I Vespers"]][hourFor(date)];
    for (var w = 0; w < want.length; w++)
      for (var i = 0; i < mine.length; i++) if (mine[i][0].replace(/^.* · /, "").replace(/ \(\d\)$/, "") === want[w]) return j.indexOf(mine[i]);
    return j.indexOf(mine[0]);
  }

  var now = new Date();
  // Another day can be opened from the calendar (psalter/#date=YYYY-MM-DD): the page then shows that day's week
  // (from the ordo), starting at Matins, with a link back to today.
  var base = midnight(now), hm = location.hash.match(/date=(\d{4})-(\d{2})-(\d{2})/);
  if (hm) base = new Date(+hm[1], +hm[2] - 1, +hm[3]);
  var viewing = daysBetween(midnight(now), base) !== 0, weekTouched = false;
  window.addEventListener("hashchange", function () { location.reload(); });
  var cal = calendar(viewing ? base : now);
  var books = null;
  var first = viewing ? { day: base.getDay(), hour: 0 } : nextHour(now);
  var state = { week: cal.week, day: first.day, hour: first.hour, autoWeek: true, ref: null, book: "psalter", sec: {}, today: true };
  var touched = false;   // once the monk taps anything, the page stops choosing for him
  var saved = weekOverride(now);
  if (saved !== null) { state.week = saved; state.autoWeek = false; }

  var $ = function (s) { return document.querySelector(s); };

  // ---- The vault: sealed files, one password for all of them ----
  var vault = { idx: null, key: null, cache: {}, token: null };
  var betaOn = false;   // the typed Beta hours stay in the vault, unused for now (Br. Augustine: the book pages are enough)
  function bytes(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function b64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }
  function index() {
    if (!vault.idxP) vault.idxP = fetch("vault/index.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("fetch"); return r.json(); })
      .then(function (idx) { vault.idx = idx; return idx; }, function (e) { vault.idxP = null; throw e; });
    return vault.idxP;
  }
  function importRaw(raw) { return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]); }
  function savedKey() {   // the key itself is kept on the phone, so the slow step runs only once
    var k = store("psalter-key");
    if (k && k.salt === vault.idx.salt) return importRaw(bytes(k.raw));
    return null;
  }
  function deriveKey(pw) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]).then(function (base) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", salt: bytes(vault.idx.salt), iterations: vault.idx.iter, hash: "SHA-256" }, base, 256);
    }).then(function (raw) { return importRaw(raw).then(function (key) { key._raw = raw; return key; }); });
  }
  function open(file, key) {
    if (vault.cache[file]) return Promise.resolve(vault.cache[file]);
    return fetch("vault/" + file).then(function (r) { if (!r.ok) throw new Error("fetch"); return r.arrayBuffer(); }).then(function (buf) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(buf, 0, 12) }, key, new Uint8Array(buf, 12));
    }).then(function (plain) { vault.cache[file] = plain; return plain; });
  }

  // ---- PDF.js, loaded only when a PDF is shown ----
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  var pdfjsP = null;
  function pdfjs() {
    if (!pdfjsP) pdfjsP = new Promise(function (ok, fail) {
      var sc = document.createElement("script"); sc.src = PDFJS + "pdf.min.js";
      sc.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; ok(window.pdfjsLib); };
      sc.onerror = function () { pdfjsP = null; fail(new Error("fetch")); };
      document.head.appendChild(sc);
    });
    return pdfjsP;
  }
  // Pages are laid out at full size at once, but drawn only near where the monk is reading,
  // and let go again when far away: a long section (80 pages) would not fit in a phone's memory.
  var pager = null;
  function pageBox_(cv, path, pg, f0, f1, strip) {   // a page (or a strip of one) in a box: the marks are drawn over it
    var b = document.createElement("div"); b.className = "pg" + (strip ? " pg-strip" : "");
    b.dataset.src = path; b.dataset.pg = pg; b.dataset.f0 = f0; b.dataset.f1 = f1;
    b.appendChild(cv); return b;
  }
  function drawPdf(data, token, path) {
    var box = $("#pdf-pages"); box.innerHTML = "";
    if (pager) pager.stop();
    var TX = window.PTEXT;
    return (TX ? TX.load([path], vault.idx, vault.key, open) : Promise.resolve()).then(function () {
      return pdfjs();
    }).then(function (lib) { return lib.getDocument({ data: new Uint8Array(data.slice(0)) }).promise; }).then(function (doc) {
      var width = (box.clientWidth || window.innerWidth) * bookZoom();
      var ratio = Math.min(window.devicePixelRatio || 1, 2.5, 2000 / width);
      var pages = [];
      for (var n = 1; n <= doc.numPages; n++) pages.push(doc.getPage(n));
      return Promise.all(pages).then(function (pages) {
        if (vault.token !== token) return;
        if (TX && TX.on() && pages.every(function (p, i) { return TX.has(path, i); })) {      // the whole file as set text (text.js)
          var jobs = []; TX.begin();
          pages.forEach(function (page, i) {
            var sec = TX.strip(path, i, 0, 1); box.appendChild(sec);
            sec.querySelectorAll(".tx-chant-img").forEach(function (fig) { jobs.push(cropJob(pages[+fig.dataset.pg] || page, fig, width, ratio)); });
          });
          textNote(true, 0);
          if (window.LECT) LECT.pages();
          if (window.PROPER) PROPER.pages();
          goJump(); pageLabel();
          return jobs.reduce(function (c, j) { return c.then(function () { if (vault.token === token) return j(); }); }, Promise.resolve());
        }
        textNote(TX && TX.on(), TX && TX.on() ? 1 : 0);
        var items = pages.map(function (page, i) {
          var vp = page.getViewport({ scale: width * ratio / page.getViewport({ scale: 1 }).width });
          var cv = document.createElement("canvas");
          cv.style.aspectRatio = Math.floor(vp.width) + " / " + Math.floor(vp.height);
          cv.setAttribute("aria-label", "Page " + (i + 1)); box.appendChild(pageBox_(cv, path, i, 0, 1));
          return { page: page, vp: vp, cv: cv, drawn: false };
        });
        var busy = false, stopped = false;
        function dist(it) {   // how far a page is from the screen, in screen heights
          var r = it.cv.getBoundingClientRect(), h = window.innerHeight;
          return r.bottom < 0 ? -r.bottom / h : r.top > h ? (r.top - h) / h : 0;
        }
        function next() {
          if (stopped || busy || vault.token !== token) return;
          items.forEach(function (it) { if (it.drawn && dist(it) > 4) { it.cv.width = it.cv.height = 0; it.drawn = false; } });
          var todo = items.filter(function (it) { return !it.drawn && dist(it) <= 1.5; })
            .sort(function (a, b) { return dist(a) - dist(b); })[0];
          if (!todo) return;
          busy = true;
          todo.cv.width = Math.floor(todo.vp.width); todo.cv.height = Math.floor(todo.vp.height);
          todo.page.render({ canvasContext: todo.cv.getContext("2d"), viewport: todo.vp }).promise.then(function () {
            todo.drawn = true; busy = false; next();
          }, function () { busy = false; });
        }
        var onScroll = function () { next(); };
        window.addEventListener("scroll", onScroll, { passive: true });
        pager = { stop: function () { stopped = true; window.removeEventListener("scroll", onScroll); }, next: next };
        if (window.LECT) LECT.pages();
        if (window.PROPER) PROPER.pages();
        var f = parseFloat(box.dataset.restore); box.dataset.restore = "";
        if (f > 0) scrollTo(0, box.getBoundingClientRect().top + scrollY + f * box.getBoundingClientRect().height);
        else goJump();
        next(); pageLabel();
      });
    });
  }

  // ---- Cut and paste (assembly.json): strips of pages already in the vault, drawn one under another ----
  // Sunday Vespers through the year (Br. Augustine): the psalter's Saturday (I) or Sunday (II) Vespers, but the
  // Magnificat antiphon is the Sunday's own (Year I/II at I Vespers, Year A/B/C at II Vespers), sung in the
  // first alternate tone the antiphon names, then the antiphon again and the psalter's Conclusion.
  var asm = null, plain = false;
  var extrasData = {};   // the necrology, the house, the reliquary and the Liber's saints, for the ordo line
  ["necrology", "house", "relics", "sanctoral"].forEach(function (k) {
    fetch(k + ".json").then(function (r) { return r.json(); }).then(function (j) { extrasData[k] = j; ordoNote(); dayEnd(); if (k === "house") render(); }, function () {});
  });
  // ---- The Congregation's ordo (ordo-YEAR.json, read from amcass.org's PDF by books/ordo.py) ----
  var ordos = {};
  function ordoYear(y) {
    if (!(y in ordos)) {
      ordos[y] = null;
      fetch("ordo-" + y + ".json").then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (o) { Object.keys(o).forEach(function (k) { if (/^\d{4}-\d\d-\d\d$/.test(k) && o[k]) o[k]._k = k; }); ordos[y] = o; ordoWeek(); autoOpen(); render(); }, function () {});
    }
    return ordos[y];
  }
  // The week of the psalter, as the ordo counts it (unless this phone has been set to another week)
  function weekOf(d) { var o = ordoDay(d); return o && o.w ? o.w - 1 : null; }
  function ordoWeek() { var w = weekOf(dayDate()); if ((state.autoWeek || viewing && !weekTouched) && w !== null) state.week = w; }
  // On a feast or solemnity the ordo names, open its section in the seasonal or Saints book at the hour
  // (I Vespers the evening before). Memorials and Sundays stay in the psalter for now.
  function ordoRank(o) {   // the ordo's rank, or the house's own feast or solemnity
    var h = o && o.n.filter(function (n) { return /^St\. Bernard Abbey: .*\b(Solemnity|Feast)\b/.test(n); })[0];
    return h ? h.match(/\b(Solemnity|Feast)\b/)[1] : o && o.r;
  }
  // The day's rank as the abbey keeps it: the Liber's, where the Liber has the day (keptSaint), else the ordo's
  function rankOf(o) {
    var ks = o && o._k && keptSaint(new Date(+o._k.slice(0, 4), +o._k.slice(5, 7) - 1, +o._k.slice(8, 10)));
    return ks ? ks.r : ordoRank(o);
  }
    // The Office of the Dead (the Saints book's All Souls, 2 November): on All Souls, every hour it prints, its own Compline
  // too (the abbey uses it; the necrology still follows); on
  // 14 November, the Commemoration of all the Departed of our Order ("All as in the Office of All Souls Day", p. 707),
  // Matins to Sext, Vespers being I Vespers of Sunday (Master of Ceremonies, 2026). Not on a Sunday (the 14th moves).
  var DEAD = { "11-02": ["Matins", "Lauds", "Sext", "Vespers", "Compline"], "11-14": ["Matins", "Lauds", "Sext"] };
  function deadOffice(d, hour) {
    var md = ymd(d).slice(5), l = DEAD[md];
    return !!l && !(md === "11-14" && d.getDay() === 0) && l.indexOf(hour) >= 0;
  }
  function openDead(d) {
    var k = books.Sanctoral.sections.findIndex(function (s) { return s.tag === "d:11-02"; }), sec = books.Sanctoral.sections[k];
    var j = sec ? sec.jumps.findIndex(function (x) { return x[0] === HOURS[state.hour]; }) : -1;
    if (j < 0) return false;
    state.book = "Sanctoral"; state.sec.Sanctoral = k; pendingJump = sec.jumps[j]; bookHour = sec.jumps[j][0];
    autoNote = "Opened for you: the Office of the Dead (" + sec.title + ", Saints), " + bookHour + (ymd(d).slice(5) === "11-14" ? ", as the book directs for the Departed of our Order." : ".");
    autoJump = String(j); render();
    return true;
  }
  // "Today" (the default, Br. Augustine, Nov 2026): every choice of day and hour is put together from the ordo, from
  // whichever book the hour comes from: the psalter, or on a feast or solemnity its section in the Saints or seasonal
  // book (I Vespers the evening before), the Office of the Dead on its days. The book buttons leave Today to browse.
  function todayTarget(d, hour) {
    if (d === undefined) { d = dayDate(); hour = state.hour; }
    if (!books || (hour === 4 && !deadOffice(d, "Compline"))) return null;
    var o = ordoDay(d);
    if (!o) return null;
    if (deadOffice(d, HOURS[hour])) {
      var dk = books.Sanctoral.sections.findIndex(function (s) { return s.tag === "d:11-02"; }), ds = books.Sanctoral.sections[dk];
      var dj = ds ? ds.jumps.findIndex(function (x) { return x[0] === HOURS[hour]; }) : -1;
      if (dj >= 0) return { book: "Sanctoral", k: dk, j: dj, note: "The Office of the Dead (" + ds.title + ", Saints), " + ds.jumps[dj][0] + (ymd(d).slice(5) === "11-14" ? ", as the book directs for the Departed of our Order." : ".") };
    }
    var eve = hour === 3 && (/^1st Vespers of following/.test(o.v) || o.n.some(function (n) { return /^St\. Bernard Abbey: 1st Vespers of following/.test(n); }));
    var t = eve ? addDays(d, 1) : d, ot = ordoDay(t);
    if (!ot || !/Solemnity|Feast/.test(rankOf(ot) || "")) return null;
    var want = eve ? ["I Vespers", "Vespers"] : [["Matins"], ["Lauds"], ["Sext"], ["II Vespers", "Vespers"]][hour];
    var order = ["Sanctoral", "Advent-Christmas", "Lent"];
    for (var b = 0; b < order.length; b++) {
      var k = todayIn(order[b], t);
      if (k < 0) continue;
      var sec = books[order[b]].sections[k];
      for (var w = 0; w < want.length; w++) for (var j = 0; j < sec.jumps.length; j++)
        if (sec.jumps[j][0].replace(/ \(\d\)$/, "") === want[w]) return { book: order[b], k: k, j: j, note: "From the ordo: " + sec.title + " (" + books[order[b]].label + "), " + want[w] + "." };
    }
    return null;
  }
  var todayKey = null;
  function applyToday() {
    if (!state.today || state.ref) return;
    var tg = todayTarget(), key = tg ? tg.book + ":" + tg.k + ":" + tg.j : "psalter:" + ymd(dayDate()) + ":" + state.hour;
    autoNote = tg ? tg.note : easterNote();
    if (key === todayKey) return;
    todayKey = key;
    if (!tg) { state.book = "psalter"; pendingJump = null; bookHour = null; return; }
    var sec = books[tg.book].sections[tg.k];
    state.book = tg.book; state.sec[tg.book] = tg.k; pendingJump = sec.jumps[tg.j]; bookHour = sec.jumps[tg.j][0];
    autoJump = String(tg.j);
  }
  // Easter Sunday has no Matins (the Easter Vigil is kept as its Matins: the user, Nov 2026) and the Lent book prints
  // no Matins or Lauds for it; so no weekly hour is put in their place, only this note
  function easterDay() { return daysBetween(easter(dayDate().getFullYear()), dayDate()) === 0; }
  function easterNote() { return state.today && easterDay() && state.hour <= 1 ? "Easter Sunday: no " + HOURS[state.hour] + " today. The Easter Vigil is kept as Matins, and the book has no Matins or Lauds for this day." : ""; }
  function autoOpen() { applyToday(); }
  var autoNote = "", autoJump = null;   // what autoOpen chose, kept in the "Go to" list until the monk taps
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function ordoDay(d) { var o = ordoYear(d.getFullYear()); return o ? o[ymd(d)] || null : undefined; }
  var OURS = /^(St\. Bernard Abbey|Diocese of Birmingham|Province of Mobile)/;
  // Is tonight's Vespers the Sunday's? (undefined when there is no ordo for that year)
  function sundayVespers(d) {
    var o = ordoDay(d);
    if (!o) return o === null ? false : undefined;
    if (o.n.some(function (n) { return /^St\. Bernard Abbey/.test(n) && /Vespers|Solemnity|Feast/.test(n); })) return false;
    if (d.getDay() === 6) return /^1st Vespers of following Sunday/.test(o.v);
    return /SUNDAY IN ORDINARY TIME/.test(o.t) && /^2nd Vespers/.test(o.v);
  }
  function clean(t) { return t.replace(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\. /, "").replace(/,? OA\b/, "").replace(/\.$/, ""); }
  // The day's Mass readings: the citations from the ordo, and a link to the texts on USCCB's own site (the Lectionary
  // text is copyrighted and may not be shown here without written permission, so it is read there).
  function usccbUrl(d) { return "https://bible.usccb.org/bible/readings/" + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + String(d.getFullYear()).slice(2) + ".cfm"; }
  function massReadings(o, d) {
    var m = o && o.m && o.m.match(/readings\s+no\.?\s*([\dA-Za-z]+(?:ff\.)?)\s*\(([^)]*)\)/);
    var p = document.createElement("span"); p.className = "ordo-mass";
    p.appendChild(document.createTextNode(m ? "Mass readings (no. " + m[1] + "): " + m[2].replace(/\s+/g, " ").replace(/\s*([:,])\s*/g, "$1 ").replace(/:\s/g, ":") + " " : "Mass readings: "));
    var a = document.createElement("a"); a.href = usccbUrl(d); a.target = "_blank"; a.rel = "noopener"; a.textContent = "Read them at USCCB ↗";
    p.appendChild(a); return p;
  }
  // The day bar (Br. Augustine, Nov 2026): one line saying what the day is (its rank: Memorial, Feast or Solemnity, and
  // whom it honours), with ✠ where that saint's relic is in our reliquary (relics.json, from the abbey site's relics
  // page), the Ordo button that opens the full ordo entry (#ordo-note), and the Read as menu (text.js)
  var ordoOpen = false;
  function relicsFor(t) {
    var R = extrasData.relics && extrasData.relics.saints || [];
    return R.filter(function (r) { try { return new RegExp(r.re, "i").test(t); } catch (e) { return false; } });
  }
  // The ordo prints solemnities and feasts in capitals; the bar sets them as ordinary words ("Bernard, Titular")
  var SMALL = /^(of|the|and|in|on|at|to|for|a|an|with|from|by|de|da|del|di|la|le|du|d'|y|e|von|van)$/i;
  function soft(t) {
    if (t.replace(/[^A-Za-z]/g, "").length < 4 || t !== t.toUpperCase()) return t;
    return t.toLowerCase().replace(/[\p{L}'’]+/gu, function (w, i) { return i && SMALL.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1); })
      .replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi|Xii|Xiii|Xxiii)\b/g, function (r) { return r.toUpperCase(); });
  }
  // The saints of our reliquary (saints.json, from the abbey site's write-ups; munkachy/psalter books/saints.py): the ✠ relic
  // button, or the day's name, opens each saint's life, patronage, why they matter here, and what relic we keep
  var saintsP = null;
  function saintSheet(rel) {
    if (!saintsP) saintsP = fetch("saints.json?v=1").then(function (r) { return r.json(); }).catch(function () { saintsP = null; return { saints: {} }; });
    var back = document.createElement("div"); back.className = "nt-back saint-back";
    back.innerHTML = '<div class="nt-sheet saint-sheet" role="dialog" aria-modal="true" aria-label="The saint of the day"><p class="saint-wait">Opening…</p></div>';
    var close = function () { back.remove(); document.removeEventListener("keydown", key); };
    var key = function (e) { if (e.key === "Escape") close(); };
    back.addEventListener("click", function (e) { if (e.target === back || e.target.closest(".saint-x")) close(); });
    document.addEventListener("keydown", key);
    document.body.appendChild(back);
    saintsP.then(function (j) {
      var e = function (t) { return String(t || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }).replace(/&lt;(\/?)em&gt;/g, "<$1em>"); };
      var html = '<button type="button" class="saint-x" aria-label="Close">✕</button>';
      rel.forEach(function (r) {
        var ids = r.ids && r.ids.length ? r.ids : [];
        if (!ids.length) html += '<section class="saint"><h2>' + e(r.name) + '</h2><p class="saint-relic">✠ In our reliquary</p></section>';
        ids.forEach(function (id) {
          var x = j.saints[id]; if (!x) return;
          html += '<section class="saint">' +
            (x.img ? '<img class="saint-img" src="' + e(x.img) + '" alt="' + e(x.name) + '" width="160" height="160">' : "") +
            '<h2>' + e(x.name) + '</h2>' +
            '<p class="saint-meta">' + [x.dates, x.title, x.feast ? "Feast: " + x.feast : ""].filter(Boolean).map(e).join(" · ") + '</p>' +
            '<p class="saint-relic">✠ In our reliquary' + (r.likely ? " (the label is only probably read)" : "") + (x.relic ? ": " + e(x.relic) : "") + '</p>' +
            '<p class="saint-sum">' + e(x.summary) + '</p>' +
            '<h3>His life</h3>'.replace("His ", /^(St\. (Agatha|Agnes|Lucy|Clare|Catherine|Teresa|Helena|Anne|Elizabeth|Frances|Maria|Matilda|Bernadette|Gemma|Dymphna|Radegund|Justina|Ursula)|Bl\. Beatrice)/.test(x.name) ? "Her " : /^(Sts\.|The )/.test(x.name) ? "The " : "His ") +
            (x.life || []).map(function (p) { return "<p>" + e(p) + "</p>"; }).join("") +
            (x.patronage && x.patronage.length ? '<h3>Patronage</h3><ul>' + x.patronage.map(function (p) { return "<li>" + e(p) + "</li>"; }).join("") + "</ul>" : "") +
            (x.why_here && x.why_here.length ? '<h3>For us at St. Bernard</h3>' + x.why_here.map(function (p) { return "<p>" + e(p) + "</p>"; }).join("") : "") +
            (x.credit ? '<p class="saint-credit">Image: ' + e(x.credit) + '</p>' : "") + '</section>';
        });
      });
      back.querySelector(".saint-sheet").innerHTML = html;
    });
  }
  // The saint the abbey keeps on a weekday: a day the Liber Hebdomadarii has a collect for is kept, with the Liber's
  // title and rank, which outrank the ordo's ("Or Willibrord, Bishop. Optional Mem."; 14 Nov, the Departed of our Order,
  // and 1 Dec, the Cathedral's dedication: feasts): "the Liber defines what we do" (the user, 8 Nov 2026; sanctoral.json,
  // from munkachy/psalter books/proper.py --days). As proper.js resolve(): not on a Sunday, nor where the ordo (or the
  // house) has a feast or solemnity of its own, nor in Lent, Holy Week, 17 Dec - 1 Jan, the Easter octave; Our Lady's
  // Saturdays stay hers. rankOf() gives this rank to the whole page (Sext's hymn, Compline, the feast's books).
  function keptSaint(d) {
    var S = extrasData.sanctoral && extrasData.sanctoral.days, o = ordoDay(d), md = ymd(d).slice(5), s = S && S[md];
    if (S && same(d, addDays(easter(d.getFullYear()), 69))) s = S["immaculate-heart"];   // the Saturday after the Sacred Heart (proper.js named())
    var or = o && ordoRank(o) || "";
    if (!s || !o || (/Solemnity|Feast/.test(or) && !/Solemnity|Feast/.test(s[1])) || d.getDay() === 0 || /^\s*†/.test(o.t) || civicDay(d)) return null;
    var se = seasonOf(d), e = easter(d.getFullYear());
    if (se === "Lent" || se === "Passiontide" || (d >= e && d <= addDays(e, 7)) || (d.getMonth() === 11 && d.getDate() >= 17) || md === "01-01") return null;
    if (d.getDay() === 6 && bvmSaturday(d)) return null;
    return { t: s[0], r: s[1] };
  }
  function dayBar(o, name, d, extra) {
    var w = $("#day-what"), btn = $("#ordo-btn"); if (!w) return;
    w.innerHTML = ""; btn.hidden = !o; btn.classList.toggle("has-news", !!extra);
    if (!o) return;
    var col = (o.c || "").toLowerCase().match(/white|red|green|violet|rose|black|gold/);   // the ordo's colour for the day
    btn.dataset.color = col ? col[0] : ""; btn.title = (col ? o.c + " · " : "") + "the full ordo for the day";
    var ks = !/Solemnity|Feast/.test(o.r || "") && keptSaint(d), bvm = !o.r && !ks && d.getDay() === 6 && bvmSaturday(d), title = bvm ? "Saturday of Our Lady" : ks ? soft(ks.t) : soft(name);
    if (bvm) btn.dataset.color = "white";
    var rk = ks ? ks.r : o.r;
    if (rk) {
      var r = document.createElement("span"); r.className = "ordo-rank rank-" + (rk === "Optional Memorial" ? "memorial" : rk.toLowerCase());
      r.innerHTML = '<span class="r-long"></span><span class="r-short"></span>';
      r.firstChild.textContent = rk; r.lastChild.textContent = { Solemnity: "Sol.", Memorial: "Mem.", "Optional Memorial": "Opt. Mem." }[rk] || rk;
      w.appendChild(r);
    }
    var n = document.createElement("span"); n.className = "day-name"; n.textContent = title; w.appendChild(n);
    var rel = o.r || bvm || ks ? relicsFor(bvm ? "Saturday Commemoration" : ks ? ks.t : o.t) : [];
    (o.n || []).forEach(function (t) {   // the optional memorials of the day ("Or Elizabeth of Hungary, …"), too
      if (/^(Or |U\.S\.A\.:)/.test(t)) relicsFor(t.replace(/^U\.S\.A\.:\s*(As supra or\s*)?/, "")).forEach(function (x) { if (rel.indexOf(x) < 0) rel.push(x); });
    });
    if (rel.length) {
      var m = document.createElement("button"); m.type = "button"; m.className = "day-relic"; m.innerHTML = '✠<span class="r-long"> relic</span>';
      m.title = "In our reliquary: " + rel.map(function (x) { return x.name + (x.likely ? " (label likely)" : ""); }).join("; ") + ". Tap for the saint's life";
      m.addEventListener("click", function () { saintSheet(rel); });
      n.classList.add("has-relic"); n.setAttribute("role", "button"); n.tabIndex = 0;
      n.addEventListener("click", function () { saintSheet(rel); });
      w.appendChild(m);
    }
    w.title = (rk ? rk + ": " : "") + title + (ks ? " (" + soft(name) + ")" : "") + (rel.length ? " · " + m.title : "");
    return rel;
  }
  function nameDay(d) {   // a brother's name day (house.json "namedays", from the abbey site's monk cards), under the day bar
    var p = $("#nameday"); if (!p) return;
    var h = extrasData.house, l = !state.ref && h && h.namedays && h.namedays[ymd(d).slice(5)] || [];
    p.hidden = !l.length; if (!l.length) return;
    var who = l.map(function (x) { return x[0] + " (" + x[1] + ")"; });
    p.textContent = "✠ The name day of " + (who.length > 1 ? who.slice(0, -1).join(", ") + " and " + who[who.length - 1] : who[0]) + " · Ad multos annos!";
  }
  function ordoNote() {
    var el = $("#ordo-note"), d = dayDate(), o = !state.ref ? ordoDay(d) : null;
    nameDay(d);
    if (!o) { el.hidden = true; dayBar(null); return; }
    var ours = o.n.filter(function (n) { return OURS.test(n); }), rest = o.n.filter(function (n) { return !OURS.test(n); });
    el.innerHTML = "";
    var b = document.createElement("b"); b.textContent = "Ordo, " + d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + ": ";
    var v = o.v, next = /^1st Vespers of following\b/.test(v) && ordoDay(addDays(d, 1));
    if (next) v = "1st Vespers of " + clean(next.t).replace(/\.\s*(Solemnity|Feast|Memorial).*$/, "");   // name the day whose Vespers they are (OA: a holy day of obligation)
    el.appendChild(b);
    // A memorial, feast or solemnity (never an optional memorial: those are only in the "Or" notes) gets its rank in front
    var hn = o.n.filter(function (n) { return /^St\. Bernard Abbey: .*\b(Solemnity|Feast)\b/.test(n); })[0];
    if (hn) o = { t: hn.replace(/^St\. Bernard Abbey:\s*(?:(?:White|Red|Green|Violet|Rose)\s+)?/, "").replace(/\s*–.*$/, ""), r: rankOf(o), v: (hn.match(/–\s*(.+)$/) || [])[1] || o.v, n: o.n, w: o.w,
      c: (hn.match(/^St\. Bernard Abbey:\s*(White|Red|Green|Violet|Rose)\b/) || [])[1] || o.c };   // what the house keeps
    if (hn) v = o.v;
    if (o.n.some(function (n) { return /^St\. Bernard Abbey: 1st Vespers of following/.test(n); })) {   // the house's own eve
      var nx = ordoDay(addDays(d, 1)), nh = nx && nx.n.filter(function (n) { return /^St\. Bernard Abbey: .*\b(Solemnity|Feast)\b/.test(n); })[0];
      if (nh) v = "1st Vespers of " + clean(nh.replace(/^St\. Bernard Abbey:\s*(?:(?:White|Red|Green|Violet|Rose)\s+)?/, "").replace(/\s*–.*$/, "")).replace(/\.\s*(Solemnity|Feast).*$/, "");
    }
    var name = clean(o.t).replace(/\s*\*\s*/g, " ").replace(/ ,/g, ",").replace(/\.?\s*(Solemnity( with an Octave:?)?|Feast|Memorial)\.?$/, "");
    var mdx = ymd(d).slice(5), news = !!(extrasData.house && extrasData.house.notices && extrasData.house.notices[ymd(d)]) ||
      !!((extrasData.necrology && extrasData.necrology.days[mdx] || []).some(function (n) { return n[3] === extrasData.necrology.ours; }) || notices(mdx).length);
    var relics = dayBar(o, name, d, news) || [];
    if (o.r) { var r = document.createElement("span"); r.className = "ordo-rank rank-" + o.r.toLowerCase(); r.textContent = o.r; el.appendChild(r); }
    el.appendChild(document.createTextNode(name + (v ? " – " + v : "") + (o.w ? " · Psalter Week " + ROMAN[o.w - 1] : "")));
    if (relics.length) { var rp = document.createElement("span"); rp.className = "ordo-ours"; rp.textContent = "✠ In our reliquary: " + relics.map(function (x) { return x.name + (x.likely ? " (label likely)" : ""); }).join("; "); el.appendChild(rp); }
    ours.forEach(function (n) { var p = document.createElement("span"); p.className = "ordo-ours"; p.textContent = n; el.appendChild(p); });
    var mc = extrasData.house && extrasData.house.notices && extrasData.house.notices[ymd(d)];
    if (mc) {   // the Master of Ceremonies' notice of upcoming celebrations (house.json "notices")
      var mb = document.createElement("div"); mb.className = "ordo-mc";
      var mt = document.createElement("span"); mt.className = "ordo-mc-h"; mt.textContent = "From the Master of Ceremonies:"; mb.appendChild(mt);
      var ul = document.createElement("ul");
      mc.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
      mb.appendChild(ul); el.appendChild(mb);
    }
    var nec = extrasData.necrology, mdd = ymd(d).slice(5);
    var nn = (nec && nec.days[mdd] || []).filter(function (n) { return n[3] === nec.ours; }).map(function (n) { return [n[0] + " " + n[1], n[2]]; });
    notices(mdd).forEach(function (e) { if (!nn.some(function (n) { return n[0] === e.name; })) nn.push([e.name, e.year]); });
    if (nn.length) {   // the brothers of our house who died on this day, each with his notice
      loadNecro();
      var nd = document.createElement("details"); nd.className = "ordo-necro";
      var ns = document.createElement("summary"); ns.textContent = "Necrology: " + nn.map(function (n) { return n[0] + " (" + n[1] + ")"; }).join(", ");
      nd.appendChild(ns);
      nn.forEach(function (n) {
        var e = noticeFor(mdd, n[0]);
        if (e) nd.appendChild(noticeEl(e, n[0] + ", " + n[1]));
        else { var q = document.createElement("p"); q.textContent = n[0] + ", " + n[1] + (necroText ? ": no notice in our necrology yet." : ""); nd.appendChild(q); }
      });
      el.appendChild(nd);
    }
    var cv = !o.r && civicDay(d);
    if (cv) { var cp = document.createElement("span"); cp.className = "ordo-ours"; cp.textContent = "Optional Memorial: " + cv; el.appendChild(cp); }
    var ks = !/Solemnity|Feast/.test(o.r || "") && keptSaint(d);
    if (ks) { var kp = document.createElement("span"); kp.className = "ordo-ours"; kp.textContent = "✦ Saint Bernard Abbey: " + (ks.r ? ks.r + " of " : "") + ks.t + " (the Liber's collect)"; el.appendChild(kp); }
    if (d.getDay() === 6 && bvmSaturday(d)) { var bs = document.createElement("span"); bs.className = "ordo-ours"; bs.textContent = "✦ Saint Bernard Abbey: Saturday Commemoration of the Blessed Virgin Mary"; el.appendChild(bs); }
    el.appendChild(massReadings(o, d));
    var cal = document.createElement("a"); cal.className = "ordo-cal"; cal.href = "calendar.html#" + ymd(d); cal.textContent = "This day in the calendar →";
    el.appendChild(cal);
    if (rest.length) {
      var det = document.createElement("details"), sm = document.createElement("summary"); sm.textContent = "More from the ordo";
      det.appendChild(sm); rest.forEach(function (n) { var p = document.createElement("p"); p.textContent = n; det.appendChild(p); });
      el.appendChild(det);
    }
    el.hidden = !ordoOpen;
  }
  function dayDate() { return addDays(base, state.day - base.getDay()); }
  // The moment to choose hours by: now, or (another day) the start of the hour picked, by the horarium
  function whenFor() {
    if (!viewing) return now;
    var d = dayDate(), t = (HORARIUM[d.getDay()] || HORARIUM.weekday)[state.hour];
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(t / 60), t % 60 + 1);
  }
  function sundayRecipe() {
    if (!asm || plain || state.ref || state.book !== "psalter" || state.hour !== 3 || (state.day !== 0 && state.day !== 6)) return null;
    var sun = state.day === 6 ? addDays(dayDate(), 1) : dayDate();
    var sv = sundayVespers(dayDate());
    if (sv === false) return null;   // the ordo keeps something else tonight
    var ot = tagsFor(sun).tags.filter(function (t) { return typeof t === "object" && "n" in t; })[0];
    if (!ot) return null;
    var first = state.day === 6, y = sun.getFullYear();
    var year = first ? (y % 2 ? "I" : "II") : ["C", "A", "B"][y % 3];
    var a = ((asm.ot[ot.early ? "early" : "late"] || {})[ROMANS[ot.n]] || {})[first ? "I" : "II"];
    a = a && a[year];
    if (!a) return null;
    var tone = asm.tones[a.book][String(a.tone)];
    var ps = asm.psalter[first ? "sat" : "sun"], src = books[a.book].label;
    var name = "Sunday " + ROMANS[ot.n] + " through the Year, " + (first ? "I Vespers" : "II Vespers") + ", Year " + year;
    var items = ps.head.concat([{ h: "Antiphon at the Magnificat: " + name + " (" + src + ", p. " + a.strips[0][4] + ")" }], a.strips,
      [{ h: "Magnificat, first alternate tone (" + src + ", p. " + a.tone + ")" }], tone || [],
      [{ h: "The antiphon is repeated" }], a.strips, [{ h: "Conclusion (Psalter)" }], ps.tail);
    return { key: "sun:" + name, items: items,
      note: "Pasted together: " + name + ". The Magnificat antiphon comes from the " + src + " book and the Magnificat is in its first alternate tone." };
  }
  // Compline with only tonight's hymn and the antiphon of Our Lady for the season (Br. Augustine).
  // The hymn: a proper one (Christmas, Epiphany, Pentecost, Christ the King …) if the day has one; else the hymn
  // of a solemnity or feast in the ordo (Our Lady's own for hers); else the season's; else the memorial's; else the
  // ferial or Saturday-Sunday hymn. The eve of a solemnity or feast takes its hymn. The antiphon: solemn tone on
  // Sundays, solemnities and feasts, simple tone on other days, then its versicle and prayer.
  var BVM = /Blessed Virgin|Virgin Mary|HOLY MOTHER OF GOD|Our Lady|ASSUMPTION|IMMACULATE|VISITATION|Queenship|Rosary|Mother of the Church|Presentation of the Blessed/i;
  function complineFor(d) {
    var base = compline(d), o = ordoDay(d), t = d;
    var eve = o && (/^1st Vespers of following/.test(o.v) || o.n.some(function (n) { return /^St\. Bernard Abbey: 1st Vespers of following/.test(n); }));
    if (eve) { var nx = ordoDay(addDays(d, 1)); if (nx && /Solemnity|Feast/.test(rankOf(nx) || "")) { o = nx; t = addDays(d, 1); } }
    var rank = o ? rankOf(o) || "" : "", name = o ? o.t + " " + o.n.join(" ") : "";
    var hymn = base.hymn, proper = ["transfig", "king", "nativity", "epiphany", "baptism", "pentecost", "heart"];
    var e = easter(d.getFullYear()), octave = d >= e && d <= addDays(e, 7);   // the Easter octave keeps the Easter hymn
    if (proper.indexOf(hymn) < 0 && !octave) {
      if (rank === "Solemnity" || rank === "Feast") hymn = BVM.test(name) ? "bvm" : rank.toLowerCase();
      else if (["advent", "lent", "easterA", "ascA"].indexOf(hymn) < 0 && rank === "Memorial" && d.getDay() !== 0 && d.getDay() !== 6) hymn = "memorial";
    }
    var solemn = t.getDay() === 0 || rank === "Solemnity" || rank === "Feast";
    var vers = base.marian === "alma" ? (d.getMonth() === 11 && d.getDate() < 24 ? "advent" : "christmas") : "";
    return { hymn: hymn, marian: base.marian, tone: solemn ? "solemn" : "simple", vers: vers };
  }
  function complineRecipe() {
    if (!asm || !asm.compline || plain || state.ref || state.book !== "psalter" || state.hour !== 4 || ultima()) return null;
    var c = asm.compline, k = complineFor(dayDate()), h = c.hymns[k.hymn], m = k.marian && c.marian[k.marian];
    if (!h) return null;
    var items = c.head.concat([{ h: h.label.replace(/^\d+\.\s*/, "") }], h.strips, c.chapter);
    if (m) items = items.concat([{ h: m.label + ", " + k.tone + " tone" }], m[k.tone], [{ h: "Versicle and prayer" }], m.versicle[k.vers] || []);
    return { key: "compline:" + k.hymn + ":" + k.marian + ":" + k.tone + ":" + k.vers, items: items,
      note: "Pasted together: Compline with tonight's hymn only (" + h.label.replace(/^\d+\.\s*/, "") + ")" +
        (m ? " and " + m.label + " in the " + k.tone + " tone" : "") + "." };
  }
  // ---- Cutting by season, and Our Lady's Saturday (assembly.json "marks", made by books/tools/saturday.py) ----
  // Where the book prints choices ("Through the Year", Advent, Lent, Passiontide, Paschaltide …; on Saturdays
  // "I. Through the Year" and "II. Office of the Blessed Virgin Mary on Saturday"), keep only the one for the day.
  function seasonOf(d) {
    var y = d.getFullYear(), m = d.getMonth(), e = easter(y), adv = firstAdventSunday(y), ep = epiphany(y), bapt = endOfChristmastide(y);
    if (d >= adv && d < new Date(y, 11, 25)) return "Advent";
    if ((m === 11 && d.getDate() >= 25) || (m === 0 && d < ep)) return "Christmas";
    if (d >= ep && d <= bapt) return "Epiphany";
    if (d >= addDays(e, -46) && d < addDays(e, -14)) return "Lent";
    if (d >= addDays(e, -14) && d < e) return "Passiontide";
    if (d >= e && d < addDays(e, 42)) return "Paschaltide";
    if (d >= addDays(e, 42) && d <= addDays(e, 49)) return "Ascension to Pentecost";
    return "year";
  }
  function bvmSaturday(d) {   // the abbey's list (house.json)
    var h = extrasData.house, l = h && h.bvmSaturdays && h.bvmSaturdays[d.getFullYear()];
    return !!l && l.indexOf(ymd(d).slice(5)) >= 0;
  }
  // Weekday Matins has two hymns: "When the Office begins in darkness" and "… in light". By default the daylight hymn
  // when dawn at the abbey (sun 6° below the horizon) comes before Matins starts; the switch on the page overrides it.
  var CULLMAN = [34.17, -86.84], hymnLight = null;
  function dawnMinutes(d) {   // local clock minutes after midnight (NOAA's approximation)
    var n = Math.round((midnight(d) - new Date(d.getFullYear(), 0, 1)) / 864e5), g = 2 * Math.PI / 365 * n;
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var phi = CULLMAN[0] * Math.PI / 180, ha = Math.acos((Math.sin(-6 * Math.PI / 180) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec))) * 180 / Math.PI;
    var noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
    var off = -noon.getTimezoneOffset();   // the abbey's clock (Central Time), whatever the phone's zone
    try { off = (new Date(noon.toLocaleString("en-US", { timeZone: "America/Chicago" })) - new Date(noon.toLocaleString("en-US", { timeZone: "UTC" }))) / 6e4; } catch (x) {}
    return 720 - 4 * (CULLMAN[1] + ha) - eq + off;
  }
  function matinsStart(d) { return (HORARIUM[d.getDay()] || HORARIUM.weekday)[0]; }
  function lightAuto(d) { return dawnMinutes(d) <= matinsStart(d); }
  function inLight(d) { return hymnLight === null ? lightAuto(d) : hymnLight; }
  function clock(m) { m = Math.round(m); var h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + ":" + String(mm).padStart(2, "0") + (h < 12 ? " a.m." : " p.m."); }
  function hasHymnPair(e) { return e && e.marks.some(function (k) { return k[2] === "dark"; }); }
  function cutFile(e, season, bvm, light) {
    var prefs = { "Passiontide": ["Passiontide", "Lent"], "Holy Week": ["Holy Week", "Passiontide", "Lent"], "Palm Sunday": ["Palm Sunday", "Holy Week", "Passiontide", "Lent"],
      "Ascension to Pentecost": ["Ascension to Pentecost", "Paschaltide"], "Epiphany": ["Epiphany", "Christmas"] }[season] || (season === "year" ? [] : [season]);
    // Each choice covers only its own lines: a run of choices starts at each "Through the Year" ("I." or plain), and holds
    // what follows it until the next shared heading: Our Lady's version ("II."), the seasons' versions.
    var m = e.marks, keep = [], hasLady = m.some(function (k) { return k[2] === "two"; });
    // In Paschaltide, where the hour gives its own Alleluia antiphon, the "Through the Year" antiphons are not said at all
    var easter = (season === "Paschaltide" || season === "Ascension to Pentecost") && m.some(function (k) { return k[2] === "season" && k[3] === "Paschaltide"; });
    var runs = [], cur = null;
    m.forEach(function (k, j) {
      var kind = k[2];
      if (kind === "common" || kind === "dark" || kind === "light") { cur = null; return; }
      if (!cur || kind === "one" || kind === "year") { cur = []; runs.push(cur); }
      cur.push(j);
    });
    runs.forEach(function (r) {
      var kinds = r.map(function (j) { return m[j][2]; }), hasTwo = kinds.indexOf("two") >= 0;
      // a label may name several seasons that share a text ("Christmas/Epiphany": Sunday's second-nocturn canticle)
      var labels = [].concat.apply([], r.filter(function (j) { return m[j][2] === "season"; }).map(function (j) { return m[j][3].split("/"); }));
      var pick = prefs.filter(function (p) { return labels.indexOf(p) >= 0; })[0] || null;
      var chosen = bvm && hasTwo ? r.filter(function (j) { return m[j][2] === "two"; })[0]
        : pick ? r.filter(function (j) { return m[j][2] === "season" && m[j][3] === pick; })[0] : null;
      // A season's version that is only a versicle (Advent, Lent), where "Through the Year" has an antiphon above its
      // versicle: keep that antiphon. On Our Lady's Saturdays only her versicle is said there.
      var onlyVerse = chosen != null && m[chosen][2] === "season" && m[chosen][4] === "v" && kinds.indexOf("verse") >= 0;
      r.forEach(function (j) {
        var k = m[j][2];
        keep[j] = k === "one" || k === "year" ? (chosen == null && !(easter && k === "year")) || onlyVerse : k === "verse" ? chosen == null
          : j === chosen || (k === "season" && !(bvm && hasTwo) && !!pick && m[j][3].split("/").indexOf(pick) >= 0);   // every block of the day's season
      });
    });
    m.forEach(function (k, j) {
      if (k[2] === "common") keep[j] = true;
      // the darkness and daylight hymns give way to Our Lady's hymn on her Saturdays
      if (k[2] === "dark") keep[j] = !light && !(bvm && hasLady);
      if (k[2] === "light") keep[j] = !!light && !(bvm && hasLady);
    });
    var segs = [], cur = [0, 0], on = true;
    m.forEach(function (mk, j) { if (on) segs.push([cur, [mk[0], mk[1]]]); cur = [mk[0], mk[1]]; on = keep[j]; });
    if (on) segs.push([cur, e.end]);
    var out = [];
    segs.forEach(function (sg) {
      for (var p = sg[0][0]; p <= sg[1][0]; p++) {
        var f0 = p === sg[0][0] ? sg[0][1] : e.heads[p], f1 = p === sg[1][0] ? sg[1][1] : 1;
        if (p === sg[0][0] && sg[0][1] === 0 && p > 0) f0 = e.heads[p];
        if (f1 - f0 > 0.012) out.push([e.path, p, f0, f1, e.first + p]);
      }
    });
    return out;
  }
  var SEXT_HYMN = { ferial: "On Ferial Days", memorial: "On Memorials", sunday: "On Sundays", feast: "On Feasts", solemnity: "On Solemnities",
    bvm: "On Feasts of the Blessed Virgin Mary · Saturday Commemoration", advent: "Advent", nativity: "Nativity of the Lord", epiphany: "Epiphany",
    lent: "Lent and Passiontide", easterA: "Paschaltide", ascA: "Ascension to Pentecost" };
  function sextHymn(d, bvm) {
    if (bvm) return "bvm";
    var base = compline(d).hymn, o = ordoDay(d), rank = o ? rankOf(o) || "" : "", e = easter(d.getFullYear());
    if (d >= e && d <= addDays(e, 7)) return "easterA";
    if (base === "nativity" || base === "epiphany") return base;
    if (rank === "Solemnity" || rank === "Feast") return BVM.test(o.t + " " + o.n.join(" ")) ? "bvm" : rank.toLowerCase();
    if (["advent", "lent", "easterA", "ascA"].indexOf(base) >= 0) return base;
    if (base === "baptism") return "feast";
    if (base === "pentecost" || base === "heart") return "solemnity";
    if (/Memorial/.test(rank) && d.getDay() !== 0) return "memorial";   // an optional memorial the Liber keeps, too (the user, 8 Nov 2026)
    return d.getDay() === 0 ? "sunday" : "ferial";
  }
  function seasonWords(season) { return season === "year" ? "through the year" : season === "Ascension to Pentecost" ? "from the Ascension to Pentecost" : "of " + season; }
  function sextRecipe() {
    if (!asm || !asm.marks || plain || state.ref || state.book !== "psalter" || state.hour !== 2) return null;
    var e = asm.marks[fileKey(state.week, state.day, 2)];
    if (!e) return null;
    var d = dayDate(), bvm = d.getDay() === 6 && bvmSaturday(d), season = seasonOf(d), hk = sextHymn(d, bvm), S = asm.sext;
    var items = [S.opening, { h: "Hymn: " + SEXT_HYMN[hk] }, S.hymns[hk]].concat(cutFile(e, season, bvm), [{ h: "Conclusion" }, S.conclusion]);
    return { key: "sext:" + fileKey(state.week, state.day, 2) + ":" + season + ":" + bvm + ":" + hk, items: items,
      note: "Pasted together: Sext with the hymn " + SEXT_HYMN[hk] + " and only the antiphon, reading and versicle " +
        (bvm ? "of the Saturday Commemoration of the Blessed Virgin Mary" : seasonWords(season)) + "." };
  }
  function saturdayRecipe() {
    if (!asm || !asm.marks || plain || state.ref || state.book !== "psalter" || state.day !== 6 || state.hour > 1) return null;
    var d = dayDate(), bvm = bvmSaturday(d), season = seasonOf(d), hour = state.hour === 0 ? "matins" : "lauds";
    if (bvm && (season === "Paschaltide" || season === "Ascension to Pentecost"))
      return { key: "ptbvm:" + hour, items: [{ h: "Office of the Blessed Virgin Mary on Saturday in Paschaltide" }].concat(asm.ptbvm[hour]),
        note: "Saturday Commemoration of the Blessed Virgin Mary (from the abbey's list): her own office for Paschaltide." };
    var e = asm.marks[fileKey(state.week, 6, state.hour)];
    if (!e) return null;
    var light = inLight(d);
    return { key: "sat:" + fileKey(state.week, 6, state.hour) + ":" + season + ":" + bvm + ":" + light, items: cutFile(e, season, bvm, light), hymns: !bvm && hasHymnPair(e),
      note: bvm ? "Pasted together: the Saturday Commemoration of the Blessed Virgin Mary (from the abbey's list): only Our Lady's texts where the book gives a choice."
                : "Pasted together: Saturday " + seasonWords(season) + ", without the texts for Our Lady's Saturday." };
  }
  function matinsRecipe() {
    if (!asm || !asm.marks || plain || state.ref || state.book !== "psalter" || state.hour !== 0 || state.day === 0 || state.day === 6) return null;
    var e = asm.marks[fileKey(state.week, state.day, 0)];
    if (!hasHymnPair(e)) return null;
    var light = inLight(dayDate());
    return { key: "matins:" + fileKey(state.week, state.day, 0) + ":" + light, items: cutFile(e, "year", false, light), hymns: true, note: "" };
  }
  // The weekly Matins, Lauds and Vespers (books/seasons.py marks them like Sext): only the texts for the day's season
  // where the book prints them for each season ("Through the Year :", "Advent :" … "Paschaltide :"), the weekday Matins
  // hymn for darkness or light, and on Sunday the Te Deum chosen. Holy Week and Palm Sunday have their own texts.
  function cutSeason(d) {
    var s = seasonOf(d), e = easter(d.getFullYear());
    if (s === "Passiontide" && d >= addDays(e, -7)) return d.getDay() === 0 ? "Palm Sunday" : "Holy Week";
    return s;
  }
  function replaceFrom(items, path, pt, extra) {   // the rest of that page gives way to the extra pieces
    items = cutAt(items, path, pt);
    var out = [], put = false;
    items.forEach(function (it) {
      if (Array.isArray(it) && it[0] === path && it[1] === pt[0] && it[2] >= pt[1] - 1e-6) { if (!put) { out = out.concat(extra); put = true; } return; }
      if (!put && after(it, path, pt)) { out = out.concat(extra); put = true; }
      out.push(it);
    });
    return put ? out : out.concat(extra);
  }
  function weekRecipe() {
    if (!asm || !asm.marks || plain || state.ref || state.book !== "psalter" || state.hour === 2 || state.hour === 4) return null;
    if (state.day === 6 && state.hour <= 1) return null;   // Saturday: saturdayRecipe
    var path = fileKey(state.week, state.day, state.hour), e = asm.marks[path];
    if (!e) return null;
    var d = dayDate(), season = cutSeason(d), light = inLight(d), items = cutFile(e, season, false, light), te = "";
    var f = state.hour === 0 && state.day === 0 && asm.tedeum && asm.tedeum.files[path], v = f && asm.tedeum.versions[teChoice];
    if (v) {
      items = replaceFrom(items, path, f.te, [{ h: "Te Deum · " + v.label }].concat(v.te));
      if (teChoice === "latin") items = replaceFrom(items, path, f.decet, [{ h: "Te decet laus · Latin" }].concat(v.decet));
      te = " and the Te Deum " + v.label.replace(/^English, /, "in English, ");
    }
    return { key: "week:" + path + ":" + season + ":" + light + ":" + teChoice, items: items, hymns: hasHymnPair(e),
      note: "Pasted together: only the texts " + seasonWords(season) + " where the book gives a choice" + te + "." };
  }
  // At Matins, the day's two readings go in their places: under "First Reading" and "Second Reading", before each
  // responsory (assembly.json "readings"); readings.js writes them there.
  function withReadings(recipe) {
    if (!recipe || !asm || !asm.readings || state.book !== "psalter" || state.hour !== 0 || state.ref) return recipe;
    var path = fileKey(state.week, state.day, 0), at = asm.readings[path];
    if (!at) return recipe;
    // Saturday prints the readings twice: the ferial place ("I.") and Our Lady's ("II.", "two"): her Saturdays take hers
    if (at.two && state.day === 6 && bvmSaturday(dayDate())) at = at.two;
    var items = recipe.items;
    ["Patristic", "Biblical"].forEach(function (k) { if (at[k]) items = pasteAt(items, path, at[k], [{ lect: k, swapped: !!at.swapped }]); });
    return { key: recipe.key + ":lect", items: items, hymns: recipe.hymns, note: recipe.note, magnificat: recipe.magnificat };
  }
  // The hebdomadarian's Proper (proper.js; places from books/seasons.py, assembly.json "proper_at"): the capitulum under
  // "Reading" at Lauds, Sext and Vespers, the Oration under "Prayer from the Proper" (at Sext, before the Conclusion).
  // The printed reading or prayer gives way only to a typed one.
  function withProper(recipe) {
    if (!recipe || !window.PROPER || !asm || !asm.proper_at || state.ref || state.book !== "psalter" || state.hour === 4) return recipe;
    var pl = PROPER.plan(dayDate(), HOURS[state.hour]);
    if (!pl || (!pl.cap && !pl.ora)) return recipe;
    var path = fileKey(state.week, state.day, state.hour), at = asm.proper_at[path] || {}, items = recipe.items;
    if (pl.cap && at.reading) {
      if (pl.cap.text && state.hour === 1) items = leaveOut(items, path, at.reading[0], at.reading[1]);   // Lauds: the feast's, not the psalter's
      items = pasteAt(items, path, at.reading[0], [{ proper: "cap" }]);
    }
    if (pl.ora) {
      if (state.hour === 2) {
        var c = -1; items.forEach(function (it, k) { if (!Array.isArray(it) && it.h === "Conclusion") c = k; });
        if (c >= 0) items = items.slice(0, c).concat([{ proper: "ora" }], items.slice(c));
      } else if (at.oration) {
        if (pl.ora.lines) items = leaveOut(items, path, at.oration[0], at.oration[1]);
        items = pasteAt(items, path, at.oration[0], [{ proper: "ora" }]);
      }
    }
    return { key: recipe.key + ":pr:" + pl.sig, items: items, hymns: recipe.hymns, note: recipe.note, magnificat: recipe.magnificat };
  }
  function hymnNote(recipe) {
    var el = $("#hymn-note"), d = dayDate();
    if (!recipe || !recipe.hymns) { el.hidden = true; return; }
    var light = inLight(d), auto = hymnLight === null;
    el.textContent = "";
    el.appendChild(document.createTextNode("Hymn " + (light ? "for when the Office begins in light" : "for when the Office begins in darkness") +
      (auto ? " (dawn at the abbey " + clock(dawnMinutes(d)) + ", Matins " + clock(matinsStart(d)) + "). " : ". ")));
    var a = document.createElement("a"); a.href = "#"; a.textContent = light ? "Use the darkness hymn" : "Use the daylight hymn";
    a.addEventListener("click", function (ev) { ev.preventDefault(); hymnLight = !light; try { localStorage.setItem("psalter-hymn", JSON.stringify([ymd(d), hymnLight])); } catch (x) {} render(); });
    el.appendChild(a);
    if (!auto) {
      var r = document.createElement("a"); r.href = "#"; r.textContent = "Go by the dawn"; r.style.marginLeft = ".6em";
      r.addEventListener("click", function (ev) { ev.preventDefault(); hymnLight = null; try { localStorage.removeItem("psalter-hymn"); } catch (x) {} render(); });
      el.appendChild(document.createTextNode(" · ")); el.appendChild(r);
    }
    el.hidden = false;
  }
  try { var hs = JSON.parse(localStorage.getItem("psalter-hymn") || "null"); if (hs && hs[0] === ymd(new Date())) hymnLight = hs[1]; } catch (x) {}
  // The Te Deum at Sunday Matins: the book prints it spoken, in English; the Ordinary has it sung in English
  // (Mode IV, Mode VII) and in Latin. The choice is remembered on this phone.
  var TEDEUM = { book: "English, as printed here" }, teChoice = "book";
  try { teChoice = localStorage.getItem("psalter-tedeum") || "book"; } catch (x) {}
  function tedeumFile() {
    return asm && asm.tedeum && !plain && !state.ref && state.book === "psalter" && state.hour === 0 && state.day === 0 && asm.tedeum.files[fileKey(state.week, 0, 0)];
  }
  function tedeumRecipe() {
    var f = tedeumFile(), v = f && asm.tedeum.versions[teChoice];
    if (!v) return null;
    var path = fileKey(state.week, 0, 0), items = [];
    for (var p = 0; p < f.pages; p++) {
      if (p === f.te[0]) { items.push([path, p, 0, f.te[1], f.first + p], { h: "Te Deum · " + v.label }); items = items.concat(v.te); continue; }
      if (p === f.decet[0] && teChoice === "latin") { items.push([path, p, 0, f.decet[1], f.first + p], { h: "Te decet laus · Latin" }); items = items.concat(v.decet); continue; }
      items.push([path, p, 0, 1, f.first + p]);
    }
    return { key: "tedeum:" + path + ":" + teChoice, items: items, note: "Pasted together: Sunday Matins with the Te Deum " + v.label.replace(/^English, /, "in English, ") + "." };
  }
  function tedeumNote() {
    var el = $("#tedeum-note"), f = tedeumFile(), fh = feastHours(), feast = !!fh && fh.some(function (x) { return x.ins === "tedeum"; });
    el.hidden = !f && !feast;
    if (!f && !feast) return;
    el.textContent = "Te Deum: ";
    var sel = document.createElement("select"); sel.setAttribute("aria-label", "Te Deum");
    (feast ? [] : [["book", TEDEUM.book]]).concat(Object.keys(asm.tedeum.versions).map(function (k) { return [k, asm.tedeum.versions[k].label]; })).forEach(function (o) {
      var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; op.selected = o[0] === teChoice || feast && teChoice === "book" && o[0] === "mode4"; sel.appendChild(op);
    });
    sel.addEventListener("change", function () { teChoice = sel.value; try { localStorage.setItem("psalter-tedeum", teChoice); } catch (x) {} render(); });
    el.appendChild(sel);
  }
  // A feast in the Saints book, one hour pasted together: its own pages, with the proper psalms, the Gospel canticle and
  // the Te Deum put in where it points to them (assembly.json "feasts", from books/tools/feasts.py). Sext also gets the
  // psalter's opening, the hymn for the day (On Feasts, On Solemnities, Our Lady) and the conclusion.
  // The Magnificat: the plain (Simple) tone on ordinary days, the fancier (Solemn) one on Saturday evening (I Vespers of
  // Sunday), on Sunday and on solemnities; feasts go plain unless they fall then. A link switches it for the evening.
  var magnChoice = null;
  function magnificatAuto(hour) {
    var d = dayDate(), feastDay = /^I Vespers/.test(hour || "") ? addDays(d, 1) : d, o = ordoDay(feastDay);
    return d.getDay() === 6 || d.getDay() === 0 || rankOf(o) === "Solemnity";
  }
  function magnificatSolemn(hour) { return magnChoice === null ? magnificatAuto(hour) : magnChoice; }
  function toneNote(recipe) {
    var el = $("#tone-note");
    if (!recipe || !recipe.magnificat) { el.hidden = true; return; }
    var solemn = magnificatSolemn(bookHour), auto = magnChoice === null;
    el.textContent = "Magnificat in the " + (solemn ? "Solemn (fancier)" : "Simple (plainer)") + " tone" +
      (auto ? (solemn ? ": Saturday evening, Sunday or a solemnity. " : ": an ordinary evening. ") : ". ");
    var a = document.createElement("a"); a.href = "#"; a.textContent = solemn ? "Use the Simple tone" : "Use the Solemn tone";
    a.addEventListener("click", function (ev) { ev.preventDefault(); magnChoice = !solemn; render(); });
    el.appendChild(a); el.hidden = false;
  }
  function feastHours() {
    if (!asm || !asm.feasts || plain || state.ref || state.book !== "Sanctoral" || !books || !bookHour) return null;
    var h = asm.feasts.hours[books.Sanctoral.sections[state.sec.Sanctoral].path];
    return h && h[bookHour] ? h[bookHour] : null;
  }
  function feastRecipe() {
    var hs = feastHours(); if (!hs) return null;
    var sec = books.Sanctoral.sections[state.sec.Sanctoral], F = asm.feasts, hour = bookHour, lauds = hour === "Lauds", items = [];
    var v = asm.tedeum && (asm.tedeum.versions[teChoice] || asm.tedeum.versions.mode4);
    hs.forEach(function (x) {
      if (Array.isArray(x)) { items.push(x); return; }
      if (x.ins === "psalms") { items.push({ h: "Psalms (p. " + x.page + ")" }); items = items.concat(F.psalms[x.page] || []); items.push({ h: "Continued: " + sec.title.replace(/ \(.*/, "") }); }
      if (x.ins === "canticle") {
        items.push({ h: lauds ? "Benedictus" : "Magnificat" }); items = items.concat(lauds ? F.benedictus : F.magnificat);
        if (F.tones) {   // the words, then the same canticle with its English notes underneath
          var solemn = !lauds && magnificatSolemn(hour);
          items.push({ h: lauds ? "Benedictus · English, Simple Tone, Mode 1" : "Magnificat · English, " + (solemn ? "Solemn" : "Simple") + " Tone, Mode II D" });
          items = items.concat(lauds ? F.tones.benedictus.simple : F.tones.magnificat[solemn ? "solemn" : "simple"]);
        }
      }
      if (x.ins === "psalm94" && asm.weekly && asm.weekly.psalm94[x.mode]) { items.push({ h: "Psalm 94 · Mode " + x.label + " (sung by the cantors)" }); items = items.concat(asm.weekly.psalm94[x.mode]); }
      if (x.ins === "tedeum" && v) { items.push({ h: "Te Deum · " + v.label }); items = items.concat(v.te, [{ h: "Holy Gospel (from the lectionary)" }, { h: "Te decet laus" }], v.decet); }
    });
    if (hour === "Sext" && asm.sext) {
      var hk = sextHymn(dayDate(), false), S = asm.sext;
      items = [S.opening, { h: "Hymn: " + SEXT_HYMN[hk] }, S.hymns[hk], { h: sec.title.replace(/ \(.*/, "") + " · Sext" }].concat(items, [{ h: "Conclusion" }, S.conclusion]);
    }
    return { key: "feast:" + sec.path + ":" + hour + ":" + teChoice + ":" + (/Vespers/.test(hour) && magnificatSolemn(hour)), items: items, tedeum: hour === "Matins", magnificat: /Vespers/.test(hour),
      note: "Pasted together: " + sec.title + ", " + hour + ", from the Saints book, with the pages it points to put in their places." };
  }
  function simpleRecipe(sec) {
    if (!asm || !asm.feasts) return null;
    if (sec.recipe === "latin" && asm.feasts.tones) {
      var L = asm.feasts.tones.latin, li = [{ h: "Magnificat · Latin, Solemn Tone, Mode II (Saints)" }].concat(L.magnificat, [{ h: "Benedictus · Latin, Simple Tone, Mode 1 (Saints)" }], L.benedictus);
      (L.psalter || []).forEach(function (x) { li = li.concat([{ h: x[0] }], x[1]); });
      return { key: "feast-latin", note: "", items: li };
    }
    if (sec.recipe !== "simple") return null;
    var items = [];
    asm.feasts.simple.forEach(function (x) { items.push({ h: x.h }); items = items.concat(x.strips); });
    return { key: "feast-simple", items: items, note: "" };
  }
  // ---- Cutting and pasting into any hour: split the strips at a place in a file, leave a stretch out, put pieces in ----
  function cutAt(items, path, pt) {
    var out = [];
    items.forEach(function (it) {
      if (Array.isArray(it) && it[0] === path && it[1] === pt[0] && it[2] < pt[1] && pt[1] < it[3]) out.push([it[0], it[1], it[2], pt[1], it[4]], [it[0], it[1], pt[1], it[3], it[4]]);
      else out.push(it);
    });
    return out;
  }
  function after(it, path, pt) { return Array.isArray(it) && it[0] === path && (it[1] > pt[0] || it[1] === pt[0] && it[2] >= pt[1] - 1e-6); }
  function pasteAt(items, path, pt, extra) {
    items = cutAt(items, path, pt);
    for (var k = 0; k < items.length; k++) if (after(items[k], path, pt)) return items.slice(0, k).concat(extra, items.slice(k));
    return items.concat(extra);
  }
  function leaveOut(items, path, a, b) {
    items = cutAt(cutAt(items, path, a), path, b);
    return items.filter(function (it) { return !(after(it, path, a) && !after(it, path, b)); });
  }
  function wholeFile(path) {
    var f = asm.weekly.files[path], out = [];
    for (var p = 0; p < f.pages; p++) out.push([path, p, 0, 1, f.first + p]);
    return out;
  }
  // The weekly Matins: Psalm 94 after the invitatory, in its mode (the cantors sing it), without the simpler "Or:" copy.
  // The weekly Lauds: the sung English Benedictus (Mode 1, the Saints book's) under the words.
  // Both are one-line choices here if the community sings them otherwise.
  var MODE_NAME = { "IID": "II D", "VIId": "VII d", "I": "I", "II*VIII*": "II* and VIII*", "IVA": "IV A", "VI": "VI" };
  var BENEDICTUS_TONE = function () { return asm.feasts && asm.feasts.tones && asm.feasts.tones.benedictus.simple; };
  function weeklyExtras(recipe) {
    if (!asm || !asm.weekly || plain || state.ref || state.book !== "psalter" || state.hour > 1) return recipe;
    if (recipe && /^ptbvm/.test(recipe.key)) return recipe;
    var path = fileKey(state.week, state.day, state.hour), W = asm.weekly, items = recipe ? recipe.items : null, tag = "";
    if (state.hour === 0 && W.invitatory[path]) {
      var inv = W.invitatory[path], d = dayDate(), mode = state.day === 6 && bvmSaturday(d) && inv.modeBvm ? inv.modeBvm : inv.mode;
      items = items || wholeFile(path);
      if (inv.drop) items = leaveOut(items, path, inv.drop[0], inv.drop[1]);
      if (W.psalm94[mode]) items = pasteAt(items, path, inv.at, [{ h: "Psalm 94 · Mode " + (MODE_NAME[mode] || mode) + " (sung by the cantors)" }].concat(W.psalm94[mode]));
      tag = ":ps94:" + mode;
    } else if (state.hour === 1 && W.benedictus[path] && BENEDICTUS_TONE()) {
      items = pasteAt(items || wholeFile(path), path, W.benedictus[path], [{ h: "Benedictus · English, Simple Tone, Mode 1" }].concat(BENEDICTUS_TONE()));
      tag = ":ben1";
    } else return recipe;
    var add = state.hour === 0 ? "Psalm 94 after the invitatory, without the invitatory's simpler second setting" : "the Benedictus sung in English under its words";
    return { key: (recipe ? recipe.key : "whole:" + path) + tag, items: items, hymns: recipe && recipe.hymns,
      note: recipe && recipe.note ? recipe.note.replace(/\.$/, "") + "; with " + add + "." : "Pasted together: with " + add + "." };
  }
  function lentRecipe(sec) {
    if (!asm || sec.recipe !== "lent") return null;
    var items = [];
    asm.lent.forEach(function (x) {
      items.push({ h: x.section + (x.day && x.section.indexOf(x.day) < 0 ? " · " + x.day : "") + " · " + x.hour +
        (x.year !== "ABC" ? " · Year " + x.year : "") + (x.tone ? " (alternate tone p. " + x.tone + ")" : "") });
      items = items.concat(x.strips);
    });
    return { key: "lent-antiphons", items: items, note: "" };
  }
  var docs = {};
  function getDoc(path, idx, key) {
    if (!docs[path]) docs[path] = open(idx.pdfs[path], key).then(function (plainBuf) {
      return pdfjs().then(function (lib) { return lib.getDocument({ data: new Uint8Array(plainBuf.slice(0)) }).promise; });
    }, function (e) { delete docs[path]; throw e; });
    return docs[path];
  }
  // Cantus: the book's notation for a chant block, cut from its page (text.js leaves a figure with the block's place)
  function cropJob(page, fig, width, ratio) {
    var vp = page.getViewport({ scale: width * ratio / page.getViewport({ scale: 1 }).width });
    var top = +fig.dataset.y0 * vp.height, hgt = Math.max(1, (+fig.dataset.y1 - +fig.dataset.y0) * vp.height);
    var cv = document.createElement("canvas"); cv.width = Math.floor(vp.width); cv.height = Math.floor(hgt);
    cv.style.aspectRatio = cv.width + " / " + cv.height; fig.appendChild(cv);
    return function () { return page.render({ canvasContext: cv.getContext("2d"), viewport: vp, transform: [1, 0, 0, 1, 0, -top] }).promise; };
  }
  function textNote(text, missing) {
    var n = $("#text-note"); if (!n) return;
    n.hidden = !(text && missing);
    if (text && missing) n.textContent = "Not all of this hour is in text yet: the parts that aren't are shown as the book's pages.";
  }
  function drawRecipe(items, idx, key, token) {
    var box = $("#pdf-pages"); box.innerHTML = "";
    if (pager) pager.stop();
    var width = (box.clientWidth || window.innerWidth) * bookZoom();
    var ratio = Math.min(window.devicePixelRatio || 1, 2.5, 2000 / width);
    var paths = []; items.forEach(function (it) { if (Array.isArray(it) && paths.indexOf(it[0]) < 0) paths.push(it[0]); });
    var TX = window.PTEXT;
    return (TX ? TX.load(paths, idx, key, open) : Promise.resolve()).then(function () {
      return Promise.all(paths.map(function (p) { return getDoc(p, idx, key); }));
    }).then(function (ds) {
      var byPath = {}; paths.forEach(function (p, i) { byPath[p] = ds[i]; });
      return Promise.all(items.map(function (it) { return Array.isArray(it) ? byPath[it[0]].getPage(it[1] + 1) : null; }));
    }).then(function (pages) {
      if (vault.token !== token) return;
      var jobs = [], text = TX && TX.on(), missing = 0, pageOf = {};
      items.forEach(function (it, i) { if (Array.isArray(it)) pageOf[it[0] + "#" + it[1]] = pages[i]; });
      if (TX) TX.begin();
      items.forEach(function (it, i) {
        if (TX && !Array.isArray(it)) TX.cut();
        if (Array.isArray(it) && text && TX.has(it[0], it[1])) {         // the same strip, as set text (text.js)
          var sec = TX.strip(it[0], it[1], it[2], it[3]); box.appendChild(sec);
          sec.querySelectorAll(".tx-chant-img").forEach(function (fig) { jobs.push(cropJob(pageOf[fig.dataset.src + "#" + fig.dataset.pg] || pages[i], fig, width, ratio)); });   // a repeated antiphon: from its own page
          return;
        }
        if (Array.isArray(it) && text) { missing++; TX.cut(); }
        if (it.proper) { var ps = document.createElement("section"); ps.className = "proper proper-slot"; ps.dataset.part = it.proper; box.appendChild(ps); return; }   // proper.js
        if (it.lect) { var sl = document.createElement("section"); sl.className = "lect lect-slot"; sl.dataset.kind = it.lect; if (it.swapped) sl.dataset.swapped = "1"; box.appendChild(sl); return; }   // a reading (readings.js)
        if (!Array.isArray(it)) { var h = document.createElement("p"); h.className = "asm-head"; h.textContent = it.h; box.appendChild(h); return; }
        var page = pages[i], vp = page.getViewport({ scale: width * ratio / page.getViewport({ scale: 1 }).width });
        var top = it[2] * vp.height, hgt = Math.max(1, (it[3] - it[2]) * vp.height);
        var cv = document.createElement("canvas"); cv.className = "strip";
        cv.width = Math.floor(vp.width); cv.height = Math.floor(hgt); cv.dataset.p = it[4];
        cv.style.aspectRatio = cv.width + " / " + cv.height; cv.setAttribute("aria-label", "From page " + it[4]);
        box.appendChild(pageBox_(cv, it[0], it[1], it[2], it[3], true));
        jobs.push(function () { return page.render({ canvasContext: cv.getContext("2d"), viewport: vp, transform: [1, 0, 0, 1, 0, -top] }).promise; });
      });
      textNote(text, missing);
      if (window.LECT) LECT.pages();
      if (window.PROPER) PROPER.pages();
      var f = parseFloat(box.dataset.restore); box.dataset.restore = "";
      if (f > 0) scrollTo(0, box.getBoundingClientRect().top + scrollY + f * box.getBoundingClientRect().height);
      pageLabel();
      return jobs.reduce(function (c, j) { return c.then(function () { if (vault.token === token) return j(); }); }, Promise.resolve());
    });
  }

  // ---- The end of the day (Br. Augustine) ----
  // On the haustus days, Wednesday and Sunday, the community sings the Ultima instead of Compline.
  // A feast or solemnity on a haustus day normally has no haustus, so Compline is the default then; the Abbot may decide otherwise.
  var ULTIMA = "Ultima (Wednesday and Sunday, instead of Compline).pdf", wantCompline = null;
  function haustus() { return state.day === 0 || state.day === 3; }
  function feastNight() { var r = rankOf(ordoDay(dayDate())); return r === "Feast" || r === "Solemnity"; }
  function complineTonight() { return wantCompline === null ? feastNight() : wantCompline; }
  function ultima() { return state.hour === 4 && haustus() && !complineTonight() && !state.ref && state.book === "psalter"; }
  // After Compline or the Ultima: the brothers of our house who died on this day (read at dinner, remembered at the
  // end of the day).
  // The abbey's own necrology (vault "necro", made by books/necrology_text.py in the private repo): each brother's notice,
  // the text read the evening before his anniversary. Sealed, so it opens only once this phone has the password.
  var necroText = null, necroP = null;
  function loadNecro() {
    if (necroText || necroP) return;
    necroP = index().then(function (idx) {
      var k = idx.necro && (vault.key ? Promise.resolve(vault.key) : savedKey());
      if (!k) { necroP = null; return; }
      return k.then(function (key) { return open(idx.necro, key); }).then(function (b) {
        necroText = JSON.parse(new TextDecoder().decode(b)); dayEnd(); ordoNote();
      });
    }).catch(function () { necroP = null; });
  }
  function notices(md) { return necroText && necroText[md] || []; }
  function noticeFor(md, name) { return notices(md).filter(function (e) { return e.name === name; })[0] || null; }
  function noticeEl(e, label) {
    var dt = document.createElement("details"); dt.className = "de-notice";
    var sm = document.createElement("summary"); sm.textContent = label || "Read his necrology"; dt.appendChild(sm);
    var r = document.createElement("p"); r.className = "de-read"; r.textContent = "Read on the evening of " + e.read + ".";
    dt.appendChild(r);
    e.paras.forEach(function (t) { var q = document.createElement("p"); q.textContent = t; dt.appendChild(q); });
    return dt;
  }
  // The U.S. civic days the abbey keeps as optional memorials (the user, 30 Oct 2026): 4 July, Labor Day, Thanksgiving
  function civicDay(d) {
    var m = d.getMonth(), dd = d.getDate(), wd = d.getDay();
    if (m === 6 && dd === 4) return "Independence Day";
    if (m === 8 && wd === 1 && dd <= 7) return "Labor Day";
    if (m === 10 && wd === 4 && dd >= 22 && dd <= 28) return "Thanksgiving Day";
    return null;
  }
  function dayEnd() {
    var box = $("#day-end"), d = dayDate(), md = ymd(d).slice(5);
    box.innerHTML = "";
    if (state.ref) { box.hidden = true; return; }
    var nec = extrasData.necrology;
    if (state.book === "psalter" ? state.hour === 4 : /^Compline/.test(bookHour || "")) {   // also after a Compline in the Saints book (All Souls)
      var h = document.createElement("h2"); h.textContent = "Necrology"; box.appendChild(h);
      var when = document.createElement("p"); when.className = "de-when";
      when.textContent = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      box.appendChild(when);
      var all = nec && nec.days[md] || [], ours = all.filter(function (n) { return n[3] === nec.ours; });
      var p = document.createElement("p"); p.className = "de-lead";
      p.textContent = !nec ? "Loading…" : ours.length ? "Let us remember our brothers of Saint Bernard Abbey who died on this day:" : "No brother of Saint Bernard Abbey died on this day.";
      box.appendChild(p);
      loadNecro();
      var listed = all.map(function (n) { return n[0] + " " + n[1]; });
      var extra = notices(md).filter(function (e) { return listed.indexOf(e.name) < 0; });   // in our necrology, not (yet) in the Congregation's list
      if (extra.length && !ours.length) p.textContent = "Let us remember our brothers of Saint Bernard Abbey who died on this day:";
      if (ours.length || extra.length) {
        var ul = document.createElement("ul"); ul.className = "de-names";
        ours.map(function (n) { return [n[0] + " " + n[1], n[2]]; }).concat(extra.map(function (e) { return [e.name, e.year]; })).forEach(function (n) {
          var li = document.createElement("li"); li.appendChild(document.createTextNode(n[0]));
          var y = document.createElement("span"); y.textContent = n[1]; li.appendChild(y);
          var e = noticeFor(md, n[0]); if (e) li.appendChild(noticeEl(e));
          ul.appendChild(li);
        });
        box.appendChild(ul);
      }
      var rest = all.filter(function (n) { return n[3] !== nec.ours; });
      if (rest.length) {
        var det = document.createElement("details"), sm = document.createElement("summary"); sm.textContent = "The rest of the Congregation (" + rest.length + ")";
        det.appendChild(sm);
        rest.forEach(function (n) {
          var q = document.createElement("p"); q.textContent = n[0] + " " + n[1] + ", " + (nec.houses[n[3]] || n[3]) + ", " + n[2]; det.appendChild(q);
          var e = noticeFor(md, n[0] + " " + n[1]); if (e) det.appendChild(noticeEl(e));   // Archabbot Boniface Wimmer
        });
        box.appendChild(det);
      }
      var rip = document.createElement("p"); rip.className = "de-rip";
      rip.textContent = "May they and all the faithful departed, through the mercy of God, rest in peace. Amen.";
      box.appendChild(rip);
      if (haustus() && state.book === "psalter") {
        var sw = document.createElement("p"); sw.className = "de-switch";
        var on = complineTonight(), a = document.createElement("a"); a.href = "#"; a.textContent = on ? "Show the Ultima instead" : "Show Compline instead";
        a.addEventListener("click", function (e) { e.preventDefault(); wantCompline = !on; render(); scrollTo(0, 0); });
        sw.appendChild(document.createTextNode(feastNight()
          ? "A " + rankOf(ordoDay(dayDate())).toLowerCase() + " on a haustus day: normally no haustus, so Compline. If the Abbot keeps the haustus, the Ultima is sung instead. "
          : "Wednesday and Sunday are haustus days: the Ultima instead of Compline. "));
        sw.appendChild(a); box.insertBefore(sw, box.firstChild);
      }
      box.hidden = false; return;
    }
    // (The Benedictine Supplement's collect used to follow Matins, Lauds and Vespers here, "until our own Proper of the
    // Saints is here". The Liber's Oration is now in the hour itself (proper.js); a second collect, for a saint the
    // abbey may not keep (Meinrad, Gall, Ottilia …), read as if the day were his: dropped 8 Nov 2026.)
    box.hidden = true;
  }

  // ---- Page numbers: printed page = PDF page - the book's offset ----
  var current = null;   // the section on screen: { offset, start }
  function bookKey() { return state.book === "psalter" ? "Psalter" : state.book; }
  function whereIs(path) {
    if (!books) return null;
    for (var b in books) {
      var secs = books[b].sections;
      for (var k = 0; k < secs.length; k++) if (secs[k].path === path) return { offset: books[b].offset, start: secs[k].start };
    }
    return null;
  }
  function pageLabel() {
    var el = $("#page-label"), view = $("#pdf-view");
    var cvs = $("#pdf-pages").querySelectorAll("canvas"), at = -1, line = window.innerHeight * 0.4;
    var strips = cvs.length && cvs[0].dataset.p;
    if ((!current && !strips) || view.hidden) { el.hidden = true; return; }
    for (var i = 0; i < cvs.length; i++) { if (cvs[i].getBoundingClientRect().top <= line) at = i; else break; }
    if (at < 0) at = 0;
    var n = strips ? +cvs[at].dataset.p : current.start + at - current.offset;
    var past = cvs.length && cvs[cvs.length - 1].getBoundingClientRect().bottom < line;   // reading on below the pages (the Matins readings)
    el.textContent = "p. " + n; el.hidden = !cvs.length || n < 1 || past;
  }
  window.addEventListener("scroll", pageLabel, { passive: true });

  function pageBox(open) {
    var box = $("#pagebox"), btn = $("#page-btn");
    box.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    $("#page-msg").textContent = "";
    if (open) { $("#page-book").textContent = books ? books[bookKey()].label : "Psalter"; $("#page-n").focus(); }
  }
  function goPage(n) {
    var b = bookKey(), book = books && books[b];
    if (!book) return "The page list is still loading. Try again in a moment.";
    var pdf = n + book.offset, secs = book.sections, first = Infinity, last = 0;
    for (var k = 0; k < secs.length; k++) {
      var s = secs[k];
      first = Math.min(first, s.start - book.offset); last = Math.max(last, s.start + s.pages - 1 - book.offset);
      if (pdf >= s.start && pdf < s.start + s.pages) {
        pendingJump = ["p. " + n, pdf - s.start, 0]; bookHour = null;
        state.ref = b === "Psalter" ? s.path : null;
        if (b !== "Psalter") state.sec[b] = k;
        render();
        return "";
      }
    }
    return "Page " + n + " isn't here. " + book.label + " runs from page " + Math.max(1, first) + " to " + last + ".";
  }

  // Scroll to the hour chosen in "Go to", once its page is laid out
  var pendingJump = null, bookHour = null;
  function goJump() {
    if (!pendingJump) return;
    if (feastHours()) { pendingJump = null; return; }
    var cv = $("#pdf-pages").querySelectorAll("canvas")[pendingJump[1]];
    if (!cv) return;
    var r = cv.getBoundingClientRect(), bar = document.querySelector(".pickbar").getBoundingClientRect();
    var barH = getComputedStyle(document.querySelector(".pickbar")).display === "none" ? 0 : bar.height;
    scrollTo(0, Math.max(0, r.top + scrollY + Math.max(0, pendingJump[2] - 0.03) * r.height - barH - 6));
    pendingJump = null;
    if (pager) pager.next();
    pageLabel();
  }

  function label(k) {
    var parts = k.replace(/\.pdf$/, "").split("/");
    return parts.map(function (p) { return p.replace(/^\d+ /, ""); }).filter(function (p) { return !/same every week/.test(p); }).join(", ");
  }
  function msg(t) { var m = $("#vault-msg"); m.textContent = t || ""; m.hidden = !t; }

  // Show the current hour (or reference section): the Beta text if chosen and ready, else the PDF.
  function show() {
    var token = vault.token = {};
    if (window.LECT) LECT.update();
    if (window.PROPER) PROPER.update();
    var inBook = state.book !== "psalter" && books;
    if (!state.ref && easterNote()) { $("#pdf-view").hidden = true; $("#beta-view").hidden = true; msg(""); return; }   // Easter Sunday: no Matins or Lauds
    var path = state.ref || (inBook ? books[state.book].sections[state.sec[state.book]].path : ultima() ? ULTIMA : fileKey(state.week, state.day, state.hour));
    index().then(function (idx) {
      if (vault.token !== token) return;
      var hourFile = !state.ref && !inBook && betaOn && idx.hours[path];
      var note = "";
      if (betaOn && !state.ref && !hourFile) note = "This hour isn't in the Beta yet, so here is the book. In the Beta so far: " + Object.keys(idx.hours).map(label).join("; ") + ".";
      $("#beta-note").textContent = note; $("#beta-note").hidden = !note;
      var file = hourFile || idx.pdfs[path];
      current = whereIs(path);
      var recipe = inBook ? feastRecipe() || lentRecipe(books[state.book].sections[state.sec[state.book]]) || simpleRecipe(books[state.book].sections[state.sec[state.book]]) : withReadings(withProper(weeklyExtras(sundayRecipe() || complineRecipe() || sextRecipe() || saturdayRecipe() || weekRecipe() || matinsRecipe() || tedeumRecipe())));
      window.PSALTER_IN.recipe = recipe;   // what was pasted together (for checking it)
      hymnNote(recipe); tedeumNote(); toneNote(recipe);
      $("#asm-note-text").textContent = recipe ? recipe.note : ""; $("#asm-note").hidden = !recipe || !recipe.note;
      $("#plain-note").hidden = !plain || !!state.ref || !(state.hour === 4 && !ultima() || state.hour === 2 || state.day === 6 && state.hour <= 1 || state.hour <= 1 || state.book === "Sanctoral" && !!bookHour || state.hour === 3);
      var keyP = vault.key ? Promise.resolve(vault.key) : savedKey();
      if (!keyP) { $("#lock").hidden = false; $("#beta-view").hidden = true; $("#pdf-view").hidden = true; return; }
      $("#lock").hidden = true;
      return keyP.then(function (key) {
        vault.key = key;
        if (recipe) {
          $("#beta-view").hidden = true; $("#pdf-view").hidden = false; msg("");
          // "done" only once drawn: a drawing cut short by a newer one (e.g. the Proper arriving) must not count as shown
          if ($("#pdf-pages").dataset.done === recipe.key) { goJump(); return; }
          $("#pdf-pages").dataset.file = recipe.key; $("#pdf-pages").dataset.done = ""; current = null;
          msg("Opening…");
          return drawRecipe(recipe.items, idx, key, token).then(function () { if (vault.token === token) { msg(""); $("#pdf-pages").dataset.done = recipe.key; } });
        }
        var isBeta = !!hourFile, cached = !!vault.cache[file];
        if (!cached) msg("Opening…");
        return open(file, key).then(function (plain) {
          if (vault.token !== token) return;
          msg("");
          $("#beta-view").hidden = !isBeta; $("#pdf-view").hidden = isBeta;
          if (isBeta) {
            var content = $("#beta-content");
            if (content.dataset.page !== path) { content.innerHTML = new TextDecoder().decode(plain); content.dataset.page = path; }
            openPicks(content);
          } else if ($("#pdf-pages").dataset.done !== file) {
            $("#pdf-pages").dataset.file = file; $("#pdf-pages").dataset.done = "";
            return drawPdf(plain, token, path).then(function () { if (vault.token === token) $("#pdf-pages").dataset.done = file; });
          } else goJump();
        });
      });
    }).catch(function (e) {
      if (vault.token !== token) return;
      if (e && e.name === "OperationError") { store("psalter-key", null); vault.key = null; $("#lock").hidden = false; msg(""); return; }
      msg("Couldn't open this just now. Check the connection and try again.");
    });
  }

  $("#lock").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("#pw").value; if (!pw) return;
    $("#lock-msg").textContent = "Opening…";
    index().then(function (idx) {
      return deriveKey(pw).then(function (key) {
        var any = idx.pdfs[fileKey(state.week, state.day, state.hour)] || Object.values(idx.pdfs)[0];
        return open(any, key).then(function () {
          store("psalter-key", { salt: idx.salt, raw: b64(key._raw) }); store("psalter-beta-pw", null);
          vault.key = key; $("#lock-msg").textContent = ""; $("#pw").value = ""; show();
        });
      });
    }).catch(function (e) {
      $("#lock-msg").textContent = e && e.name === "OperationError" ? "That isn't the password." : "Couldn't check it just now. Check the connection and try again.";
    });
  });

  // Compline: which hymn and which antiphon of Our Lady fit a date.
  // Memorials, feasts and solemnities of the saints are left for the monk to choose.
  function same(a, b) { return daysBetween(a, b) === 0; }
  function compline(date) {
    var d = midnight(date), y = d.getFullYear(), m = d.getMonth(), dd = d.getDate();
    var e = easter(y), adv = firstAdventSunday(y), bapt = endOfChristmastide(y);
    var ash = addDays(e, -46), asc = addDays(e, 42), pent = addDays(e, 49);
    var hymn = (d.getDay() === 0 || d.getDay() === 6) ? "satsun" : "ferial";
    if (m === 7 && dd === 6) hymn = "transfig";
    if (same(d, addDays(adv, -7))) hymn = "king";
    if (d >= adv && d < new Date(y, 11, 25)) hymn = "advent";
    else if (m === 11 && dd >= 25) hymn = "nativity";
    else if (m === 0 && d < bapt) hymn = d < epiphany(y) ? "nativity" : "epiphany";
    else if (same(d, bapt)) hymn = "baptism";
    else if (d >= ash && d < e) hymn = "lent";
    else if (d >= e && d < asc) hymn = "easterA";
    else if (d >= asc && d < pent) hymn = "ascA";
    else if (same(d, pent)) hymn = "pentecost";
    else if (same(d, addDays(pent, 14))) hymn = "nativity";      // Corpus Christi
    else if (same(d, addDays(pent, 19))) hymn = "heart";
    var marian = null;
    if (d >= addDays(adv, -1) || m === 0 || (m === 1 && dd <= 2)) marian = "alma";
    else if (d < addDays(e, -3)) marian = "ave";                    // until Wednesday of Holy Week
    else if (d < e) marian = null;                                  // the Triduum
    else if (d <= pent) marian = "regina";
    else marian = "salve";
    return { hymn: hymn, marian: marian };
  }
  function openPicks(root) {
    var t = dayDate(), pick = compline(t);
    root.querySelectorAll("details.pick").forEach(function (dt) {
      var mine = dt.dataset.hymn ? dt.dataset.hymn === pick.hymn : dt.dataset.marian === pick.marian;
      dt.classList.toggle("today", mine);
      if (dt.dataset.picked !== pickKey(t)) dt.open = mine;
      dt.dataset.picked = pickKey(t);
    });
  }
  function pickKey(t) { return t.toDateString(); }


  function fillBook() {
    var b = books[state.book], secSel = $("#sec"), jumpSel = $("#jump"), k = state.sec[state.book];
    if (secSel.dataset.book !== state.book) {
      secSel.innerHTML = ""; var group = null, og = null;
      b.sections.forEach(function (s, i) {
        if (s.group !== group) { group = s.group; og = document.createElement("optgroup"); og.label = group; secSel.appendChild(og); }
        var o = document.createElement("option"); o.value = i; o.textContent = s.title; og.appendChild(o);
      });
      secSel.dataset.book = state.book;
    }
    secSel.value = k;
    var sec = b.sections[k];
    jumpSel.innerHTML = "";
    var o0 = document.createElement("option"); o0.value = ""; o0.textContent = sec.jumps.length ? "Go to…" : "(one piece: no hours to jump to)"; jumpSel.appendChild(o0);
    sec.jumps.forEach(function (j, i) { var o = document.createElement("option"); o.value = i; o.textContent = j[0]; jumpSel.appendChild(o); });
    jumpSel.disabled = !sec.jumps.length;
    if (autoJump !== null && !touched) jumpSel.value = autoJump;
  }

  function render() {
    applyToday();
    var inBook = state.book !== "psalter" && books;
    document.querySelector(".pickbar").classList.toggle("in-book", !!inBook && !state.today);
    $(".book-picks").hidden = !inBook || state.today;
    document.querySelectorAll("[data-book]").forEach(function (b) { b.setAttribute("aria-pressed", String(state.today ? b.dataset.book === "today" : b.dataset.book === state.book)); });
    if (inBook) fillBook();
    if (!$("#pagebox").hidden && books) $("#page-book").textContent = books[bookKey()].label;
    if (viewing && !weekTouched) ordoWeek();
    todayNote(); ordoNote(); dayEnd();
    var vn = $("#view-note");
    vn.hidden = !viewing;
    if (viewing) $("#view-date").textContent = dayDate().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    var cb = document.querySelector('[data-hour="4"]'); cb.textContent = haustus() && !complineTonight() ? "Ultima" : "Compline";
    var weekly = state.hour <= 2;
    $("#now-title").textContent = DAYS[state.day] + (weekly ? " · Week " + ROMAN[state.week] : "") + " · " + (ultima() ? "Ultima" : HOURS[state.hour]);
    if (inBook) $("#now-title").textContent = books[state.book].label + " · " + books[state.book].sections[state.sec[state.book]].title;
    document.title = (state.ref ? label(state.ref) : $("#now-title").textContent) + " · Monastic Psalter";
    var note = "";
    if (cal.volume && !viewing && state.day === now.getDay() && !inBook) note = "Today falls in " + (cal.volume === "Lent" ? "Lent" : "Advent or Christmastide") + ": the choir uses the " + cal.volume + " volume. You can still use the four-week psalter here.";
    $("#season-note").textContent = note; $("#season-note").hidden = !note;
    var ow = weekOf(dayDate());
    document.querySelectorAll("[data-week]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(+b.dataset.week === state.week));
      b.classList.toggle("ordo-wk", +b.dataset.week === ow);
      b.title = +b.dataset.week === ow ? "The ordo's week" : "";
    });
    $("#auto-note-text").textContent = autoNote; $("#auto-note").hidden = !autoNote;
    document.querySelectorAll("[data-day]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.day === state.day)); });
    document.querySelectorAll("[data-hour]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.hour === state.hour)); });
    $("#ref-note").hidden = !state.ref;
    if (state.ref) $("#ref-name").textContent = label(state.ref);
    var lauds = $("#then-lauds");
    lauds.hidden = state.hour !== 0 || !!state.ref || !!inBook;
    if (state.hour === 0) lauds.onclick = function (e) { e.preventDefault(); state.hour = 1; render(); scrollTo(0, 0); };
    show();
  }

  // "Today in the books": the sections whose calendar tag fits today, as links
  function todayNote() {
    var n = $("#today-note");
    if (!books) { n.hidden = true; return; }
    n.innerHTML = "";
    var hits = Object.keys(books).map(function (b) { return [b, todayIn(b, dayDate())]; }).filter(function (h) { return h[1] >= 0; });
    hits.sort(function (a, b) { return (a[0] === "Sanctoral" ? 0 : 1) - (b[0] === "Sanctoral" ? 0 : 1); });
    hits = hits.filter(function (h) { return !(h[0] === state.book && state.sec[h[0]] === h[1]); });
    if (!hits.length) { n.hidden = true; return; }
    n.appendChild(document.createTextNode((viewing || state.day !== now.getDay() ? "This day" : "Today") + " in the books: "));
    hits.forEach(function (h, i) {
      if (i) n.appendChild(document.createTextNode(" · "));
      var a = document.createElement("a"); a.href = "#";
      a.textContent = books[h[0]].sections[h[1]].title + " (" + books[h[0]].label + ")";
      a.addEventListener("click", function (e) { e.preventDefault(); openSection(h[0], h[1], true); });
      n.appendChild(a);
    });
    n.hidden = false;
  }
  function openSection(book, k, toNow) {
    state.ref = null; state.book = book; state.sec[book] = k;
    var sec = books[book].sections[k], j = toNow ? jumpFor(sec, whenFor()) : -1;
    pendingJump = j >= 0 ? sec.jumps[j] : null; bookHour = pendingJump ? pendingJump[0] : null;
    if (!pendingJump || feastHours()) scrollTo(0, 0);
    render();
    if (j >= 0) $("#jump").value = j;
  }

  function pick(fn) { return function () { touched = true; autoNote = ""; state.ref = null; fn(this); render(); }; }
  document.addEventListener("click", function (e) { if (e.target.closest(".pickbar, #today-note, #pagebox")) { touched = true; if (!e.target.closest("#auto-note")) autoNote = ""; } }, true);
  document.querySelectorAll("[data-book]").forEach(function (b) {
    b.addEventListener("click", function () {
      var book = b.dataset.book;
      if (book === "today" && viewing) { location.replace(location.pathname + location.search); return; }   // another day was open: back to today's date
      if (book === "today") { state.ref = null; state.today = true; todayKey = null; scrollTo(0, 0); render(); return; }
      state.today = false; autoNote = "";
      if (book === "psalter" || !books) { state.ref = null; state.book = "psalter"; render(); return; }
      if (state.sec[book] === undefined) {   // first time in this book: today's section, else the first one
        var t = todayIn(book, dayDate());
        if (t >= 0) return openSection(book, t, true);
        state.sec[book] = 0;
      }
      openSection(book, state.sec[book], false);
    });
  });
  $("#page-btn").addEventListener("click", function () { pageBox($("#pagebox").hidden); });
  $("#page-x").addEventListener("click", function () { pageBox(false); });
  $("#pagebox").addEventListener("submit", function (e) {
    e.preventDefault();
    var n = parseInt($("#page-n").value, 10); if (!(n > 0)) return;
    var err = goPage(n);
    if (err) $("#page-msg").textContent = err; else { $("#page-n").blur(); pageBox(false); }
  });
  $("#sec").addEventListener("change", function () { openSection(state.book, +this.value, false); });
  $("#jump").addEventListener("change", function () {
    if (this.value === "") return;
    pendingJump = books[state.book].sections[state.sec[state.book]].jumps[+this.value]; bookHour = pendingJump[0];
    if (feastHours()) { render(); scrollTo(0, 0); } else goJump();
  });
  document.querySelectorAll("[data-week]").forEach(function (b) {
    b.addEventListener("click", pick(function (b) {
      state.week = +b.dataset.week; weekTouched = true;
      if (viewing) return;   // another day: just look, don't change this phone's week
      if (state.week === weekOf(now)) { state.autoWeek = true; store("psalter-anchor", null); return; }   // the ordo's week: follow the ordo again
      state.autoWeek = false;
      store("psalter-anchor", { week: state.week, sunday: sundayOf(now).toISOString() });
    }));
  });
  document.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", pick(function (b) { state.day = +b.dataset.day; wantCompline = null; magnChoice = null; })); });
  document.querySelectorAll("[data-hour]").forEach(function (b) { b.addEventListener("click", pick(function (b) { state.hour = +b.dataset.hour; })); });
  document.querySelectorAll("[data-ref]").forEach(function (a) {
    a.href = "#"; a.removeAttribute("target");
    a.addEventListener("click", function (e) { e.preventDefault(); state.ref = a.dataset.ref; render(); scrollTo(0, 0); });
  });
  $("#ref-back").addEventListener("click", function (e) { e.preventDefault(); state.ref = null; render(); });
  // ---- Text size (A− A+ in the day bar; Nov 2026) ----
  // One ladder, the same as Lumina's (munkachy/lumina, index.html SIZES): 0.7 to 2.6, 1 the usual size. Text modes scale
  // the words with CSS zoom (--psz); the book's pages are drawn wider (and the box scrolls sideways) or narrower.
  var SIZES = [0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.7, 1.95, 2.25, 2.6], sizeNow = 1;
  try { var sv = parseFloat(localStorage.getItem("psalter-size")); if (sv >= SIZES[0] && sv <= SIZES[SIZES.length - 1]) sizeNow = sv; } catch (x) {}
  function bookZoom() { return window.PTEXT && PTEXT.on() ? 1 : sizeNow; }
  function applySize() {
    document.documentElement.style.setProperty("--psz", sizeNow);
    var book = !(window.PTEXT && PTEXT.on());
    document.body.classList.toggle("pz-book", book && sizeNow !== 1);
    document.body.classList.toggle("pz-wide", book && sizeNow > 1);
    var lo = sizeNow <= SIZES[0] + 0.001, hi = sizeNow >= SIZES[SIZES.length - 1] - 0.001;
    $("#sz-minus").disabled = lo; $("#sz-plus").disabled = hi;
  }
  function stepSize(dir) {
    var v = sizeNow, n = dir > 0 ? SIZES.filter(function (x) { return x > v + 0.001; })[0] : SIZES.filter(function (x) { return x < v - 0.001; }).pop();
    if (n === undefined) return;
    sizeNow = n; try { localStorage.setItem("psalter-size", String(n)); } catch (x) {}
    var box = $("#pdf-pages"), r = box.getBoundingClientRect(), frac = r.height ? Math.max(0, -r.top) / r.height : 0;
    applySize();
    if (!(window.PTEXT && PTEXT.on())) {   // the book's pages are drawn again at the new width, where we were reading
      box.dataset.file = box.dataset.done = ""; box.dataset.restore = frac; show();
    }
  }
  $("#sz-minus").addEventListener("click", function () { stepSize(-1); });
  $("#sz-plus").addEventListener("click", function () { stepSize(1); });
  applySize();
  // ---- Version and updates (Nov 2026): the button shows the version and fetches the newest files when there are any ----
  // The version is the ?v= of app.js in index.html (bumped with every change). Checking reads index.html afresh; updating
  // fetches every file again past the phone's cache, then reloads.
  (function () {
    var FILES = ["text.js", "app.js", "readings.js", "proper.js", "picker.js", "app.css"], here = {}, btn = $("#ver-btn"), msg = $("#ver-msg"), newest = null;
    function vOf(u, f) { var m = new RegExp("(^|/)" + f.replace(".", "\\.") + "\\?v=(\\d+)").exec(u || ""); return m ? +m[2] : 0; }
    document.querySelectorAll("script[src], link[rel=stylesheet]").forEach(function (el) {
      var u = el.getAttribute("src") || el.getAttribute("href"); FILES.forEach(function (f) { if (vOf(u, f)) here[f] = vOf(u, f); });
    });
    var DATA = ["assembly.json", "books.json", "sanctoral.json", "ordo-2026.json", "house.json", "necrology.json", "collects.json", "relics.json", "saints.json?v=1", "vault/index.json"];
    function label() { btn.textContent = newest ? "Update to version " + newest["app.js"] : "Version " + (here["app.js"] || "?"); }
    function check(say) {
      return fetch("index.html", { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (t) {
        var latest = {}; FILES.forEach(function (f) { var m = new RegExp(f.replace(".", "\\.") + "\\?v=(\\d+)").exec(t); latest[f] = m ? +m[1] : here[f]; });
        newest = FILES.some(function (f) { return latest[f] !== here[f]; }) ? latest : null;
        label();
        msg.textContent = newest ? "A newer version is ready. Tap to update." : (say ? "You have the latest version. " : "");
        if (!newest && say) { var a = document.createElement("a"); a.href = "#"; a.textContent = "Refresh anyway"; a.addEventListener("click", function (e) { e.preventDefault(); update(); }); msg.appendChild(a); }
      }, function () { if (say) msg.textContent = "Couldn't check: no connection?"; });
    }
    function update() {
      msg.textContent = "Updating…";
      var urls = ["index.html"].concat(DATA);
      document.querySelectorAll("script[src], link[rel=stylesheet]").forEach(function (el) { urls.push(el.getAttribute("src") || el.getAttribute("href")); });
      if (newest) FILES.forEach(function (f) { urls.push(f + "?v=" + newest[f]); });
      return Promise.all(urls.map(function (u) { return fetch(u, { cache: "reload" }).catch(function () {}); })).then(function () { location.reload(); });
    }
    btn.addEventListener("click", function () { if (newest) update(); else check(true); });
    label(); check(false);
  })();
  // Redraw the PDF at the new width when the phone turns
  var lastW = window.innerWidth, turnT = null, readFrac = 0;
  window.addEventListener("scroll", function () {
    var r = $("#pdf-pages").getBoundingClientRect();
    if (r.height && window.innerWidth === lastW) readFrac = Math.max(0, -r.top) / r.height;
  }, { passive: true });
  window.addEventListener("resize", function () {
    if (Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth;
    var box = $("#pdf-pages"), frac = readFrac;   // where we were reading before the turn
    clearTimeout(turnT);
    turnT = setTimeout(function () {
      box.dataset.file = box.dataset.done = ""; box.dataset.restore = frac; show();
    }, 150);
  });

  document.querySelectorAll(".cal-day").forEach(function (t) { t.textContent = now.getDate(); });
  render();
  fetch("books.json").then(function (r) { return r.json(); }).then(function (b) {
    books = b;
    books.Lent.sections.splice(books.Lent.sections.findIndex(function (s) { return s.group === "Reference"; }), 0,
      { title: "Magnificat antiphons of Lent, cut out (all)", group: "Reference", tag: "", recipe: "lent", jumps: [], pages: 0, start: 0 });
    return fetch("assembly.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (a) {
      asm = a;
      // The Saints book's hours as read from its headings (assembly.json), which catch a few the first split missed
      if (asm.feasts) books.Sanctoral.sections.forEach(function (s) { if (asm.feasts.jumps[s.path]) s.jumps = asm.feasts.jumps[s.path]; });
      // The simpler settings cut out of the feasts ("Or:" with the same words), kept together in case they're wanted
      if (asm.feasts && asm.feasts.simple) books.Sanctoral.sections.splice(books.Sanctoral.sections.findIndex(function (s) { return s.group === "Reference"; }), 0,
        { title: "Simple versions, cut out of the feasts (all)", group: "Reference", tag: "", recipe: "simple", jumps: [], pages: 0, start: 0 },
        { title: "Latin Magnificat and Benedictus, sung (not used)", group: "Reference", tag: "", recipe: "latin", jumps: [], pages: 0, start: 0 });
    });
  }).then(function () { todayNote(); autoOpen(); render(); }, function () {});
  $("#auto-back").addEventListener("click", function (e) { e.preventDefault(); autoNote = ""; state.today = false; state.book = "psalter"; pendingJump = null; render(); scrollTo(0, 0); });
  $("#ordo-btn").addEventListener("click", function () {
    ordoOpen = !ordoOpen; this.setAttribute("aria-expanded", String(ordoOpen)); ordoNote();
  });
  $("#asm-plain").addEventListener("click", function (e) { e.preventDefault(); plain = true; render(); });
  if (window.PTEXT) PTEXT.buttons(function () { applySize(); $("#pdf-pages").dataset.done = ""; show(); });   // Book · Lectio · Cantus
  $("#asm-back").addEventListener("click", function (e) { e.preventDefault(); plain = false; render(); });
  // For readings.js: the day on screen, the ordo, the vault and the books
  window.PSALTER_IN = { dayDate: dayDate, ordoDay: ordoDay, rankOf: rankOf, ymd: ymd, addDays: addDays, daysBetween: daysBetween, same: same,
    easter: easter, firstAdventSunday: firstAdventSunday, epiphany: epiphany, endOfChristmastide: endOfChristmastide, sundayOf: sundayOf,
    index: index, open: open, getDoc: getDoc, books: function () { return books; }, label: label,
    key: function () { return vault.key ? Promise.resolve(vault.key) : vault.idx && savedKey() || null; },
    hour: function () {   // the hour on screen, by name: in a seasonal book, the hour chosen there ("I Vespers" counts as Vespers)
      if (state.ref) return null;
      if (state.book === "psalter") return state.hour === 4 ? null : HOURS[state.hour];
      var m = (bookHour || "").match(/Matins|Lauds|Sext|Vespers/); return m ? m[0] : null;
    },
    inBook: function () { return state.book !== "psalter" || plain; },
    today: function (d, hour) { return todayTarget(d, hour); },
    recipeFor: function (d, hour) {   // the psalter's recipe for a day and hour (the files it pastes from), state untouched
      var keep = { base: base, day: state.day, hour: state.hour, book: state.book, week: state.week, ref: state.ref };
      base = midnight(d); state.day = d.getDay(); state.hour = hour; state.book = "psalter"; state.ref = null;
      var w = weekOf(d); if (w !== null) state.week = w;
      var r = null;
      try { r = withReadings(withProper(weeklyExtras(sundayRecipe() || complineRecipe() || sextRecipe() || saturdayRecipe() || weekRecipe() || matinsRecipe() || tedeumRecipe()))); } catch (e) { r = null; }
      base = keep.base; state.day = keep.day; state.hour = keep.hour; state.book = keep.book; state.week = keep.week; state.ref = keep.ref;
      return r ? { key: r.key, files: Array.from(new Set(r.items.filter(Array.isArray).map(function (x) { return x[0]; }))) } : null;
    },   // for the season audit (munkachy/psalter books/tools/today_audit.js)
    offers: function (d, hour) {   // the sections of the seasonal and Saints books tagged for d with a jump for that hour
      var name = HOURS[hour], day = tagsFor(d).day, out = [];
      ["Advent-Christmas", "Lent", "Sanctoral"].forEach(function (bk) {
        var k = todayIn(bk, d); if (k < 0) return;
        var sec = books[bk].sections[k];
        sec.jumps.forEach(function (j, i) {
          var lab = j[0].replace(/ \(\d\)$/, ""), m = lab.match(/^(.*) · (.*)$/), who = m ? m[1] : null, h = m ? m[2] : lab;
          if (who && who !== day && who !== DAYS[d.getDay()]) return;
          if (h === name || name === "Vespers" && /^(I|II) Vespers$/.test(h)) out.push({ book: bk, k: k, j: i, title: sec.title, hour: j[0], path: sec.path });
        });
      });
      return out;
    },
    bvmSaturday: function (d) { return bvmSaturday(d); }, deadOffice: function (d, hour) { return deadOffice(d, hour); }, redraw: function () { render(); },
    matins: function () { return !state.ref && (state.book === "psalter" ? state.hour === 0 && !ultima() : /Matins/.test(bookHour || "")); },
    printed: function (src, pg) {   // the page number printed in the book, for a page of a file
      var w = whereIs(src); return w ? w.start + pg - w.offset : pg + 1;
    } };
  window.PSALTER = { seasonOf: seasonOf, sextHymn: sextHymn, complineFor: complineFor, nextHour: nextHour, weekOf: weekOf, epiphany: epiphany, ordoDay: ordoDay, sundayVespers: sundayVespers, tagsFor: tagsFor, todayIn: function (b, d) { return todayIn(b, d); }, jumpFor: jumpFor, books: function () { return books; }, compline: compline, calendar: calendar, easter: easter, firstAdventSunday: firstAdventSunday, endOfChristmastide: endOfChristmastide, hourFor: hourFor, fileKey: fileKey };
})();
