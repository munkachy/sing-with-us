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
  function endOfChristmastide(y) {  // Baptism of the Lord: first Sunday after Jan 6
    var jan7 = new Date(y, 0, 7);
    return addDays(jan7, (7 - jan7.getDay()) % 7);
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

  function hourFor(date) {
    var h = date.getHours() + date.getMinutes() / 60;
    if (h >= 3 && h < 9) return 0;      // Matins (Lauds follows)
    if (h >= 9 && h < 15) return 2;     // Sext
    if (h >= 15 && h < 19) return 3;    // Vespers
    return 4;                           // Compline
  }

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

  var now = new Date();
  var cal = calendar(now);
  var state = { week: cal.week, day: now.getDay(), hour: hourFor(now), autoWeek: true, ref: null };
  var saved = weekOverride(now);
  if (saved !== null) { state.week = saved; state.autoWeek = false; }

  var $ = function (s) { return document.querySelector(s); };

  // ---- The vault: sealed files, one password for all of them ----
  var vault = { idx: null, key: null, cache: {}, token: null };
  var betaOn = store("psalter-beta") === true;
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
  function drawPdf(data, token) {
    var box = $("#pdf-pages"); box.innerHTML = "";
    return pdfjs().then(function (lib) { return lib.getDocument({ data: new Uint8Array(data.slice(0)) }).promise; }).then(function (doc) {
      var width = box.clientWidth || window.innerWidth, ratio = Math.min(window.devicePixelRatio || 1, 2.5);
      var chain = Promise.resolve();
      for (var n = 1; n <= doc.numPages; n++) (function (n) {
        chain = chain.then(function () {
          if (vault.token !== token) return;
          return doc.getPage(n).then(function (page) {
            var vp = page.getViewport({ scale: width * ratio / page.getViewport({ scale: 1 }).width });
            var cv = document.createElement("canvas"); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
            cv.setAttribute("aria-label", "Page " + n); box.appendChild(cv);
            return page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
          });
        });
      })(n);
      box.dataset.width = width;
      return chain;
    });
  }

  function label(k) {
    var parts = k.replace(/\.pdf$/, "").split("/");
    return parts.map(function (p) { return p.replace(/^\d+ /, ""); }).filter(function (p) { return !/same every week/.test(p); }).join(", ");
  }
  function msg(t) { var m = $("#vault-msg"); m.textContent = t || ""; m.hidden = !t; }

  // Show the current hour (or reference section): the Beta text if chosen and ready, else the PDF.
  function show() {
    var token = vault.token = {};
    var path = state.ref || fileKey(state.week, state.day, state.hour);
    index().then(function (idx) {
      if (vault.token !== token) return;
      var hourFile = !state.ref && betaOn && idx.hours[path];
      var note = "";
      if (betaOn && !state.ref && !hourFile) note = "This hour isn't in the Beta yet, so here is the book. In the Beta so far: " + Object.keys(idx.hours).map(label).join("; ") + ".";
      $("#beta-note").textContent = note; $("#beta-note").hidden = !note;
      var file = hourFile || idx.pdfs[path];
      var keyP = vault.key ? Promise.resolve(vault.key) : savedKey();
      if (!keyP) { $("#lock").hidden = false; $("#beta-view").hidden = true; $("#pdf-view").hidden = true; return; }
      $("#lock").hidden = true;
      return keyP.then(function (key) {
        vault.key = key;
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
          }
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
    else if (m === 0 && d < bapt) hymn = dd < 6 ? "nativity" : "epiphany";
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


  function render() {
    var weekly = state.hour <= 2;
    $("#now-title").textContent = DAYS[state.day] + (weekly ? " · Week " + ROMAN[state.week] : "") + " · " + HOURS[state.hour];
    document.title = (state.ref ? label(state.ref) : $("#now-title").textContent) + " · Monastic Psalter";
    var note = "";
    if (cal.volume && state.day === now.getDay()) note = "Today falls in " + (cal.volume === "Lent" ? "Lent" : "Advent or Christmastide") + ": the choir uses the " + cal.volume + " volume. You can still use the four-week psalter here.";
    $("#season-note").textContent = note; $("#season-note").hidden = !note;
    document.querySelectorAll("[data-week]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.week === state.week)); });
    document.querySelectorAll("[data-day]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.day === state.day)); });
    document.querySelectorAll("[data-hour]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.hour === state.hour)); });
    $("#beta-toggle").checked = betaOn;
    $("#ref-note").hidden = !state.ref;
    if (state.ref) $("#ref-name").textContent = label(state.ref);
    var lauds = $("#then-lauds");
    lauds.hidden = state.hour !== 0 || !!state.ref;
    if (state.hour === 0) lauds.onclick = function (e) { e.preventDefault(); state.hour = 1; render(); scrollTo(0, 0); };
    // Readings not printed in our book: the long ones at Matins, the short one at Vespers
    var rd = $("#readings");
    rd.hidden = (state.hour !== 0 && state.hour !== 3) || !!state.ref;
    if (!rd.hidden) {
      var t = addDays(midnight(now), state.day - now.getDay());
      var ymd = t.getFullYear() + String(t.getMonth() + 1).padStart(2, "0") + String(t.getDate()).padStart(2, "0");
      $("#readings-link").href = "https://divineoffice.org/?date=" + ymd;
      $("#readings-text").textContent = state.hour === 0 ? "The long Matins readings aren't printed in our book." : "The short reading at Vespers isn't printed in our book.";
      $("#readings-link").textContent = (state.hour === 0 ? "That day's Office of Readings" : "That day's Evening Prayer") + " at DivineOffice.org ↗";
    }
    show();
  }

  // Text size for the Beta words only (the chant is a picture of the page and keeps its width).
  var SIZES = [0.85, 1, 1.15, 1.3, 1.5, 1.75, 2];
  var fsStep = SIZES.indexOf(store("psalter-fs")); if (fsStep < 0) fsStep = 1;
  function applySize() {
    $("#beta-view").style.setProperty("--fs", SIZES[fsStep]);
    $("#fs-down").disabled = fsStep === 0; $("#fs-up").disabled = fsStep === SIZES.length - 1;
    store("psalter-fs", SIZES[fsStep] === 1 ? null : SIZES[fsStep]);
  }
  $("#fs-down").addEventListener("click", function () { if (fsStep > 0) { fsStep--; applySize(); } });
  $("#fs-up").addEventListener("click", function () { if (fsStep < SIZES.length - 1) { fsStep++; applySize(); } });
  applySize();

  $("#beta-toggle").addEventListener("change", function (e) { betaOn = e.target.checked; store("psalter-beta", betaOn || null); render(); });

  function pick(fn) { return function () { state.ref = null; fn(this); render(); }; }
  document.querySelectorAll("[data-week]").forEach(function (b) {
    b.addEventListener("click", pick(function (b) {
      state.week = +b.dataset.week; state.autoWeek = false;
      store("psalter-anchor", { week: state.week, sunday: sundayOf(now).toISOString() });
    }));
  });
  document.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", pick(function (b) { state.day = +b.dataset.day; })); });
  document.querySelectorAll("[data-hour]").forEach(function (b) { b.addEventListener("click", pick(function (b) { state.hour = +b.dataset.hour; })); });
  $("#reset-btn").addEventListener("click", function () {
    store("psalter-anchor", null);
    now = new Date(); cal = calendar(now);
    state = { week: cal.week, day: now.getDay(), hour: hourFor(now), autoWeek: true, ref: null };
    render();
  });
  document.querySelectorAll("[data-ref]").forEach(function (a) {
    a.href = "#"; a.removeAttribute("target");
    a.addEventListener("click", function (e) { e.preventDefault(); state.ref = a.dataset.ref; render(); scrollTo(0, 0); });
  });
  $("#ref-back").addEventListener("click", function (e) { e.preventDefault(); state.ref = null; render(); });
  // Redraw the PDF at the new width when the phone turns
  var lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (Math.abs(window.innerWidth - lastW) < 40) return; lastW = window.innerWidth;
    $("#pdf-pages").dataset.file = ""; show();
  });

  render();
  window.PSALTER = { compline: compline, calendar: calendar, easter: easter, firstAdventSunday: firstAdventSunday, endOfChristmastide: endOfChristmastide, hourFor: hourFor, fileKey: fileKey };
})();
