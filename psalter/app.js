/* Monastic Psalter for the monks of Saint Bernard Abbey.
   The book itself stays in a private Google Drive folder; this page only
   points to the right file. Google checks each monk's sign-in when it opens.
   Week rule (Br. Augustine): the four-week count starts fresh at Week I after
   Christmastide and again at Easter. Advent-Christmastide and Lent use their
   own volumes. */
(function () {
  var IDS = {
"Week IV/6 Friday/1 Matins.pdf": "1dq7JpywLUU8-XPcMeISfSy_GuP6nsEwz",
"Week IV/7 Saturday/1 Matins.pdf": "16HO_OnuphS_L0pdz6vGwXOHY9EJ9r75b",
"Week IV/3 Tuesday/1 Matins.pdf": "12yO58Z1TItyZCEfSuT9JS-lXabkFMVLX",
"Week IV/4 Wednesday/1 Matins.pdf": "1ZUoN_HUary6pRIuVi1vDjQULXJ_31gn-",
"Week IV/1 Sunday/1 Matins.pdf": "1FIRM-SobPLvRj01G1d7LlV52Nt3k3eed",
"Week IV/2 Monday/1 Matins.pdf": "14SukdZAPDXlis67chX-HuMsh2jAhYfzK",
"Week IV/5 Thursday/1 Matins.pdf": "1uE2Hqtw40mmZv7-2S3nXCdF8Klorr4yL",
"Week II/6 Friday/1 Matins.pdf": "1hbFIXBTOJyjsJhZZ2owgSZj-ou2RVUFC",
"Week II/7 Saturday/1 Matins.pdf": "1f5bmOpkUPxur-zucV7Q72zgzo0HO4ucs",
"Week II/2 Monday/1 Matins.pdf": "1wtyBJKncnxOYgdqO5wqdDbTABFzx0d0v",
"Week II/4 Wednesday/1 Matins.pdf": "1BB0Fe8t0Hz-fMe_rgfmgfk7pxn1fBaVB",
"Week II/3 Tuesday/1 Matins.pdf": "10xEO8fP-BVe7PNj8lj29LHRvyx3JQG2T",
"Week II/5 Thursday/1 Matins.pdf": "1cWvVqF2mZF50x1Lo3NrOxGkMBusHKBfk",
"Week II/1 Sunday/1 Matins.pdf": "1BTrRSDYWkjN4k5hUotwFdvbp0c4UCIFF",
"Week III/6 Friday/1 Matins.pdf": "1N4ZrYKdzvMcOYGN3txbo6ZWtainwJ4xJ",
"Week III/7 Saturday/1 Matins.pdf": "1In5_9A14rIsqUW7rpz2EkCFN0PGlOCOB",
"Week III/4 Wednesday/1 Matins.pdf": "10kwcD5vJ4t0Gx78dLOFTUbufUp5d5f91",
"Week III/5 Thursday/1 Matins.pdf": "1CtGBqBlrdDq2cFspq5xY63t2kKq9Prfo",
"Week I/6 Friday/1 Matins.pdf": "1wzcSFR74RVcjblGh905RF1B4vH4a0JUv",
"Week I/7 Saturday/1 Matins.pdf": "1HyD-gyhcg2p5wH6vFGOsmMVRFAGpOTeP",
"Week III/2 Monday/1 Matins.pdf": "1y8PY76TAFEvU4DWUlg8j2TPYc-5rTWrX",
"Week I/3 Tuesday/1 Matins.pdf": "17o8Ox4cWt91kqRmVzXaSnY9utQaLxqTv",
"Week III/1 Sunday/1 Matins.pdf": "1sLbW1uxKkE-_tr0FBn6d2iEOS6GVdXk-",
"Week III/3 Tuesday/1 Matins.pdf": "1hcqH6C9I2Otn6ZwQNnY4qIK6pUsfVBdD",
"Week I/4 Wednesday/1 Matins.pdf": "1YI0E9IUeBq_Y6iUcIIbYqLQEqYjYiGgD",
"Week I/2 Monday/1 Matins.pdf": "1kb-gz64g2I10YQ5iHxrPZfQEuUHu136l",
"Week I/5 Thursday/1 Matins.pdf": "16ML3zNaIwxDRTWeoEkdQtJz-CUbbZtju",
"Week I/1 Sunday/1 Matins.pdf": "19-NfkkT4l2RMsV3hsGU6WDpnoMuCkuOZ",
"Week IV/7 Saturday/2 Lauds.pdf": "1xFOILqdhaEm21QxPNC7leDV_54ZSpSHy",
"Week IV/6 Friday/2 Lauds.pdf": "1bCww-CTGtOIASrP0IOrPi3-2_fQfKi3l",
"Week IV/1 Sunday/2 Lauds.pdf": "1lTJZkV0oeugOxRKRyiaHzv1HyEt0xOD_",
"Week IV/4 Wednesday/2 Lauds.pdf": "1BeRITtbyIZqJ46VFDQv9fKWF1ejuJ-at",
"Week IV/2 Monday/2 Lauds.pdf": "1aO-Z9vMyz-Fw6Nmvu2D2pDZOL2rzQJTJ",
"Week IV/5 Thursday/2 Lauds.pdf": "1E1Tt8diYPtfM6BbOLCZhBVP720kN0rH4",
"Week IV/3 Tuesday/2 Lauds.pdf": "1FuQHliQCON2n4yKY4UjFKKGTwjeyeofc",
"Week II/6 Friday/2 Lauds.pdf": "1yxr42mwBBxOklXBFKewQktvkXNdCjzuw",
"Week II/7 Saturday/2 Lauds.pdf": "1JLsHBbs5knC8h7YJISFZT_aQZ3mvU-Is",
"Week II/4 Wednesday/2 Lauds.pdf": "1U1ViEzh_4Ldd2EcEyF4di5XxMi8zQyrb",
"Week II/3 Tuesday/2 Lauds.pdf": "12cUxIUNxbEPt6Gtr4XLzMPbzg1B3JHRh",
"Week II/2 Monday/2 Lauds.pdf": "1R_rbDOYZL4vSqm-4VJtVgED5gTzYgNXE",
"Week II/5 Thursday/2 Lauds.pdf": "1a8mmvftt57sxJCLeb8l6pXWzPLPlNhy2",
"Week III/7 Saturday/2 Lauds.pdf": "1ylKW52cEFEJ1enoZLKqRp4huz_iXzvLy",
"Week II/1 Sunday/2 Lauds.pdf": "19PNp-4Kk68y7ulE7dbL8yKeVLmAFVbw9",
"Week I/6 Friday/2 Lauds.pdf": "195yWIW46B_BJCzpYi_8AOzYllRpvQixT",
"Week III/4 Wednesday/2 Lauds.pdf": "12l--zI15wvwf6vhrNAIzbVvMHDVXawn1",
"Week III/5 Thursday/2 Lauds.pdf": "1XARDNWPzcfGGR6o2lNajXrS9xXhJ5U_3",
"Week III/6 Friday/2 Lauds.pdf": "1faGEwcbUDS8CECmB_A2fIWmxdu0iUUjk",
"Week I/7 Saturday/2 Lauds.pdf": "1o0e-24cHowx37XbEjUASYxt7ERewAdM0",
"Week I/3 Tuesday/2 Lauds.pdf": "1dbp3V9nKGdmzMmVGwTQs7dk0vDqmLtJF",
"Week III/2 Monday/2 Lauds.pdf": "1NX3BP8Fm-4Q0WaSKgy2JbNNZvBuwSScJ",
"Week III/1 Sunday/2 Lauds.pdf": "10KYJ_dvcXVigr1qGmwq8bPrLUiz1fAXh",
"Week III/3 Tuesday/2 Lauds.pdf": "10vq9FWIsaGQo3JpSEUOT67nziXT6Kv2S",
"Week I/4 Wednesday/2 Lauds.pdf": "1gXqGVdIHNyyTWV15k_2ASjobAyKQ0a6Z",
"Week I/2 Monday/2 Lauds.pdf": "1uLBZPogSSqV4-3LUHBuQ-VVNqUXDhL5I",
"Week I/5 Thursday/2 Lauds.pdf": "1D3FszpimoY4oHc0zgX6nseH8G7QwbMap",
"Week I/1 Sunday/2 Lauds.pdf": "1393MVwPGbivN6A3sb1F4hWAgk6ca1G6V",
"Week IV/7 Saturday/3 Sext.pdf": "1KJGN6HypjlFpK0Sz3lmpG8ZjDsTtDyrl",
"Week IV/6 Friday/3 Sext.pdf": "1NhMVH6SpQFctuR2161AbEPsTlQ7ak-cD",
"Week IV/1 Sunday/3 Sext.pdf": "1KnlmzJndbDYu5x4ua-Lt6yKSur_C1hf-",
"Week IV/4 Wednesday/3 Sext.pdf": "14eZPzD4LFaG0TDsmVR-3kO4JKXBrjHNW",
"Week IV/3 Tuesday/3 Sext.pdf": "1jlBLbw7YRMokU0Cz4XRUGf9junJHyGD0",
"Week IV/2 Monday/3 Sext.pdf": "1KhjaBgcQSylj84VtTnEJ0tb6Km6y3kD0",
"Week IV/5 Thursday/3 Sext.pdf": "15rF9pXS39fxPrHrWwmwQ8sI_zjM4023l",
"Week II/6 Friday/3 Sext.pdf": "1Per-irSHKCzmakYdN1Z6qfBIrRHjWYB5",
"Week II/7 Saturday/3 Sext.pdf": "1RYnH-xnav5r_Fwf2jTZWarmOkRVwJlHx",
"Week II/5 Thursday/3 Sext.pdf": "1f-nIcAqDRckytG84uYBlpNRWeXafhqcn",
"Week II/4 Wednesday/3 Sext.pdf": "1p4klKj_En5dSZ66NTVnrdvSPt8P-wo3m",
"Week II/2 Monday/3 Sext.pdf": "19AUCE03ki_uR7Vq3X-o6bcVBEE04PjFG",
"Week II/3 Tuesday/3 Sext.pdf": "1sWtPiicLqa1gEAa8HGMLPlbM5VX_-49O",
"Week II/1 Sunday/3 Sext.pdf": "1cb67y8csVGVCmHSUV44io4jIcDqsvpgC",
"Week I/6 Friday/3 Sext.pdf": "1NsIEp7r0cUwU9w8rNkogW3ussoRtNERv",
"Week III/6 Friday/3 Sext.pdf": "13y_2fIbaWSHloQsgMtiHXWg0Avp0LDr-",
"Week III/7 Saturday/3 Sext.pdf": "1NoOfZTFuFU-BNH_nbHJjHGikZTxqYaWu",
"Week III/5 Thursday/3 Sext.pdf": "1uqzEPEkhQM1C06d12GFFXUohUb657bU5",
"Week III/4 Wednesday/3 Sext.pdf": "1Fs33DX4_MXA22N35a4j4W272970xTORR",
"Week I/7 Saturday/3 Sext.pdf": "1ANA1c8n4xsb7npRq20JXluVzoihzCuGb",
"Week III/2 Monday/3 Sext.pdf": "18YCvteuLCs2-rfxgIBmLGZrLwvAlyzKe",
"Week I/3 Tuesday/3 Sext.pdf": "1gaqU5CuaqBL7KWu-vnqN2HWHw_Tykx_U",
"Week III/3 Tuesday/3 Sext.pdf": "12voE7p8bNCzD9fk2U_cL9ZSeJZmoZU7d",
"Week III/1 Sunday/3 Sext.pdf": "1Ac_HiGdM9h-5MuyKF16tcRvS8FWa_eFU",
"Week I/4 Wednesday/3 Sext.pdf": "1ENLx2s-ZwAM9w6RdWj29oh0opGSB5l13",
"Week I/2 Monday/3 Sext.pdf": "1hhiQ0ZRuYlby20-CRJZ_JLYfw0dJQyY6",
"Week I/1 Sunday/3 Sext.pdf": "15yIHwt3-SfRRP-DgQHPpXQAE6v7IaY5Z",
"Week I/5 Thursday/3 Sext.pdf": "1FFKhapT9-Jx_9gKus4NHs9TLKgZ11zm2",
"Vespers (same every week)/1 Sunday at Vespers.pdf": "1xUSYlVZFYUr03HoYdyE6mq3I7gDc1coB",
"Vespers (same every week)/2 Monday at Vespers.pdf": "1c7kBEKb2mQSJy2DJO8lsYWxGZLUMmVx9",
"Vespers (same every week)/3 Tuesday at Vespers.pdf": "1n3qXZFcGjObqXHYQz1uEoWUdh1JTeRcB",
"Vespers (same every week)/4 Wednesday at Vespers.pdf": "1JqzR1ye6gJqEQJ08beGFK3tJQ0K3qnwD",
"Vespers (same every week)/5 Thursday at Vespers.pdf": "1iOmkE0OXq-wUKOfEeAkCIranVY9NqWGe",
"Vespers (same every week)/6 Friday at Vespers.pdf": "1kIVbPwI8YgA8WbHU7m2K1NgWsslQvsVN",
"Vespers (same every week)/7 Saturday at Vespers.pdf": "1PhfOB-tLAPBP720SWLgk46o1gtpXZbSd",
"Compline (every night).pdf": "1bTyRs_KpMczyWdXpbTMXoY-ABVxkY9G8",
"Ordinary, chants and reference/01 Title, dedication and Foreword.pdf": "139UwR3HNcmL4lQg6NMd1bqabkKcuE__7",
"Ordinary, chants and reference/02 Ordinary at Sext.pdf": "1Xl4Gy498ogeERWDuoZoPYk0zTZCG2M8x",
"Ordinary, chants and reference/03 Ordinary (opening verses, chanting the psalms, Our Father, Benedicamus).pdf": "1dAaYCi-V8hu6QfWgCtEheNeAIJWZk91N",
"Ordinary, chants and reference/04 Invitatory (Psalms 94 and 99, all tones).pdf": "18QUY6fihhnRyBz55PeE6-qM5fnyckPKw",
"Ordinary, chants and reference/05 Gospel canticles, Te Deum and Te Decet Laus.pdf": "1Q_Q_7jiG5NtJYYOUTTCketg4iYql5-vD",
"Ordinary, chants and reference/06 Capitula in cantu.pdf": "1vrlPddDY0Ln1BlJemLGZSQLCRMi9CdHj",
"Ordinary, chants and reference/07 Blessings and prayers, Benediction, Laudes Hincmari.pdf": "16jRVbt4N5aw9qEggxA8P4y5RfDsn6G4K",
"Ordinary, chants and reference/08 Magnificat and Benedictus tones.pdf": "1L8TTaBlEhyDDV_4l_KXBYdKZRsN37Vhs",
"Ordinary, chants and reference/09 Prayers.pdf": "1ULJHcAq328Jb3FxO_Yk5AC7lBR4munNA",
"Ordinary, chants and reference/10 Order of Service and Distribution of the Psalms.pdf": "1ZFYZvUJkrUbOj8hG2h9TjwuPu6E03HLE",
"Ordinary, chants and reference/11 Index and Acknowledgments.pdf": "1Oxeles1EioE4E4m6BE13BTsrqio1wv4C",
"Ordinary, chants and reference/12 Additions (Tuesday before Ash Wednesday, Week XXXIV).pdf": "169xZ1fjQacWljYcq-P2WaEr3cEib3fdO",
"Ordinary, chants and reference/13 Antiphonae in cantu.pdf": "1CZng6Se1DmJ_bCwRzHTtU1eGZG192ocq"
};
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
  function viewUrl(id) { return "https://drive.google.com/file/d/" + id + "/view"; }
  function previewUrl(id) { return "https://drive.google.com/file/d/" + id + "/preview"; }

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
  var state = { week: cal.week, day: now.getDay(), hour: hourFor(now), autoWeek: true };
  var saved = weekOverride(now);
  if (saved !== null) { state.week = saved; state.autoWeek = false; }

  var $ = function (s) { return document.querySelector(s); };

  function render() {
    var key = fileKey(state.week, state.day, state.hour), id = IDS[key];
    var weekly = state.hour <= 2;
    $("#now-title").textContent = DAYS[state.day] + (weekly ? " · Week " + ROMAN[state.week] : "") + " · " + HOURS[state.hour];
    var open = $("#open-btn");
    open.href = viewUrl(id);
    open.textContent = "Open in Google Drive";
    var note = "";
    if (cal.volume && state.day === now.getDay()) note = "Today falls in " + (cal.volume === "Lent" ? "Lent" : "Advent or Christmastide") + ": the choir uses the " + cal.volume + " volume. You can still browse the four-week psalter below.";
    $("#season-note").textContent = note;
    $("#season-note").hidden = !note;
    $("#week-auto").textContent = (state.autoWeek ? "Guessed from the calendar. Tap the right one if it's off." : "Set by you. Moves on every Sunday. (Calendar says Week " + ROMAN[cal.week] + ")") + (weekly ? "" : " Vespers and Compline are the same every week.");
    document.querySelectorAll("[data-week]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.week === state.week)); });
    document.querySelectorAll("[data-day]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.day === state.day)); });
    document.querySelectorAll("[data-hour]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.hour === state.hour)); });
    var lauds = $("#then-lauds");
    lauds.hidden = state.hour !== 0;
    if (state.hour === 0) lauds.onclick = function (e) { e.preventDefault(); state.hour = 1; render(); };
    var inBeta = renderBeta(key);
    $("#viewer").hidden = inBeta;
    var frame = $("#viewer iframe"), src = previewUrl(id);
    if (!inBeta && frame.getAttribute("src") !== src) frame.setAttribute("src", src);
    // Readings not printed in our book: the long ones at Matins, the short one at Vespers
    var rd = $("#readings");
    rd.hidden = state.hour !== 0 && state.hour !== 3;
    if (!rd.hidden) {
      var t = addDays(midnight(now), state.day - now.getDay());
      var ymd = t.getFullYear() + String(t.getMonth() + 1).padStart(2, "0") + String(t.getDate()).padStart(2, "0");
      $("#readings-link").href = "https://divineoffice.org/?date=" + ymd;
      $("#readings-text").textContent = state.hour === 0 ? "The long Matins readings aren't printed in our book." : "The short reading at Vespers isn't printed in our book.";
      $("#readings-link").textContent = (state.hour === 0 ? "That day's Office of Readings" : "That day's Evening Prayer") + " at DivineOffice.org ↗";
    }
  }

  // Beta (option C): psalms as text, chant as printed. The files are sealed
  // with the community password and opened here on the phone.
  var beta = { on: store("psalter-beta") === true, idx: null, loading: false, key: null, pages: {}, busy: null };
  function bytes(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function betaLabel(k) {
    var parts = k.replace(/\.pdf$/, "").split("/");
    return parts.map(function (p) { return p.replace(/^\d+ /, ""); }).filter(function (p) { return !/same every week/.test(p); }).join(", ");
  }
  function makeKey(pw) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(beta.idx.salt), iterations: beta.idx.iter, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    });
  }
  function openPage(file, key) {
    return fetch("beta/" + file).then(function (r) { if (!r.ok) throw new Error("fetch"); return r.arrayBuffer(); }).then(function (buf) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(buf, 0, 12) }, key, new Uint8Array(buf, 12));
    }).then(function (plain) { return new TextDecoder().decode(plain); });
  }
  function unlock(pageKey, pw, quiet) {
    var file = beta.idx.hours[pageKey], msg = $("#beta-msg");
    msg.textContent = "Opening…";
    var token = beta.busy = {};
    var keyP = beta.key ? Promise.resolve(beta.key) : makeKey(pw);
    keyP.then(function (key) {
      return openPage(file, key).then(function (html) {
        beta.key = key; beta.pages[pageKey] = html;
        if (pw) store("psalter-beta-pw", pw);
      });
    }).then(function () {
      if (beta.busy === token) { msg.textContent = ""; render(); }
    }).catch(function (e) {
      if (beta.busy !== token) return;
      beta.key = null; store("psalter-beta-pw", null);
      msg.textContent = e && e.message === "fetch" ? "Couldn't load this hour. Check the connection and try again." : (quiet ? "" : "That isn't the password.");
      $("#beta-lock").hidden = false;
    });
  }
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

  // Returns true when the Beta version is shown instead of the PDF.
  function renderBeta(pageKey) {
    var view = $("#beta-view"), note = $("#beta-note");
    $("#beta-toggle").checked = beta.on;
    note.hidden = true;
    if (!beta.on) { view.hidden = true; return false; }
    if (!beta.idx) {
      if (!beta.loading) {
        beta.loading = true;
        fetch("beta/index.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
          .then(function (idx) { beta.idx = idx; render(); })
          .catch(function () { beta.loading = false; note.textContent = "Couldn't load the Beta just now."; note.hidden = false; });
      }
      view.hidden = true; return false;
    }
    if (!beta.idx.hours[pageKey]) {
      note.textContent = "This hour isn't in the Beta yet, so here is the book. In the Beta so far: " + Object.keys(beta.idx.hours).map(betaLabel).join("; ") + ".";
      note.hidden = false; view.hidden = true; return false;
    }
    view.hidden = false;
    var content = $("#beta-content"), lock = $("#beta-lock");
    if (beta.pages[pageKey]) {
      lock.hidden = true;
      if (content.dataset.page !== pageKey) { content.innerHTML = beta.pages[pageKey]; content.dataset.page = pageKey; }
      openPicks(content);
      return true;
    }
    content.innerHTML = ""; content.dataset.page = "";
    var saved = store("psalter-beta-pw");
    if (beta.key || saved) { lock.hidden = true; unlock(pageKey, beta.key ? null : saved, true); }
    else { lock.hidden = false; }
    return true;
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

  $("#beta-toggle").addEventListener("change", function (e) { beta.on = e.target.checked; store("psalter-beta", beta.on || null); render(); });
  $("#beta-lock").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("#beta-pw").value;
    if (pw) unlock(fileKey(state.week, state.day, state.hour), pw, false);
  });

  document.querySelectorAll("[data-week]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.week = +b.dataset.week; state.autoWeek = false;
      store("psalter-anchor", { week: state.week, sunday: sundayOf(now).toISOString() });
      render();
    });
  });
  document.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { state.day = +b.dataset.day; render(); }); });
  document.querySelectorAll("[data-hour]").forEach(function (b) { b.addEventListener("click", function () { state.hour = +b.dataset.hour; render(); }); });
  $("#reset-btn").addEventListener("click", function () {
    store("psalter-anchor", null);
    now = new Date(); cal = calendar(now);
    state = { week: cal.week, day: now.getDay(), hour: hourFor(now), autoWeek: true };
    render();
  });
  document.querySelectorAll("[data-ref]").forEach(function (a) { a.href = viewUrl(IDS[a.dataset.ref]); });


  render();
  window.PSALTER = { compline: compline, calendar: calendar, easter: easter, firstAdventSunday: firstAdventSunday, endOfChristmastide: endOfChristmastide, hourFor: hourFor, fileKey: fileKey, IDS: IDS };
})();
