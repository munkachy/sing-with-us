/* The hebdomadarian's Proper: the whole Liber Hebdomadarii (the choir binder, Revised 2nd edition): the capitulum at
   Lauds, Sext and Vespers (I Vespers on the eve of a Sunday or solemnity) and the Oration, typed. Sealed in the vault
   (vault/index.json "proper", made by books/liber.py and books/proper.py in the private repo). app.js leaves a slot for
   each where the book prints "Reading" and "Prayer from the Proper" (proper_at in assembly.json); without slots (a
   seasonal book, or the book's own pages) the Proper follows the pages in #proper.
   Which page a day takes (resolve): a solemnity or feast the ordo names; Sundays and the season's great days; a
   saint the abbey celebrates on an ordinary weekday (not in Lent, Holy Week, 17-31 December, the Easter octave);
   Our Lady's Saturdays (house.json); else the season's weekday, or through the year the psalter week's.
   Rulings (28 Oct 2026): weekday Lauds as printed in the Psalter; the weekday Oration as printed or the Sunday's
   (that week's Sunday through the year), chosen on the phone; 1 Cor 2:8 "the Lord of glory". */
(function () {
  var IN = window.PSALTER_IN;
  if (!IN) return;
  var $ = function (s) { return document.querySelector(s); };
  var ROMAN = ["I", "II", "III", "IV"], DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  var data = null, loading = null, choiceKey = "psalter-oration";

  function orationChoice() { try { return localStorage.getItem(choiceKey) === "sunday" ? "sunday" : "psalter"; } catch (x) { return "psalter"; } }
  function setChoice(v) { try { localStorage.setItem(choiceKey, v); } catch (x) {} IN.redraw(); }

  function load() {
    if (data || loading) return;
    loading = IN.index().then(function (idx) {
      var k = idx.proper && IN.key();
      if (!k) { loading = null; return; }
      return k.then(function (key) { return IN.open(idx.proper, key); }).then(function (b) {
        data = JSON.parse(new TextDecoder().decode(b)); IN.redraw();
      });
    }).catch(function () { loading = null; });
  }

  // ---- Which page of the Liber a day takes ----
  // The season's day key, as the readings work it out from the date (readings.js seasonKey), with the Liber's own names
  // for the days it keys differently: the Sunday after Christmas, 2 January to Epiphany, the fourth Sunday of Advent.
  var WEEKDAY = /^(ot\d\d|adv\d|lent\d|east\d|ash|holy|epi)-(sun|mon|tue|wed|thu|fri|sat)$/;
  function seasonKey(d) {
    var k = window.LECT && LECT._test ? LECT._test.seasonKey(d) : null, wd = DOW[d.getDay()], m = d.getMonth(), dd = d.getDate();
    if (!k) return null;
    if (m === 0 && dd >= 2 && /^\d\d-\d\d$/.test(k)) return wd === "sun" ? "christmas2-sun" : "pre-epi-" + wd;
    if (m === 11 && dd >= 17 && dd <= 24 && wd === "sun") return "adv4-sun";
    var e = IN.easter(d.getFullYear());
    if (IN.same(d, IN.addDays(e, 50))) return "mary-church";   // Mary, Mother of the Church: the Monday after Pentecost
    return k;
  }
  function named(d) {   // the Sanctoral's days without a fixed date
    var e = IN.easter(d.getFullYear()), m = d.getMonth(), dd = d.getDate(), wd = d.getDay();
    if (IN.same(d, IN.addDays(e, 69))) return "immaculate-heart";   // the Saturday after the Sacred Heart
    if (m === 8 && wd === 1 && dd <= 7) return "labor-day";
    if (m === 10 && wd === 4 && dd >= 22 && dd <= 28) return "thanksgiving";
    return null;
  }
  function privileged(k, d) {   // days a memorial gives way to (Lent, Holy Week, 17-31 December, the Easter octave, 1 January)
    return /^(ash|lent\d|holy|east1)-/.test(k || "") || /^(12-(1[7-9]|2\d|3[01])|01-01|christmas|holy-family)$/.test(k || "") || (d.getMonth() === 11 && d.getDate() >= 17);
  }
  var STOP = /^(saint|blessed|the|and|our|virgin|martyr|martyrs|bishop|priest|abbot|doctor|church|religious|apostle|apostles|feast)$/i;
  function names(o, san) {   // does the ordo's line for the day (or the abbey's own line) name this Sanctoral day?
    var line = (o.t + " " + (o.n || []).filter(function (n) { return /^St\. Bernard Abbey/.test(n); }).join(" ")).toLowerCase();
    return (san.title || "").split(/[^A-Za-z\u00c0-\u024f]+/).some(function (w) { return w.length > 2 && !STOP.test(w) && line.indexOf(w.toLowerCase()) >= 0; });
  }
  // -> { e: the entry, key, base: the season's or week's day (for a memorial's missing parts and the Sunday Oration) }
  function resolve(d) {
    var S = data.sanctoral || {}, E = data.season || {}, W = data.weekly || {};
    var md = IN.ymd(d).slice(5), k = seasonKey(d), o = IN.ordoDay(d), wd = d.getDay();
    var rank = o ? IN.rankOf(o) || "" : "";
    // the psalter week: the ordo's, or (no ordo for the year yet) the page's own count (app.js calendar)
    var w = o && o.w ? o.w : window.PSALTER && PSALTER.calendar ? PSALTER.calendar(d).week + 1 : 0;
    var wk = !E[k] && w && /^ot\d\d-/.test(k || "") ? W[ROMAN[w - 1] + "-" + DOW[wd]] : null;
    var base = E[k] ? { e: E[k], key: k } : wk ? { e: wk, key: ROMAN[w - 1] + "-" + DOW[wd] } : null;
    var nk = named(d), san = nk ? S[nk] : S[md], sk = nk || md;
    // the ordo's feast or solemnity is the saint's only when its line names him (not Christ the King on St Cecilia's day)
    if (san && /Solemnity|Feast/.test(rank) && names(o, san)) return { e: san, key: sk, base: base };
    if (san && !o && /Solemnity|Feast/.test(san.rank) && !(base && (wd === 0 || !WEEKDAY.test(k)))) return { e: san, key: sk, base: base };
    if (base && (wd === 0 || !WEEKDAY.test(k))) return base;   // Sundays and the season's great days
    if (san && wd !== 0 && !privileged(k, d)) return { e: san, key: sk, base: base };   // a memorial, on an ordinary weekday
    if (wd === 6 && IN.bvmSaturday(d) && E.bvm) return { e: E.bvm, key: "bvm", base: base };
    return base;
  }

  // What the Proper gives for a day and hour: { cap: {ref, text} | {note}, ora: {lines, n, of} | {choose, lines} | {note}, title, sig }
  function plan(d, hour) {
    if (!data || !hour) return null;
    if (IN.deadOffice && IN.deadOffice(d, hour)) return null;   // the Office of the Dead has its own texts
    var r = resolve(d);
    if (!r) return null;
    var e = r.e, part = { Lauds: "lauds", Sext: "sext", Vespers: "vespers" }[hour], title = e.title, oe = e, okey = r.key;
    var E = data.season || {}, md = IN.ymd(d).slice(5);
    if (hour === "Vespers" && E[md] && E[md].from_sanctoral && r.e === (data.sanctoral || {})[md]) { e = oe = E[md]; okey = md; title = e.title; }   // 26-28 Dec: Vespers of the Octave
    // I Vespers: where the ordo keeps tonight's Vespers as the next day's, or where the page says "see I Vespers …"
    var o = IN.ordoDay(d), eve = hour === "Vespers" && o && (/^1st Vespers of following/.test(o.v || "") || (o.n || []).some(function (n) { return /^St\. Bernard Abbey: 1st Vespers of following/.test(n); }));
    if (hour === "Vespers" && !eve && typeof e.vespers === "string" && /^see\b/i.test(e.vespers)) eve = true;
    if (eve) {
      var nx = resolve(IN.addDays(d, 1));
      if (nx) {
        var ne = nx.e;
        if (nx.key === "christmas" && E["christmas-eve"]) ne = E["christmas-eve"];   // I Vespers of the Nativity
        if (ne.i_vespers) { e = oe = ne; okey = nx.key; part = "i_vespers"; title = (nx.e.title || "") + ", I Vespers"; }
      }
    }
    var cap = null, ora = null, c = part && (e[part] !== undefined ? e[part] : r.base && r.e !== r.base.e && part !== "i_vespers" ? r.base.e[part] : undefined);
    if (c && typeof c === "object") cap = { ref: c.ref, text: c.text };
    else if (typeof c === "string" && !/psalter/i.test(c) && !/^see\b/i.test(c)) cap = { note: c };
    // the Oration: the day's (several: the hebdomadarian chooses one); on a weekday through the year, as printed in the
    // Psalter or the Sunday's
    var alts = oe.orations || (oe.choose ? null : r.base && r.base.e.orations) || null;
    if (alts && alts.length) {
      var n = Math.min(altChoice(okey), alts.length - 1);
      ora = { lines: alts[n], n: n, of: alts.length, key: okey };
    } else if (oe.choose && hour !== "Sext") {
      // the week's Sunday through the year, even when a feast took its place (All Saints on the 31st Sunday)
      var ch = orationChoice(), sun = E[seasonKey(IN.addDays(d, -d.getDay()))], sl = sun && sun.orations && sun.orations[0];
      ora = { choose: ch, lines: ch === "sunday" ? sl : null, sunday: sun && sun.title };
    }
    return { cap: cap, ora: ora, title: title, sig: [md, hour, okey, part, cap && (cap.ref || cap.note), ora && (ora.choose || "") + (ora.n || 0)].join("|") };
  }
  function altChoice(key) { try { return +(JSON.parse(localStorage.getItem("psalter-oration-alt") || "{}")[key] || 0); } catch (x) { return 0; } }
  function setAlt(key, n) {
    try { var m = JSON.parse(localStorage.getItem("psalter-oration-alt") || "{}"); m[key] = n; localStorage.setItem("psalter-oration-alt", JSON.stringify(m)); } catch (x) {}
    IN.redraw();
  }

  // ---- Drawing ----
  function lordSmall(el, text) {
    text.split(/\b(LORD)\b/).forEach(function (bit, j) {
      if (!bit) return;
      if (j % 2) { var s = document.createElement("span"); s.className = "lord"; s.textContent = bit; el.appendChild(s); }
      else el.appendChild(document.createTextNode(bit));
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function capEl(pl) {
    var box = el("div", "pr-cap");
    box.appendChild(el("p", "pr-kind", "Capitulum · " + pl.title));
    if (pl.cap.note) { box.appendChild(el("p", "pr-note", pl.cap.note)); return box; }
    box.appendChild(el("p", "pr-ref", pl.cap.ref));
    var t = el("p", "pr-text"); lordSmall(t, pl.cap.text); box.appendChild(t);
    return box;
  }
  function oraEl(pl) {
    var box = el("div", "pr-ora");
    box.appendChild(el("p", "pr-kind", "Oration · " + pl.title));
    if (pl.ora.choose) {   // the hebdomadarian's choice, remembered on this phone
      var row = el("div", "pr-switch"); row.setAttribute("role", "group"); row.setAttribute("aria-label", "Which Oration");
      [["psalter", "As printed in the Psalter"], ["sunday", "From the Sunday Proper"]].forEach(function (o) {
        var b = el("button", null, o[1]); b.type = "button"; b.setAttribute("aria-pressed", String(pl.ora.choose === o[0]));
        b.addEventListener("click", function () { if (pl.ora.choose !== o[0]) setChoice(o[0]); });
        row.appendChild(b);
      });
      box.appendChild(row);
      if (pl.ora.choose === "psalter" || !pl.ora.lines) { box.appendChild(el("p", "pr-note", pl.ora.choose === "psalter" ? "The prayer printed below." : "This Sunday's Oration isn't in the Proper.")); return box; }
      box.appendChild(el("p", "pr-note", pl.ora.sunday || "The Sunday's Oration"));
    } else if (pl.ora.note) { box.appendChild(el("p", "pr-note", pl.ora.note)); return box; }
    if (pl.ora.of > 1) {   // several Orations (Our Lady's Saturday has eight): the hebdomadarian chooses
      var alt = el("div", "pr-switch"); alt.setAttribute("role", "group"); alt.setAttribute("aria-label", "Which of the Orations");
      for (var i = 0; i < pl.ora.of; i++) (function (i) {
        var b = el("button", null, String(i + 1)); b.type = "button"; b.setAttribute("aria-pressed", String(pl.ora.n === i));
        b.setAttribute("aria-label", "Oration " + (i + 1) + " of " + pl.ora.of);
        b.addEventListener("click", function () { if (pl.ora.n !== i) setAlt(pl.ora.key, i); });
        alt.appendChild(b);
      })(i);
      box.appendChild(alt);
    }
    box.appendChild(el("p", "pr-lead", "Let us pray."));
    var t = el("p", "pr-lines");
    pl.ora.lines.forEach(function (line, i) { if (i) t.appendChild(document.createElement("br")); lordSmall(t, line); });
    box.appendChild(t);
    box.appendChild(el("p", "pr-resp", "℟. Amen."));
    return box;
  }
  function draw() {
    var hour = IN.hour(), box = $("#proper");
    box.innerHTML = ""; box.hidden = true;
    document.querySelectorAll("#pdf-pages .proper-slot").forEach(function (s) { s.innerHTML = ""; });
    var pl = plan(IN.dayDate(), hour);
    if (!pl) return;
    var cs = document.querySelector('#pdf-pages .proper-slot[data-part="cap"]'), os = document.querySelector('#pdf-pages .proper-slot[data-part="ora"]');
    if (cs && pl.cap) cs.appendChild(capEl(pl));
    if (os && pl.ora) os.appendChild(oraEl(pl));
    if (IN.inBook()) {   // no slots in a seasonal book or the book's own pages: the Proper after the pages
      if (pl.cap) box.appendChild(capEl(pl));
      if (pl.ora && !pl.ora.choose) box.appendChild(oraEl(pl));
      box.hidden = !box.children.length;
    }
  }

  window.PROPER = { plan: function (d, hour) { load(); return plan(d, hour); }, pages: draw, update: function () { load(); draw(); } };
  load(); draw();
})();
