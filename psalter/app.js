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
      for (var i = 0; i < mine.length; i++) if (mine[i][0].replace(/^.* · /, "") === want[w]) return j.indexOf(mine[i]);
    return j.indexOf(mine[0]);
  }

  var now = new Date();
  var cal = calendar(now);
  var books = null;
  var first = nextHour(now);
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
  function drawPdf(data, token) {
    var box = $("#pdf-pages"); box.innerHTML = "";
    if (pager) pager.stop();
    return pdfjs().then(function (lib) { return lib.getDocument({ data: new Uint8Array(data.slice(0)) }).promise; }).then(function (doc) {
      var width = box.clientWidth || window.innerWidth;
      var ratio = Math.min(window.devicePixelRatio || 1, 2.5, 2000 / width);
      var pages = [];
      for (var n = 1; n <= doc.numPages; n++) pages.push(doc.getPage(n));
      return Promise.all(pages).then(function (pages) {
        if (vault.token !== token) return;
        var items = pages.map(function (page, i) {
          var vp = page.getViewport({ scale: width * ratio / page.getViewport({ scale: 1 }).width });
          var cv = document.createElement("canvas");
          cv.style.aspectRatio = Math.floor(vp.width) + " / " + Math.floor(vp.height);
          cv.setAttribute("aria-label", "Page " + (i + 1)); box.appendChild(cv);
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
  function ordoWeek() { var w = weekOf(now); if (state.autoWeek && w !== null) state.week = w; }
  // On a feast or solemnity the ordo names, open its section in the seasonal or Saints book at the hour
  // (I Vespers the evening before). Memorials and Sundays stay in the psalter for now.
  function rankOf(o) {
    var h = o && o.n.filter(function (n) { return /^St\. Bernard Abbey: .*\b(Solemnity|Feast)\b/.test(n); })[0];
    return h ? h.match(/\b(Solemnity|Feast)\b/)[1] : o && o.r;
  }
  var autoDone = false;
  function autoOpen() {
    if (autoDone || touched || !books || state.hour === 4) return;
    var d = dayDate(), o = ordoDay(d);
    if (o === null || o === undefined) return;
    autoDone = true;
    var eve = state.hour === 3 && (/^1st Vespers of following/.test(o.v) || o.n.some(function (n) { return /^St\. Bernard Abbey: 1st Vespers of following/.test(n); }));
    var t = eve ? addDays(d, 1) : d, ot = ordoDay(t);
    if (!ot || !/Solemnity|Feast/.test(rankOf(ot) || "")) return;
    var want = eve ? ["I Vespers", "Vespers"] : [["Matins"], ["Lauds"], ["Sext"], ["II Vespers", "Vespers"]][state.hour];
    var order = ["Sanctoral", "Advent-Christmas", "Lent"];
    for (var b = 0; b < order.length; b++) {
      var k = todayIn(order[b], t);
      if (k < 0) continue;
      var sec = books[order[b]].sections[k];
      for (var w = 0; w < want.length; w++) for (var j = 0; j < sec.jumps.length; j++) {
        if (sec.jumps[j][0] !== want[w]) continue;
        state.book = order[b]; state.sec[order[b]] = k; pendingJump = sec.jumps[j];
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
  function ordoNote() {
    var el = $("#ordo-note"), d = dayDate(), o = state.book === "psalter" && !state.ref ? ordoDay(d) : null;
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
    if (rest.length) {
      var det = document.createElement("details"), sm = document.createElement("summary"); sm.textContent = "More from the ordo";
      det.appendChild(sm); rest.forEach(function (n) { var p = document.createElement("p"); p.textContent = n; det.appendChild(p); });
      el.appendChild(det);
    }
    el.hidden = false;
  }
  function dayDate() { return addDays(midnight(now), state.day - now.getDay()); }
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
  function lentRecipe(sec) {
    if (!asm || !sec.recipe) return null;
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
  function drawRecipe(items, idx, key, token) {
    var box = $("#pdf-pages"); box.innerHTML = "";
    if (pager) pager.stop();
    var width = box.clientWidth || window.innerWidth;
    var ratio = Math.min(window.devicePixelRatio || 1, 2.5, 2000 / width);
    var paths = []; items.forEach(function (it) { if (Array.isArray(it) && paths.indexOf(it[0]) < 0) paths.push(it[0]); });
    return Promise.all(paths.map(function (p) { return getDoc(p, idx, key); })).then(function (ds) {
      var byPath = {}; paths.forEach(function (p, i) { byPath[p] = ds[i]; });
      return Promise.all(items.map(function (it) { return Array.isArray(it) ? byPath[it[0]].getPage(it[1] + 1) : null; }));
    }).then(function (pages) {
      if (vault.token !== token) return;
      var jobs = [];
      items.forEach(function (it, i) {
        if (!Array.isArray(it)) { var h = document.createElement("p"); h.className = "asm-head"; h.textContent = it.h; box.appendChild(h); return; }
        var page = pages[i], vp = page.getViewport({ scale: width * ratio / page.getViewport({ scale: 1 }).width });
        var top = it[2] * vp.height, hgt = Math.max(1, (it[3] - it[2]) * vp.height);
        var cv = document.createElement("canvas"); cv.className = "strip";
        cv.width = Math.floor(vp.width); cv.height = Math.floor(hgt); cv.dataset.p = it[4];
        cv.style.aspectRatio = cv.width + " / " + cv.height; cv.setAttribute("aria-label", "From page " + it[4]);
        box.appendChild(cv);
        jobs.push(function () { return page.render({ canvasContext: cv.getContext("2d"), viewport: vp, transform: [1, 0, 0, 1, 0, -top] }).promise; });
      });
      var f = parseFloat(box.dataset.restore); box.dataset.restore = "";
      if (f > 0) scrollTo(0, box.getBoundingClientRect().top + scrollY + f * box.getBoundingClientRect().height);
      pageLabel();
      return jobs.reduce(function (c, j) { return c.then(function () { if (vault.token === token) return j(); }); }, Promise.resolve());
    });
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
    el.textContent = "p. " + n; el.hidden = !cvs.length || n < 1;
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
        pendingJump = ["p. " + n, pdf - s.start, 0];
        state.ref = b === "Psalter" ? s.path : null;
        if (b !== "Psalter") state.sec[b] = k;
        render();
        return "";
      }
    }
    return "Page " + n + " isn't here. " + book.label + " runs from page " + Math.max(1, first) + " to " + last + ".";
  }

  // Scroll to the hour chosen in "Go to", once its page is laid out
  var pendingJump = null;
  function goJump() {
    if (!pendingJump) return;
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
    var inBook = state.book !== "psalter" && books;
    var path = state.ref || (inBook ? books[state.book].sections[state.sec[state.book]].path : fileKey(state.week, state.day, state.hour));
    index().then(function (idx) {
      if (vault.token !== token) return;
      var hourFile = !state.ref && !inBook && betaOn && idx.hours[path];
      var note = "";
      if (betaOn && !state.ref && !hourFile) note = "This hour isn't in the Beta yet, so here is the book. In the Beta so far: " + Object.keys(idx.hours).map(label).join("; ") + ".";
      $("#beta-note").textContent = note; $("#beta-note").hidden = !note;
      var file = hourFile || idx.pdfs[path];
      current = whereIs(path);
      var recipe = inBook ? lentRecipe(books[state.book].sections[state.sec[state.book]]) : sundayRecipe();
      $("#asm-note-text").textContent = recipe ? recipe.note : ""; $("#asm-note").hidden = !recipe || !recipe.note;
      $("#plain-note").hidden = !plain || !!state.ref || state.hour !== 3 || (state.day !== 0 && state.day !== 6);
      var keyP = vault.key ? Promise.resolve(vault.key) : savedKey();
      if (!keyP) { $("#lock").hidden = false; $("#beta-view").hidden = true; $("#pdf-view").hidden = true; return; }
      $("#lock").hidden = true;
      return keyP.then(function (key) {
        vault.key = key;
        if (recipe) {
          $("#beta-view").hidden = true; $("#pdf-view").hidden = false; msg("");
          if ($("#pdf-pages").dataset.file === recipe.key) { goJump(); return; }
          $("#pdf-pages").dataset.file = recipe.key; current = null;
          msg("Opening…");
          return drawRecipe(recipe.items, idx, key, token).then(function () { if (vault.token === token) msg(""); });
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
          } else if ($("#pdf-pages").dataset.file !== file) {
            $("#pdf-pages").dataset.file = file;
            return drawPdf(plain, token);
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
    var ash = addDays(e, -46), asc = addDays(e, 39), pent = addDays(e, 49);
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
    var t = addDays(midnight(now), state.day - now.getDay()), pick = compline(t);
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
    todayNote(); ordoNote();
    var weekly = state.hour <= 2;
    $("#now-title").textContent = DAYS[state.day] + (weekly ? " · Week " + ROMAN[state.week] : "") + " · " + HOURS[state.hour];
    if (inBook) $("#now-title").textContent = books[state.book].label + " · " + books[state.book].sections[state.sec[state.book]].title;
    document.title = (state.ref ? label(state.ref) : $("#now-title").textContent) + " · Monastic Psalter";
    var note = "";
    if (cal.volume && state.day === now.getDay() && !inBook) note = "Today falls in " + (cal.volume === "Lent" ? "Lent" : "Advent or Christmastide") + ": the choir uses the " + cal.volume + " volume. You can still use the four-week psalter here.";
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
    // Readings not printed in our book: the long ones at Matins, the short one at Vespers
    var rd = $("#readings");
    rd.hidden = (state.hour !== 0 && state.hour !== 3) || !!state.ref || !!inBook;
    if (!rd.hidden) {
      var t = addDays(midnight(now), state.day - now.getDay());
      var ymd = t.getFullYear() + String(t.getMonth() + 1).padStart(2, "0") + String(t.getDate()).padStart(2, "0");
      $("#readings-link").href = "https://divineoffice.org/?date=" + ymd;
      $("#readings-text").textContent = state.hour === 0 ? "The long Matins readings aren't printed in our book." : "The short reading at Vespers isn't printed in our book.";
      $("#readings-link").textContent = (state.hour === 0 ? "That day's Office of Readings" : "That day's Evening Prayer") + " at DivineOffice.org ↗";
    }
    show();
  }

  // "Today in the books": the sections whose calendar tag fits today, as links
  function todayNote() {
    var n = $("#today-note");
    if (!books) { n.hidden = true; return; }
    n.innerHTML = "";
    var hits = Object.keys(books).map(function (b) { return [b, todayIn(b, now)]; }).filter(function (h) { return h[1] >= 0; });
    hits.sort(function (a, b) { return (a[0] === "Sanctoral" ? 0 : 1) - (b[0] === "Sanctoral" ? 0 : 1); });
    hits = hits.filter(function (h) { return !(h[0] === state.book && state.sec[h[0]] === h[1]); });
    if (!hits.length) { n.hidden = true; return; }
    n.appendChild(document.createTextNode("Today in the books: "));
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
    var sec = books[book].sections[k], j = toNow ? jumpFor(sec, now) : -1;
    pendingJump = j >= 0 ? sec.jumps[j] : null;
    if (!pendingJump) scrollTo(0, 0);
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
        var t = todayIn(book, now);
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
    pendingJump = books[state.book].sections[state.sec[state.book]].jumps[+this.value];
    goJump();
  });
  document.querySelectorAll("[data-week]").forEach(function (b) {
    b.addEventListener("click", pick(function (b) {
      state.week = +b.dataset.week; state.autoWeek = false;
      store("psalter-anchor", { week: state.week, sunday: sundayOf(now).toISOString() });
    }));
  });
  document.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", pick(function (b) { state.day = +b.dataset.day; })); });
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
      box.dataset.file = ""; box.dataset.restore = frac; show();
    }, 150);
  });

  document.querySelectorAll(".cal-day").forEach(function (t) { t.textContent = now.getDate(); });
  render();
  fetch("books.json").then(function (r) { return r.json(); }).then(function (b) {
    books = b;
    books.Lent.sections.splice(books.Lent.sections.findIndex(function (s) { return s.group === "Reference"; }), 0,
      { title: "Magnificat antiphons of Lent, cut out (all)", group: "Reference", tag: "", recipe: "lent", jumps: [], pages: 0, start: 0 });
    return fetch("assembly.json").then(function (r) { return r.json(); }).then(function (a) { asm = a; });
  }).then(function () { todayNote(); autoOpen(); render(); }, function () {});
  $("#auto-back").addEventListener("click", function (e) { e.preventDefault(); autoNote = ""; state.book = "psalter"; pendingJump = null; render(); scrollTo(0, 0); });
  $("#asm-plain").addEventListener("click", function (e) { e.preventDefault(); plain = true; render(); });
  $("#asm-back").addEventListener("click", function (e) { e.preventDefault(); plain = false; render(); });
  window.PSALTER = { nextHour: nextHour, weekOf: weekOf, epiphany: epiphany, ordoDay: ordoDay, sundayVespers: sundayVespers, tagsFor: tagsFor, todayIn: function (b, d) { return todayIn(b, d); }, jumpFor: jumpFor, books: function () { return books; }, compline: compline, calendar: calendar, easter: easter, firstAdventSunday: firstAdventSunday, endOfChristmastide: endOfChristmastide, hourFor: hourFor, fileKey: fileKey };
})();
