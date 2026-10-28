/* The hebdomadarian's Proper (the choir binder): the capitulum at Lauds, Sext and Vespers (I Vespers on the eve of a
   solemnity) and the Oration, typed. Sealed in the vault (vault/index.json "proper", made by books/proper.py in the private
   repo). app.js leaves a slot for each where the book prints "Reading" and "Prayer from the Proper" (proper_at in
   assembly.json); without slots (a seasonal book, or the book's own pages) the Proper follows the pages in #proper.
   The abbey's rulings, 28 Oct 2026:
   - Feasts and solemnities take their own pages ("sanctoral", by MM-DD); the eve of a solemnity, its I Vespers.
   - Weekdays follow the psalter week of the ordo and the weekday ("II-thu"). Lauds on weekdays: taken from the Psalter.
   - The weekday Oration: as printed in the Psalter, or from the Sunday Proper; the hebdomadarian chooses (kept on the phone).
   - On the house's Saturdays of Our Lady the binder's B.V.M. section replaces the week's Saturday (still to come).
   - What the binder lacks ("missing") is said plainly. */
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

  // What the Proper gives for a day and hour: { cap: {ref, text} | {note}, ora: {lines} | {note} | {choose}, title, sig }
  function plan(d, hour) {
    if (!data || !hour) return null;
    var md = IN.ymd(d).slice(5), next = IN.addDays(d, 1), nmd = IN.ymd(next).slice(5), S = data.sanctoral || {};
    var part = { Lauds: "lauds", Sext: "sext", Vespers: "vespers" }[hour], day = null, title = "", cap = null, ora = null, src = "";
    var eve = hour === "Vespers" && S[nmd] && S[nmd].rank === "Solemnity";
    if (eve) { day = S[nmd]; part = "i_vespers"; title = day.title + ", I Vespers"; src = "s"; }
    else if (S[md]) { day = S[md]; title = day.title; src = "s"; }
    else if (d.getDay() === 6 && IN.bvmSaturday(d)) return null;   // Our Lady's Saturday: the binder's B.V.M. pages are still to come
    else {
      var o = IN.ordoDay(d);
      if (!o || !o.w) return null;
      day = (data.weekly || {})[ROMAN[o.w - 1] + "-" + DOW[d.getDay()]] || {}; src = "w";
      title = "Week " + ROMAN[o.w - 1] + ", " + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
    }
    var missing = day.missing || [], partName = { lauds: "Lauds", sext: "Sext", vespers: src === "s" ? "II Vespers" : "Vespers", i_vespers: "I Vespers" }[part];
    if (part && !(src === "w" && part === "lauds")) {   // weekday Lauds: taken from the Psalter
      var c = day[part];
      if (c && typeof c === "object") cap = { ref: c.ref, text: c.text };
      else if (typeof c === "string") cap = { note: c };
      else if (missing.some(function (m) { return m.indexOf(partName) === 0 || (part === "vespers" && /^(II )?Vespers capitulum/.test(m)); }))
        cap = { note: "The " + partName + " capitulum isn't in the Proper yet (the page wasn't photographed)." };
    }
    if (hour !== "Sext" || src === "s") {
      if (day.oration) ora = { lines: day.oration };
      else if (src === "s" && missing.indexOf("oration") >= 0) ora = { note: "The Oration isn't in the Proper yet (the page wasn't photographed)." };
      else if (src === "w" && d.getDay() === 0) ora = { note: "The Sunday Oration isn't typed yet." };
      else if (src === "w" && hour !== "Sext") ora = { choose: orationChoice() };
    }
    return { cap: cap, ora: ora, title: title, sig: [md, hour, !!cap, cap && cap.ref, ora && (ora.lines ? "t" : ora.note ? "n" : ora.choose)].join("|") };
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
      box.appendChild(el("p", "pr-note", pl.ora.choose === "psalter" ? "The prayer printed below." : "The Sunday Orations aren't typed yet: say the Sunday's from the binder."));
      return box;
    }
    if (pl.ora.note) { box.appendChild(el("p", "pr-note", pl.ora.note)); return box; }
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
