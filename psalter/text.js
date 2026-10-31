/* Monastic Psalter: the book's pages as set text (Br. Augustine, Nov 2026).
   Three ways to read an hour, chosen with the "How to read" buttons and kept on the phone ("psalter-read"):
     book    the strips of the book's pages, as before
     lectio  everything as text, the chant too (its words)
     cantus  everything as text, but wherever there is music the book's own strip of notation is kept
   The text is the book's, proofread from the scans, page by page: vault "text" (path -> sealed JSON
   { page index: [blocks] }), made in the private psalter repo (books/text_seal.py). Each block has a kind (k), its place
   on the page (y: [top, bottom], fractions of the page height, as the strips in assembly.json) and its words (t).
   A strip [path, page, f0, f1] shows the blocks whose middle lies inside it, so the cut-and-paste recipes work unchanged.
   Pages not yet in text are still shown as the book's strip. */
(function () {
  "use strict";
  var MODES = ["book", "lectio", "cantus"];
  var texts = {}, loading = {};          // path -> { page: [blocks] }
  var last = null;                       // the last verse/paragraph drawn, so a block that continues it ("cont") can join it

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function mode() { var m = store("psalter-read"); return MODES.indexOf(m) >= 0 ? m : "book"; }
  function on() { return mode() !== "book"; }

  // Opens the sealed text of each path that has one (open(file, key) is app.js's vault opener)
  function load(paths, idx, key, open) {
    if (!on() || !idx || !idx.text || !key) return Promise.resolve();
    return Promise.all(paths.map(function (p) {
      if (texts[p] || !idx.text[p]) return null;
      if (!loading[p]) loading[p] = open(idx.text[p], key).then(function (buf) {
        texts[p] = JSON.parse(new TextDecoder().decode(buf));
      }, function () { delete loading[p]; });
      return loading[p];
    }));
  }
  function has(path, pg) { return !!(texts[path] && texts[path][pg]); }

  // ---- words: the chant marks in red, the versicle and response signs, italics between _underscores_ ----
  function words(el, t) {
    String(t).split(/(\s\*|\s†|\s\/(?=\s)|^V\.\s|^R\.\s|\sR\.\s|_[^_]+_)/).forEach(function (part) {
      if (!part) return;
      var span;
      if (/^\s[*†]$/.test(part) || /^\s\/$/.test(part)) {
        el.appendChild(document.createTextNode(" "));
        span = document.createElement("span"); span.className = "tx-mark"; span.textContent = part.trim();
      } else if (/^\s?[VR]\.\s$/.test(part)) {             // ℣ and ℟, also a response on the versicle's line
        if (part[0] === " ") el.appendChild(document.createTextNode(" "));
        span = document.createElement("span"); span.className = "tx-sign"; span.textContent = (part.trim()[0] === "V" ? "℣" : "℟") + " ";
      } else if (/^_[^_]+_$/.test(part)) {
        span = document.createElement("em"); span.className = "tx-rub"; span.textContent = part.slice(1, -1);
      } else { el.appendChild(document.createTextNode(part)); return; }
      el.appendChild(span);
    });
  }
  // A large decorated capital: the first letter set apart, the rest of the first word joined to it in small capitals
  function initial(el, t) {
    var m = /^([“"‘']?)(\p{L})(\S*)\s?([\s\S]*)$/u.exec(t);
    if (!m) { words(el, t); return; }
    el.classList.add("tx-has-init");
    var cap = document.createElement("span"); cap.className = "tx-init"; cap.setAttribute("aria-hidden", "true"); cap.textContent = m[2];
    var first = document.createElement("span"); first.className = "tx-first";
    var sr = document.createElement("span"); sr.className = "visually-hidden"; sr.textContent = m[1] + m[2];
    first.appendChild(sr); first.appendChild(document.createTextNode(m[3].toLowerCase() === m[3] ? m[3] : m[3].charAt(0) + m[3].slice(1).toLowerCase()));
    el.appendChild(cap); if (m[1]) el.appendChild(document.createTextNode(m[1]));
    el.appendChild(first); el.appendChild(document.createTextNode(" "));
    words(el, m[4]);
  }

  var TAG = { title: "h2", subtitle: "p", head: "h3", sub: "p", note: "p", rubric: "p", ant: "p", verse: "p", hymn: "p", text: "p", vr: "p", chant: "p" };
  function block(b, path, pg, out) {
    if (b.k === "run") return;
    // a block that carries on the verse or paragraph above it (across a column or a page)
    if (b.cont && last && last.k === b.k) {
      last.el.appendChild(document.createTextNode(" ")); words(last.el, b.t); return;
    }
    if (b.k === "chant" && mode() === "cantus") {        // keep the book's notation here: app.js draws this strip of the page
      var fig = document.createElement("figure"); fig.className = "tx-chant-img";
      fig.dataset.src = path; fig.dataset.pg = pg; fig.dataset.y0 = b.y[0]; fig.dataset.y1 = b.y[1];
      fig.setAttribute("aria-label", "Chant: " + b.t);
      out.appendChild(fig); last = null; return;
    }
    var el = document.createElement(TAG[b.k] || "p");
    el.className = "tx-" + (b.k in TAG ? b.k : "text");
    if (b.k === "chant") {                                   // Lectio: the words of the chant
      if (b.mode) { var md = document.createElement("span"); md.className = "tx-mode"; md.textContent = b.mode; el.appendChild(md); }
      words(el, b.t);
    } else if (b.k === "hymn") {
      String(b.t).split("\n").forEach(function (line, i) { if (i) el.appendChild(document.createElement("br")); words(el, line); });
    } else if (b.init && b.k === "verse") initial(el, b.t);      // the large capital only where a psalm or canticle begins
    else words(el, b.t);
    out.appendChild(el);
    last = /^(verse|text|ant|hymn|chant)$/.test(b.k) ? { k: b.k, el: el } : null;
  }

  // The text for one strip of a page: a section of blocks, in the book's order
  function strip(path, pg, f0, f1) {
    var sec = document.createElement("section"); sec.className = "tx-strip";
    sec.dataset.src = path; sec.dataset.pg = pg;
    (texts[path][pg] || []).forEach(function (b) {
      var mid = (b.y[0] + b.y[1]) / 2;
      if (mid >= f0 && mid < f1) block(b, path, pg, sec);
    });
    return sec;
  }
  function begin() { last = null; }
  function cut() { last = null; }        // something else (a heading, a reading) came between: start afresh

  // ---- the "How to read" buttons ----
  function buttons(onChange) {
    var box = document.getElementById("read-mode"); if (!box) return;
    function sync() { box.querySelectorAll("[data-read]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.read === mode())); }); }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-read]"); if (!b || b.dataset.read === mode()) return;
      store("psalter-read", b.dataset.read); sync(); onChange();
    });
    sync();
  }

  window.PTEXT = { mode: mode, on: on, load: load, has: has, strip: strip, begin: begin, cut: cut, buttons: buttons };
})();
