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
  var state = { week: cal.week, day: first.day, hour: first.hour, autoWeek: true, ref: null, book: "psalter", sec: {} };
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
      var width = box.clientWidth || window.innerWidth;
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
  var extrasData = {};   // the necrology and the Benedictine collects, for the ordo line
  ["necrology", "collects", "house"].forEach(function (k) {
    fetch(k + ".json").then(function (r) { return r.json(); }).then(function (j) { extrasData[k] = j; ordoNote(); dayEnd(); if (k === "house") render(); }, function () {});
  });
  // ---- The Congregation's ordo (ordo-YEAR.json, read from amcass.org's PDF by books/ordo.py) ----
  var ordos = {};
  function ordoYear(y) {
    if (!(y in ordos)) {
      ordos[y] = null;
      fetch("ordo-" + y + ".json").then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (o) { ordos[y] = o; ordoWeek(); autoOpen(); render(); }, function () {});
    }
    return ordos[y];
  }
  // The week of the psalter, as the ordo counts it (unless this phone has been set to another week)
  function weekOf(d) { var o = ordoDay(d); return o && o.w ? o.w - 1 : null; }
  function ordoWeek() { var w = weekOf(dayDate()); if ((state.autoWeek || viewing && !weekTouched) && w !== null) state.week = w; }
  // On a feast or solemnity the ordo names, open its section in the seasonal or Saints book at the hour
  // (I Vespers the evening before). Memorials and Sundays stay in the psalter for now.
  function rankOf(o) {
    var h = o && o.n.filter(function (n) { return /^St\. Bernard Abbey: .*\b(Solemnity|Feast)\b/.test(n); })[0];
    return h ? h.match(/\b(Solemnity|Feast)\b/)[1] : o && o.r;
  }
  var autoDone = false;
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
  function autoOpen() {
    if (autoDone || touched || !books || (state.hour === 4 && !deadOffice(dayDate(), "Compline"))) return;
    var d = dayDate(), o = ordoDay(d);
    if (o === null || o === undefined) return;
    autoDone = true;
    var eve = state.hour === 3 && (/^1st Vespers of following/.test(o.v) || o.n.some(function (n) { return /^St\. Bernard Abbey: 1st Vespers of following/.test(n); }));
    var t = eve ? addDays(d, 1) : d, ot = ordoDay(t);
    if (!eve && deadOffice(d, HOURS[state.hour]) && openDead(d)) return;
    if (!ot || !/Solemnity|Feast/.test(rankOf(ot) || "")) return;
    var want = eve ? ["I Vespers", "Vespers"] : [["Matins"], ["Lauds"], ["Sext"], ["II Vespers", "Vespers"]][state.hour];
    var order = ["Sanctoral", "Advent-Christmas", "Lent"];
    for (var b = 0; b < order.length; b++) {
      var k = todayIn(order[b], t);
      if (k < 0) continue;
      var sec = books[order[b]].sections[k];
      for (var w = 0; w < want.length; w++) for (var j = 0; j < sec.jumps.length; j++) {
        if (sec.jumps[j][0].replace(/ \(\d\)$/, "") !== want[w]) continue;
        state.book = order[b]; state.sec[order[b]] = k; pendingJump = sec.jumps[j]; bookHour = sec.jumps[j][0];
        autoNote = "Opened for you from the ordo: " + sec.title + " (" + books[order[b]].label + "), " + want[w] + ".";
        autoJump = String(j); render();
        return;
      }
    }
  }
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
  function ordoNote() {
    var el = $("#ordo-note"), d = dayDate(), o = !state.ref ? ordoDay(d) : null;
    if (!o) { el.hidden = true; return; }
    var ours = o.n.filter(function (n) { return OURS.test(n); }), rest = o.n.filter(function (n) { return !OURS.test(n); });
    el.innerHTML = "";
    var b = document.createElement("b"); b.textContent = "Ordo, " + d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + ": ";
    var v = o.v, next = /^1st Vespers of following\b/.test(v) && ordoDay(addDays(d, 1));
    if (next) v = "1st Vespers of " + clean(next.t).replace(/\.\s*(Solemnity|Feast|Memorial).*$/, "");   // name the day whose Vespers they are (OA: a holy day of obligation)
    el.appendChild(b);
    // A memorial, feast or solemnity (never an optional memorial: those are only in the "Or" notes) gets its rank in front
    var hn = o.n.filter(function (n) { return /^St\. Bernard Abbey: .*\b(Solemnity|Feast)\b/.test(n); })[0];
    if (hn) o = { t: hn.replace(/^St\. Bernard Abbey:\s*(?:(?:White|Red|Green|Violet|Rose)\s+)?/, "").replace(/\s*–.*$/, ""), r: rankOf(o), v: (hn.match(/–\s*(.+)$/) || [])[1] || o.v, n: o.n, w: o.w };   // what the house keeps
    if (hn) v = o.v;
    if (o.n.some(function (n) { return /^St\. Bernard Abbey: 1st Vespers of following/.test(n); })) {   // the house's own eve
      var nx = ordoDay(addDays(d, 1)), nh = nx && nx.n.filter(function (n) { return /^St\. Bernard Abbey: .*\b(Solemnity|Feast)\b/.test(n); })[0];
      if (nh) v = "1st Vespers of " + clean(nh.replace(/^St\. Bernard Abbey:\s*(?:(?:White|Red|Green|Violet|Rose)\s+)?/, "").replace(/\s*–.*$/, "")).replace(/\.\s*(Solemnity|Feast).*$/, "");
    }
    var name = clean(o.t).replace(/\s*\*\s*/g, " ").replace(/ ,/g, ",").replace(/\.?\s*(Solemnity( with an Octave:?)?|Feast|Memorial)\.?$/, "");
    if (o.r) { var r = document.createElement("span"); r.className = "ordo-rank rank-" + o.r.toLowerCase(); r.textContent = o.r; el.appendChild(r); }
    el.appendChild(document.createTextNode(name + (v ? " – " + v : "") + (o.w ? " · Psalter Week " + ROMAN[o.w - 1] : "")));
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
    if (d.getDay() === 6 && bvmSaturday(d)) { var bs = document.createElement("span"); bs.className = "ordo-ours"; bs.textContent = "✦ Saint Bernard Abbey: Saturday Commemoration of the Blessed Virgin Mary"; el.appendChild(bs); }
    el.appendChild(massReadings(o, d));
    var cal = document.createElement("a"); cal.className = "ordo-cal"; cal.href = "calendar.html#" + ymd(d); cal.textContent = "This day in the calendar →";
    el.appendChild(cal);
    if (rest.length) {
      var det = document.createElement("details"), sm = document.createElement("summary"); sm.textContent = "More from the ordo";
      det.appendChild(sm); rest.forEach(function (n) { var p = document.createElement("p"); p.textContent = n; det.appendChild(p); });
      el.appendChild(det);
    }
    el.hidden = false;
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
    if (rank === "Memorial" && d.getDay() !== 0) return "memorial";
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
    var width = box.clientWidth || window.innerWidth;
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
  // end of the day). After Matins, Lauds and Vespers: the collect for a Benedictine saint of the day, from the
  // Benedictine Supplement (osb.org), until the community's own Sanctorale is here.
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
    var nec = extrasData.necrology, col = extrasData.collects && extrasData.collects[md];
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
    if (col && (state.hour === 0 || state.hour === 1 || state.hour === 3)) {
      col.forEach(function (k) {
        var h2 = document.createElement("h2"); h2.textContent = "Collect: " + k.name; box.appendChild(h2);
        var t = document.createElement("p"); t.className = "de-collect"; t.textContent = k.prayer.replace(/\.\.\.\.?$/, "…"); box.appendChild(t);
      });
      var src = document.createElement("p"); src.className = "de-src";
      src.textContent = "From the Benedictine Supplement to the Roman Missal (osb.org), for use until our own Proper of the Saints is here.";
      box.appendChild(src);
      box.hidden = false; return;
    }
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
    var inBook = state.book !== "psalter" && books;
    document.querySelector(".pickbar").classList.toggle("in-book", !!inBook);
    $(".book-picks").hidden = !inBook;
    document.querySelectorAll("[data-book]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.book === state.book)); });
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
    // At Matins the day's readings follow the pages (readings.js), with this link only on a day without them;
    // at Vespers the short reading, which isn't printed in our book
    var rd = $("#readings");
    rd.hidden = (state.hour !== 0 && state.hour !== 3) || !!state.ref || !!inBook;
    if (!rd.hidden) {
      var t = dayDate();
      var ymd = t.getFullYear() + String(t.getMonth() + 1).padStart(2, "0") + String(t.getDate()).padStart(2, "0");
      $("#readings-link").href = "https://divineoffice.org/?date=" + ymd;
      $("#readings-text").textContent = state.hour === 0 ? "" : "The short reading at Vespers isn't printed in our book. ";
      $("#readings-link").textContent = (state.hour === 0 ? "That day's Office of Readings" : "That day's Evening Prayer") + " at DivineOffice.org ↗";
    }
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
  $("#auto-back").addEventListener("click", function (e) { e.preventDefault(); autoNote = ""; state.book = "psalter"; pendingJump = null; render(); scrollTo(0, 0); });
  $("#asm-plain").addEventListener("click", function (e) { e.preventDefault(); plain = true; render(); });
  if (window.PTEXT) PTEXT.buttons(function () { $("#pdf-pages").dataset.done = ""; show(); });   // Book · Lectio · Cantus
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
    bvmSaturday: function (d) { return bvmSaturday(d); }, deadOffice: function (d, hour) { return deadOffice(d, hour); }, redraw: function () { render(); },
    matins: function () { return !state.ref && (state.book === "psalter" ? state.hour === 0 && !ultima() : /Matins/.test(bookHour || "")); },
    printed: function (src, pg) {   // the page number printed in the book, for a page of a file
      var w = whereIs(src); return w ? w.start + pg - w.offset : pg + 1;
    } };
  window.PSALTER = { seasonOf: seasonOf, sextHymn: sextHymn, complineFor: complineFor, nextHour: nextHour, weekOf: weekOf, epiphany: epiphany, ordoDay: ordoDay, sundayVespers: sundayVespers, tagsFor: tagsFor, todayIn: function (b, d) { return todayIn(b, d); }, jumpFor: jumpFor, books: function () { return books; }, compline: compline, calendar: calendar, easter: easter, firstAdventSunday: firstAdventSunday, endOfChristmastide: endOfChristmastide, hourFor: hourFor, fileKey: fileKey };
})();
