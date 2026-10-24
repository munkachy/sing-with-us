/* Monastic Psalter for the monks of Saint Bernard Abbey.
   The book itself stays in a private Google Drive folder; this page only
   points to the right file. Google checks each monk's sign-in when it opens.
   Week rule (Br. Augustine): the four-week count starts fresh at Week I after
   Christmastide and again at Easter. Advent-Christmastide and Lent use their
   own volumes. */
(function () {
  var IDS = {
"Compline (every night).pdf": "1BHZ5Z_jy_A8xVGvj_qKUeY_Q0pMxqPUJ",
"Ordinary, chants and reference/01 Title, dedication and Foreword.pdf": "1qKCWG0ssp0jgk4S952Lxh7cWBvswAouB",
"Ordinary, chants and reference/02 Ordinary at Sext.pdf": "1w1cF--0ay4oW7RGGFlJ7QZrMldo1b3YE",
"Ordinary, chants and reference/03 Ordinary (opening verses, chanting the psalms, Our Father, Benedicamus).pdf": "1LV21gHuxZK24po8YW30g79n9qFYEFaAY",
"Ordinary, chants and reference/04 Invitatory (Psalms 94 and 99, all tones).pdf": "1BWjRHMmAlJAxmJ5P8yOOGcUXV0aeiQxC",
"Ordinary, chants and reference/05 Gospel canticles, Te Deum and Te Decet Laus.pdf": "1dUjoA6nXLBB66h3t4GXIVRy3y_0ywLCF",
"Ordinary, chants and reference/06 Capitula in cantu.pdf": "1xWCV56zaYQGT1wtuYbHVQkveYId3Wein",
"Ordinary, chants and reference/07 Blessings and prayers, Benediction, Laudes Hincmari.pdf": "1O_2BNasuYyj8VO9pqEPQaVLKBY8zuoTo",
"Ordinary, chants and reference/08 Magnificat and Benedictus tones.pdf": "1-kteSnSzpPY1Kxi1zAnv0B26ffrr3sW-",
"Ordinary, chants and reference/09 Prayers.pdf": "1in6FyYS6fDcuZhd07ufQ7X8webLFjLjN",
"Ordinary, chants and reference/10 Order of Service and Distribution of the Psalms.pdf": "1rDq5r-ej18sdV5_jNSZ-cmgciH4fDtUa",
"Ordinary, chants and reference/11 Index and Acknowledgments.pdf": "1gFzl4ytKFUO6x1OLpaoVMWfC7002ARI-",
"Ordinary, chants and reference/12 Additions (Tuesday before Ash Wednesday, Week XXXIV).pdf": "10rdJu2YzxFxC9Cglhd-NMKSUPSyS8bWW",
"Ordinary, chants and reference/13 Antiphonae in cantu.pdf": "17_fyTIxWfePnJVhHB6FVrTMxBP1wi_Tq",
"Vespers (same every week)/1 Sunday at Vespers.pdf": "11SHRWdECrN4j2YDy4_P90QsbXsOGYmlL",
"Vespers (same every week)/2 Monday at Vespers.pdf": "1Ub-WpXz2sWPd4lsyxOgVJTxt7EDQ6WHb",
"Vespers (same every week)/3 Tuesday at Vespers.pdf": "1hBoqZfWmIlHJeo9Iz6N2gi3cra4nQu6U",
"Vespers (same every week)/4 Wednesday at Vespers.pdf": "1yGiCEJpt7EJB3nKrxbn9S3OcazHtplhx",
"Vespers (same every week)/5 Thursday at Vespers.pdf": "1RuhKn9cM0pexnzJeBsVwlPqPYCciW9aq",
"Vespers (same every week)/6 Friday at Vespers.pdf": "15gfGU-Utp9ecXAH7RBLmAi2jpvCEs3Km",
"Vespers (same every week)/7 Saturday at Vespers.pdf": "1nyi2eXZyBwdHSqejhyy1oMbVOycGFXea",
"Week I/1 Sunday/1 Matins.pdf": "1moOXw0KyJLcF0scz6CLYScaKwYgUwuYb",
"Week I/1 Sunday/2 Lauds.pdf": "1DCdbFq5IFRYvZVWCQOkYl9PEO3vWXWxW",
"Week I/1 Sunday/3 Sext.pdf": "1_qdT0Fhn_dlVuNFYb_gsrySH7tmdfF_p",
"Week I/2 Monday/1 Matins.pdf": "182T9sdJQxJL2fI9-Rz5TBj5icvjgKdNk",
"Week I/2 Monday/2 Lauds.pdf": "1YeLsjPvJFe4Ns2qcuvrfqUc8c6uIIBtp",
"Week I/2 Monday/3 Sext.pdf": "1I5emBnrO3S9E8X4lfgWpHHc2CgTCOCWX",
"Week I/3 Tuesday/1 Matins.pdf": "1YjsoE-Txyf80I74uWAwt6AGmOedB4QBK",
"Week I/3 Tuesday/2 Lauds.pdf": "1I85xc1sq7Taju_sRguciMY208dgEsU9Y",
"Week I/3 Tuesday/3 Sext.pdf": "13zKvf88h0BfkpzbnmktWSIiTlOfNbDBj",
"Week I/4 Wednesday/1 Matins.pdf": "129JmrNoqjtO0FkB53EF7oNneh9l8gdM7",
"Week I/4 Wednesday/2 Lauds.pdf": "100Kt2qKA_kj3K_8jI50WaJcQ0sWVw4cL",
"Week I/4 Wednesday/3 Sext.pdf": "1ndHQk7-x18ySoUJFhzGKrOiosUAeQjv5",
"Week I/5 Thursday/1 Matins.pdf": "11y0EwJ8hYQDiploqUvvGaTT3yvxdmZCW",
"Week I/5 Thursday/2 Lauds.pdf": "1JhTAJV1R0pxMI6dQLvTHK1dNt5vcvIvt",
"Week I/5 Thursday/3 Sext.pdf": "1t0tylRYsp9iRnjqPtlhT8ygcYLOCmv6i",
"Week I/6 Friday/1 Matins.pdf": "13REM1jGGZEo0tBG_mORxxEe-z6HhInuI",
"Week I/6 Friday/2 Lauds.pdf": "1Szkd5SF59TMbsXlXFtAMQct62kLIxKPM",
"Week I/6 Friday/3 Sext.pdf": "1d56Na26vtBzJ0bukaGCH3fEknTykIIry",
"Week I/7 Saturday/1 Matins.pdf": "1DrK-HM4B6JMotmJjCyHc_smnZWGdeEGO",
"Week I/7 Saturday/2 Lauds.pdf": "1CmtzbvxjuzbGkWODlcZ7kEdaKztdXcx6",
"Week I/7 Saturday/3 Sext.pdf": "1otlymiD5AwH9r-WzO3VZ01UH5Nq41E7L",
"Week II/1 Sunday/1 Matins.pdf": "1fF_McHHSO3HOGGG60JAfzYuKtUAvlRLp",
"Week II/1 Sunday/2 Lauds.pdf": "19UwAFtg1__2gokJuHSXIJXDsF9nTYVNK",
"Week II/1 Sunday/3 Sext.pdf": "1ZX_qlRAbgVcHptHlWaqosq4J6tC9-HXI",
"Week II/2 Monday/1 Matins.pdf": "11JtNxMg96KrT9LBUmAOOxGvy4vPtwNXw",
"Week II/2 Monday/2 Lauds.pdf": "1tsvSO2XNGRhrrDdU-Wv2c4GjinbNFVdu",
"Week II/2 Monday/3 Sext.pdf": "1h_o12FjcNCUKtuyGoLwf29r3znnus9vb",
"Week II/3 Tuesday/1 Matins.pdf": "1-PPgtT2r64j53edaJHoCnsu4m8euu9D-",
"Week II/3 Tuesday/2 Lauds.pdf": "12ue_m_u-rkOrJA7Cz8gje5QmWjPZuC7k",
"Week II/3 Tuesday/3 Sext.pdf": "17OdMzsCnlrLTKwvgLbSyIhNwE3LKDvqT",
"Week II/4 Wednesday/1 Matins.pdf": "14RmP0vpjKrHfFlXW1DruDHTUTB-YKga2",
"Week II/4 Wednesday/2 Lauds.pdf": "1Xd4j5Uapmn1TGxWvV3OO8jfYtvH6rRAp",
"Week II/4 Wednesday/3 Sext.pdf": "1aTwt3u4i1JmgfGuEyu2Yv_j_3rS-6ZXy",
"Week II/5 Thursday/1 Matins.pdf": "1eQ7MgsiHc2bEhxrOs3b0r1MdBNBXgSvz",
"Week II/5 Thursday/2 Lauds.pdf": "1gzQpl9rJPFt5IL5FHGhQAHtGu6ZqNqH2",
"Week II/5 Thursday/3 Sext.pdf": "1V2wey-5sINsfJRxS7-WyR9ObmHL14cko",
"Week II/6 Friday/1 Matins.pdf": "1CdrVF75DhhpmxvuFx_wYtAGBe2Qk7vks",
"Week II/6 Friday/2 Lauds.pdf": "1n2XVQW_ejln7gMG9zhEdXcUSORzhnkaV",
"Week II/6 Friday/3 Sext.pdf": "1IZ7oOdksg1AdW60nZmVCw0LuXdLptdgB",
"Week II/7 Saturday/1 Matins.pdf": "1rjJKdngt0BfMzwKDfnkCZNNHYWW44duK",
"Week II/7 Saturday/2 Lauds.pdf": "1ps4785KEiocTo8dnQi3aTapwipOBw-q9",
"Week II/7 Saturday/3 Sext.pdf": "1iMPqGVthtnBpoMwgdYXMej8oK_Qe15JZ",
"Week III/1 Sunday/1 Matins.pdf": "1HWTcF2KFE34EwPIuu4dKd6i8LyUSaADS",
"Week III/1 Sunday/2 Lauds.pdf": "13skjI756CMvUtvaNAomwtoobQ3BvgLLT",
"Week III/1 Sunday/3 Sext.pdf": "1HjQvFtALk0nkpbf4AvvBrAp5NIs7cdpV",
"Week III/2 Monday/1 Matins.pdf": "19V3Ai895F8bVPJVTY9_XibjaX5-Ps6y8",
"Week III/2 Monday/2 Lauds.pdf": "1tFTgXlQ0DTzJoanBlZyftRPmuVhgRlk_",
"Week III/2 Monday/3 Sext.pdf": "1XZ9XVBPoN76X1KNsHI3qhvw-hiqdC36R",
"Week III/3 Tuesday/1 Matins.pdf": "1sRNBEt5tZrtY3jMZosYSnZtTyRjr2ivZ",
"Week III/3 Tuesday/2 Lauds.pdf": "1UJVOjy47xdL2tC1rqulfTe_0AzV2GlUR",
"Week III/3 Tuesday/3 Sext.pdf": "1C3RiyQ6rpIyRYFFEaGcjLfHPltVioQQf",
"Week III/4 Wednesday/1 Matins.pdf": "11rga-1FBNE98Z2lF1suWWYX2Hxbufmw3",
"Week III/4 Wednesday/2 Lauds.pdf": "1RST2Lf56MBqQoXi2BqBEzw6SHwq5o2Nl",
"Week III/4 Wednesday/3 Sext.pdf": "1b1Ft21PmnDxUdhV518Xj685Z_Tm7F87J",
"Week III/5 Thursday/1 Matins.pdf": "1MsZStVfsOCinIQriJsQ4t0nIvR8gw181",
"Week III/5 Thursday/2 Lauds.pdf": "1lPTsalquMTYq5K3hUsriedhiSTG4hg65",
"Week III/5 Thursday/3 Sext.pdf": "19iDeaBt7saOzgucLDEfUn4Bhtoo09P_9",
"Week III/6 Friday/1 Matins.pdf": "1zA_3w9KYw0JgpapXBtZVTR7pC7SuGeUi",
"Week III/6 Friday/2 Lauds.pdf": "14Fzn91oMKYpDG-C3G2vLY8Ln_mz8V9IP",
"Week III/6 Friday/3 Sext.pdf": "1DF5k-84nRsyL96W7ItudhxykfeJt3yal",
"Week III/7 Saturday/1 Matins.pdf": "1k1ifz_nzPRdqDmoOkVNVCyOaM402pc_W",
"Week III/7 Saturday/2 Lauds.pdf": "1E-6eC2l6XiW1Y5ns9vYG3ACYNz36Q-KS",
"Week III/7 Saturday/3 Sext.pdf": "1JWGlgBXQfM079-ZR6CBlymEPTWNAngDx",
"Week IV/1 Sunday/1 Matins.pdf": "1RV7Urjxlox4zg1rtodNcHPbI6OoE3L01",
"Week IV/1 Sunday/2 Lauds.pdf": "1Pr0p5Gn03V83uDo8GV2ioiMFXsEJYcvy",
"Week IV/1 Sunday/3 Sext.pdf": "1WtP1YSr9QpoPKH-NyxSKaP1VW6hRTRut",
"Week IV/2 Monday/1 Matins.pdf": "1v3b3w7fL033ModVzt1yQSsRoY4NaHgLa",
"Week IV/2 Monday/2 Lauds.pdf": "1kD1tAwFDYPqo-kCEpordNwB-n3shPAJR",
"Week IV/2 Monday/3 Sext.pdf": "1Kd__AX2S80XrsnTlyFWFhl05uqvuRke3",
"Week IV/3 Tuesday/1 Matins.pdf": "1qGmhWRI4ogmRf0tJnXoqsBy8_6sd2MHt",
"Week IV/3 Tuesday/2 Lauds.pdf": "14t-sEgHk0J2nKiDmKVNZmH7OVilFvATj",
"Week IV/3 Tuesday/3 Sext.pdf": "186WuDkTKgfNzcYR5ONgNH_vd646d51EO",
"Week IV/4 Wednesday/1 Matins.pdf": "1aJk7HN2BqTraLd0uX8ZvdSYFCPSqWyh4",
"Week IV/4 Wednesday/2 Lauds.pdf": "1CTyS1apCV1Vbv25X5K-DSyhdUWma6_t-",
"Week IV/4 Wednesday/3 Sext.pdf": "1ep-FYWvAKSxRLlungGSj1Kaw4TiWCKFA",
"Week IV/5 Thursday/1 Matins.pdf": "1jKcL1PqbTwpxNTAMf_3LNb6Jl0WJbZLY",
"Week IV/5 Thursday/2 Lauds.pdf": "1GcN31ZPAUh_-wQ0rIR2s9iD633BDh_kw",
"Week IV/5 Thursday/3 Sext.pdf": "1rV25WG6O4neDKvCf3etinEy51QsBLEfG",
"Week IV/6 Friday/1 Matins.pdf": "1EbY0sGaxELUkAqdss6_F5RpakdMf0THB",
"Week IV/6 Friday/2 Lauds.pdf": "16mGPRes6ebYz4MfoQC6GkmtBV8fr7C87",
"Week IV/6 Friday/3 Sext.pdf": "10kTG411FvJ3aXsQewmMmp1hsH69UZlE7",
"Week IV/7 Saturday/1 Matins.pdf": "1svceKzIVdKBfd5vC95sFKUg-w2gpFWmg",
"Week IV/7 Saturday/2 Lauds.pdf": "1MO-hJKGQ_SVBaGAmyxEd1ywSDncZtcvG",
"Week IV/7 Saturday/3 Sext.pdf": "1eCbvwWqqg2ew4dkEqYVoJPQCCGh0y1Pj"
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

  // A chosen week is remembered until the next Sunday.
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function weekOverride(now) {
    var o = store("psalter-week");
    if (o && o.until && now < new Date(o.until)) return o.week;
    return null;
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
    open.textContent = "Open " + HOURS[state.hour];
    var note = "";
    if (cal.volume && state.day === now.getDay()) note = "Today falls in " + (cal.volume === "Lent" ? "Lent" : "Advent or Christmastide") + ": the choir uses the " + cal.volume + " volume. You can still browse the four-week psalter below.";
    $("#season-note").textContent = note;
    $("#season-note").hidden = !note;
    $("#week-auto").textContent = state.autoWeek ? "From the calendar" : "Chosen by you (until Sunday)";
    document.querySelectorAll("[data-week]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.week === state.week)); b.disabled = !weekly; });
    $("#week-group").classList.toggle("dim", !weekly);
    document.querySelectorAll("[data-day]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.day === state.day)); });
    document.querySelectorAll("[data-hour]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.dataset.hour === state.hour)); });
    var lauds = $("#then-lauds");
    lauds.hidden = state.hour !== 0;
    if (state.hour === 0) lauds.href = viewUrl(IDS[fileKey(state.week, state.day, 1)]);
    var viewer = $("#viewer");
    if (!viewer.hidden) $("#viewer iframe").src = previewUrl(id);
  }

  document.querySelectorAll("[data-week]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.week = +b.dataset.week; state.autoWeek = false;
      var sunday = addDays(midnight(now), 7 - now.getDay());
      store("psalter-week", { week: state.week, until: sunday.toISOString() });
      render();
    });
  });
  document.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { state.day = +b.dataset.day; render(); }); });
  document.querySelectorAll("[data-hour]").forEach(function (b) { b.addEventListener("click", function () { state.hour = +b.dataset.hour; render(); }); });
  $("#show-btn").addEventListener("click", function () {
    var v = $("#viewer"); v.hidden = !v.hidden;
    $("#show-btn").textContent = v.hidden ? "Show it here" : "Hide";
    render();
    if (!v.hidden) v.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#reset-btn").addEventListener("click", function () {
    store("psalter-week", null);
    now = new Date(); cal = calendar(now);
    state = { week: cal.week, day: now.getDay(), hour: hourFor(now), autoWeek: true };
    render();
  });
  document.querySelectorAll("[data-ref]").forEach(function (a) { a.href = viewUrl(IDS[a.dataset.ref]); });

  render();
  window.PSALTER = { calendar: calendar, easter: easter, firstAdventSunday: firstAdventSunday, endOfChristmastide: endOfChristmastide, hourFor: hourFor, fileKey: fileKey, IDS: IDS };
})();
