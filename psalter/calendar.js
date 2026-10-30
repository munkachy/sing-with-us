/* The ordo as a calendar: a month grid (liturgical color, rank, the day's name) and, under it,
   every day of the month in full. Data: ordo-YEAR.json, read from the Congregation's PDF by
   books/ordo.py in the private psalter repo. */
(function () {
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var OURS = /^(St\. Bernard Abbey|Diocese of Birmingham|Province of Mobile)/;
  var RANK = { Solemnity: "s", Feast: "f", Memorial: "m", "Optional Memorial": "om" };
  // The U.S. civic days the abbey keeps as optional memorials (the user, 30 Oct 2026; their Orations are in the Liber)
  function civic(key) {
    var y = +key.slice(0, 4), m = +key.slice(5, 7) - 1, d = +key.slice(8, 10), wd = new Date(y, m, d).getDay();
    if (m === 6 && d === 4) return "Independence Day";
    if (m === 8 && wd === 1 && d <= 7) return "Labor Day";
    if (m === 10 && wd === 4 && d >= 22 && d <= 28) return "Thanksgiving Day";
    return null;
  }
  var $ = function (s) { return document.querySelector(s); };
  var now = new Date();
  var view = { y: now.getFullYear(), m: now.getMonth() }, ordos = {};
  // The Congregation's necrology and the collects for Benedictine saints (books/extras.py)
  var extras = Promise.all(["necrology.json", "collects.json", "house.json"].map(function (f) {
    return fetch(f).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }));
  var necro = null, collects = null, houseData = null;
  // The abbey's own necrology notices, sealed in the vault (vault/index.json "necro"). They open with the key this phone
  // kept when the psalter page was unlocked (the same site, so the same storage); without it, only the names show.
  var notices = fetch("vault/index.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (idx) {
    var k = null; try { k = JSON.parse(localStorage.getItem("psalter-key")); } catch (e) {}
    if (!idx.necro || !k || k.salt !== idx.salt) return null;
    var raw = Uint8Array.from(atob(k.raw), function (c) { return c.charCodeAt(0); });
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]).then(function (key) {
      return fetch("vault/" + idx.necro).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(buf, 0, 12) }, key, new Uint8Array(buf, 12));
      });
    }).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
  }).catch(function () { return null; });
  var noticeText = null;
  function ladySat(key) { var l = houseData && houseData.bvmSaturdays && houseData.bvmSaturdays[key.slice(0, 4)]; return !!l && l.indexOf(key.slice(5)) >= 0; }
  var want = location.hash.match(/^#(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (want) { view.y = +want[1]; view.m = +want[2] - 1; }

  document.querySelectorAll(".cal-day").forEach(function (t) { t.textContent = now.getDate(); });

  function ymd(y, m, d) { return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
  function load(y) {
    if (!ordos[y]) ordos[y] = fetch("ordo-" + y + ".json").then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { delete ordos[y]; return null; });
    return ordos[y];
  }
  function color(c) {   // the first color named: "White, Violet or Black" -> white
    var m = (c || "").match(/White|Red|Green|Violet|Rose|Black/);
    return m ? m[0].toLowerCase() : "none";
  }
  function clean(t) {
    return t.replace(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\. /, "").replace(/^†\s*/, "").replace(/\s*\*+\s*/g, " ").replace(/ ,/g, ",")
      .replace(/,? OA\b/, "").replace(/\.?\s*(Solemnity( with an Octave:?)?|Feast|Memorial)\.?$/, "").replace(/\.$/, "");
  }
  function title(s) {   // FOURTH SUNDAY OF ADVENT -> Fourth Sunday of Advent
    if (s !== s.toUpperCase()) return s;
    return s.toLowerCase().replace(/(^|[\s(“-])(\S)/g, function (a, b, c) { return b + c.toUpperCase(); })
      .replace(/\b(Of|The|In|And|After|With|To|A)\b/g, function (w) { return w.toLowerCase(); }).replace(/^(\S)/, function (c) { return c.toUpperCase(); });
  }
  function short(x) {   // what fits in a calendar square
    var t = title(clean(x.t));
    if (!x.r && !/Sunday|SUNDAY/.test(x.t) && !/^[A-Z ,'’]+$/.test(clean(x.t))) return "";
    return t.replace(/ in Ordinary Time$/, "").replace(/, (Bishop|Priest|Virgin|Martyr|Abbot|Religious|Doctor|Apostle|Pope|Deacon)s?.*$/, "")
      .replace(/^Commemoration of /, "");
  }
  // What Saint Bernard Abbey keeps, when the ordo gives the house its own feast or solemnity (e.g. 20 August)
  function house(x) {
    var n = x.n.filter(function (n) { return /^St\. Bernard Abbey: .*\b(Solemnity|Feast)\b/.test(n); })[0];
    if (!n) return x;
    var r = n.match(/\b(Solemnity|Feast)\b/)[1];
    var t = n.replace(/^St\. Bernard Abbey:\s*(?:(?:White|Red|Green|Violet|Rose)\s+)?/, "").replace(/\s*–.*$/, "");
    var v = (n.match(/–\s*(.+)$/) || [])[1] || x.v;
    var c = (n.match(/^St\. Bernard Abbey:\s*(White|Red|Green|Violet|Rose)\s/) || [])[1] || x.c;   // the house feast's own colour
    return { c: c, t: t, r: r, v: v, n: x.n, m: x.m, a: x.a };
  }
  function ourDead(key) {   // [title, name, year]: the Congregation's list for our house, and anyone only in our necrology
    var md = key.slice(5), l = necro && (necro.days[md] || []).filter(function (n) { return n[3] === necro.ours; }) || [];
    (noticeText && noticeText[md] || []).forEach(function (e) {
      if (!l.some(function (n) { return n[0] + " " + n[1] === e.name; }) && !(necro && (necro.days[md] || []).some(function (n) { return n[0] + " " + n[1] === e.name; })))
        l = l.concat([["", e.name, e.year, "Ala"]]);
    });
    return l;
  }
  function ours(x, key) { return x.n.filter(function (n) { return OURS.test(n); }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function draw() {
    var y = view.y, m = view.m;
    $("#month-name").textContent = MONTHS[m] + " " + y;
    $("#ordo-year").textContent = y;
    document.title = MONTHS[m] + " " + y + " · Ordo · Monastic Psalter";
    var chips = $("#chips"); chips.innerHTML = "";
    MONTHS.forEach(function (name, i) {
      var b = el("button", "chip", name.slice(0, 3)); b.type = "button"; b.setAttribute("aria-pressed", String(i === m));
      b.setAttribute("aria-label", name); b.addEventListener("click", function () { view.m = i; go(); });
      chips.appendChild(b);
    });
    Promise.all([load(y), extras, notices]).then(function (got) {
      var o = got[0]; necro = got[1][0]; collects = got[1][1]; houseData = got[1][2]; noticeText = got[2];
      if (view.y !== y || view.m !== m) return;
      var grid = $("#grid"), agenda = $("#agenda"), msg = $("#ordo-msg");
      grid.innerHTML = ""; agenda.innerHTML = "";
      msg.hidden = !!o;
      if (!o) { msg.textContent = "The ordo for " + y + " isn't here yet. The Congregation usually publishes the new year's ordo in December."; return; }
      WD.forEach(function (w) { grid.appendChild(el("div", "wd", w.slice(0, 2))); });
      var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      for (var i = 0; i < first; i++) grid.appendChild(el("div", "cell empty"));
      for (var d = 1; d <= days; d++) {
        var key = ymd(y, m, d), x = o[key] && house(o[key]);
        var c = el("button", "cell lc-" + color(x && x.c)); c.type = "button"; c.dataset.key = key;
        if (key === ymd(now.getFullYear(), now.getMonth(), now.getDate())) c.classList.add("is-today");
        if (new Date(y, m, d).getDay() === 0) c.classList.add("is-sun");
        c.appendChild(el("span", "num", d));
        if (x) {
          var cv = !x.r && civic(key);
          if (x.r) { var r = el("span", "rk rk-" + RANK[x.r], RANK[x.r].toUpperCase()); r.title = x.r; c.appendChild(r); }
          else if (cv) { var ro = el("span", "rk rk-om", "OM"); ro.title = "Optional Memorial"; c.appendChild(ro); c.appendChild(el("span", "lbl", cv)); }
          if (ours(x).length || ladySat(key)) c.appendChild(el("span", "ours-star" + (x.r ? "" : " solo"), "✦"));
          if (ladySat(key) && !x.r) c.appendChild(el("span", "lbl", "Our Lady"));
          if (ourDead(key).length) { var nd = el("span", "necro-mark", "†"); nd.title = "In our necrology"; c.appendChild(nd); }
          var s = short(x); if (s) c.appendChild(el("span", "lbl", s));
          c.setAttribute("aria-label", d + " " + MONTHS[m] + ": " + title(clean(x.t)) + (x.r ? ", " + x.r : ""));
          c.addEventListener("click", pick);
        }
        grid.appendChild(c);
        if (x) agenda.appendChild(card(key, new Date(y, m, d), x, o[ymd(y, m, d + 1)] || null));   // x: as the house keeps it
      }
      var day = want && want[3] ? ymd(y, m, +want[3]) : (y === now.getFullYear() && m === now.getMonth() ? ymd(y, m, now.getDate()) : null);
      want = null;
      if (day) select(day, false);
    });
  }

  function card(key, date, x, next) {
    var v = x.v;
    if (x.n.some(function (n) { return /^St\. Bernard Abbey: 1st Vespers of following/.test(n); })) v = "1st Vespers of following";   // the house's own eve
    // name the day whose 1st Vespers they are (OA in the ordo: a holy day of obligation)
    if (/^1st Vespers of following\b/.test(v) && next) v = "1st Vespers of " + title(clean(house(next).t));
    var li = el("li", "day lc-" + color(x.c)); li.id = "d-" + key;
    var h = el("div", "day-head");
    var dt = el("div", "day-date"); dt.appendChild(el("span", "dnum", date.getDate())); dt.appendChild(el("span", "dwd", WD[date.getDay()]));
    h.appendChild(dt);
    var body = el("div", "day-body");
    var top = el("p", "day-title");
    if (x.r) top.appendChild(el("span", "ordo-rank rank-" + x.r.toLowerCase(), x.r));
    top.appendChild(document.createTextNode(title(clean(x.t))));
    body.appendChild(top);
    var cv = !x.r && civic(key);
    if (cv) { var pc = el("p", "day-civic"); pc.appendChild(el("span", "ordo-rank rank-memorial", "Optional Memorial")); pc.appendChild(document.createTextNode(cv)); body.appendChild(pc); }
    var meta = el("p", "day-meta");
    meta.appendChild(el("span", "swatch lc-" + color(x.c)));
    meta.appendChild(document.createTextNode((x.c || "") + (v ? " · " + v : "") + (x.w ? " · Psalter Week " + ["I", "II", "III", "IV"][x.w - 1] : "")));
    body.appendChild(meta);
    if (ladySat(key)) { var pl = el("p", "day-ours"); pl.appendChild(el("span", "ours-star", "✦ ")); pl.appendChild(document.createTextNode("Saint Bernard Abbey: Saturday Commemoration of the Blessed Virgin Mary")); body.appendChild(pl); }
    var mc = houseData && houseData.notices && houseData.notices[key];
    if (mc) {   // the Master of Ceremonies' notice of upcoming celebrations
      var mb = el("div", "day-mc"); mb.appendChild(el("p", "day-mc-h", "From the Master of Ceremonies:"));
      var ul = el("ul"); mc.forEach(function (t) { ul.appendChild(el("li", null, t)); }); mb.appendChild(ul); body.appendChild(mb);
    }
    ours(x).forEach(function (n) { var p = el("p", "day-ours"); p.appendChild(el("span", "ours-star", "✦ ")); p.appendChild(document.createTextNode(n)); body.appendChild(p); });
    var md = key.slice(5), cl = collects && collects[md];
    (cl || []).forEach(function (k) {
      var dc = el("details", "fold collect"); dc.appendChild(el("summary", null, "Collect: " + k.name + (k.supplement ? " (Benedictine Supplement)" : "")));
      dc.appendChild(el("p", null, k.prayer)); body.appendChild(dc);
    });
    var mine = ourDead(key), all = necro && necro.days[md] || [];
    if (mine.length) {   // our brothers who died on this day, each with his notice to read
      var nf = el("details", "fold day-necro"), ns = el("summary");
      ns.appendChild(el("span", "necro-mark", "† "));
      ns.appendChild(document.createTextNode("Our necrology: " + mine.map(function (n) { return (n[0] + " " + n[1]).trim() + " (" + n[2] + ")"; }).join("; ")));
      nf.appendChild(ns);
      mine.forEach(function (n) {
        var name = (n[0] + " " + n[1]).trim(), e = (noticeText && noticeText[md] || []).filter(function (x) { return x.name === name; })[0];
        if (!e) { nf.appendChild(el("p", null, name + ", " + n[2] + (noticeText ? ": no notice in our necrology yet." : ""))); return; }
        var one = el("details", "notice"); one.appendChild(el("summary", null, name + ", " + n[2]));
        one.appendChild(el("p", "notice-read", "Read on the evening of " + e.read + "."));
        e.paras.forEach(function (t) { one.appendChild(el("p", null, t)); });
        nf.appendChild(one);
      });
      if (!noticeText) nf.appendChild(el("p", "notice-read", "To read their notices here, open the psalter page once on this phone with the community password."));
      body.appendChild(nf);
    }
    if (all.length) {
      var dnc = el("details", "fold"); dnc.appendChild(el("summary", null, "Necrology of the Congregation (" + all.length + ")"));
      all.forEach(function (n) { dnc.appendChild(el("p", null, n[0] + " " + n[1] + ", " + (necro.houses[n[3]] || n[3]) + ", " + n[2])); });
      body.appendChild(dnc);
    }
    if (x.m) { var dm = el("details", "fold"); dm.appendChild(el("summary", null, "Mass")); dm.appendChild(el("p", null, x.m)); body.appendChild(dm); }
    var rl = el("a", "day-pray", "Mass readings at USCCB ↗"); rl.href = "https://bible.usccb.org/bible/readings/" + key.slice(5, 7) + key.slice(8, 10) + key.slice(2, 4) + ".cfm"; rl.target = "_blank"; rl.rel = "noopener"; rl.style.marginLeft = ".4rem";
    var rest = (x.a || []).filter(function (n) { return !OURS.test(n); });
    if (rest.length) {
      var dn = el("details", "fold"); dn.appendChild(el("summary", null, "Notes and other choices (" + rest.length + ")"));
      rest.forEach(function (n) { dn.appendChild(el("p", null, n)); }); body.appendChild(dn);
    }
    var pray = el("a", "day-pray", "Pray this day's hours →"); pray.href = "./#date=" + key;
    body.appendChild(pray); body.appendChild(rl);
    h.appendChild(body); li.appendChild(h);
    return li;
  }

  function select(key, scroll) {
    document.querySelectorAll(".cell.is-picked, .day.is-picked").forEach(function (e) { e.classList.remove("is-picked"); });
    var c = document.querySelector('.cell[data-key="' + key + '"]'), d = document.getElementById("d-" + key);
    if (c) c.classList.add("is-picked");
    if (d) { d.classList.add("is-picked"); if (scroll) d.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  function pick() { select(this.dataset.key, true); history.replaceState(null, "", "#" + this.dataset.key); }
  function go() { history.replaceState(null, "", "#" + ymd(view.y, view.m, 1).slice(0, 7)); draw(); }
  $("#prev").addEventListener("click", function () { if (--view.m < 0) { view.m = 11; view.y--; } go(); });
  $("#next").addEventListener("click", function () { if (++view.m > 11) { view.m = 0; view.y++; } go(); });
  $("#today-btn").addEventListener("click", function () {
    view.y = now.getFullYear(); view.m = now.getMonth(); history.replaceState(null, "", "#" + ymd(view.y, view.m, now.getDate()));
    want = location.hash.match(/^#(\d{4})-(\d{2})(?:-(\d{2}))?/); draw();
    setTimeout(function () { select(ymd(view.y, view.m, now.getDate()), true); }, 200);
  });
  window.addEventListener("hashchange", function () {   // a link to another day or month
    var h = location.hash.match(/^#(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (!h || (+h[1] === view.y && +h[2] - 1 === view.m && !h[3])) return;
    if (+h[1] === view.y && +h[2] - 1 === view.m) { select(h[0].slice(1), true); return; }
    view.y = +h[1]; view.m = +h[2] - 1; want = h; draw();
  });
  draw();
})();
