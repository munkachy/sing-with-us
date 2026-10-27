# munkachy/sing-with-us: the abbey's public site, and the monks' psalter page

GitHub Pages serves branch **`claude/sing-with-us-site-hgfd57`** at https://munkachy.github.io/sing-with-us/.
The psalter page is `psalter/` (unlisted, for the monks). Its sources and tools are in the private repo
**munkachy/psalter** (see its CLAUDE.md); nothing in `psalter/` is made by hand except the JS, CSS and HTML.

## The psalter page (`psalter/`)

| File | What |
|---|---|
| `index.html` | The page. Scripts and styles carry `?v=N`: **bump N on every file you change** |
| `app.js` | Calendar, ordo line, the vault (sealed PDFs, PBKDF2 + AES-GCM), PDF.js drawing, and the "recipes" that paste hours together from strips of pages (`assembly.json`). Exposes `window.PSALTER_IN` for readings.js |
| `readings.js` | The Matins readings (which day's readings: `dayKey`; settings `YEAR_FROM`, `ASCENSION_ON` at the top), and each monk's highlights, notes, page marks, backup and export (localStorage only) |
| `assembly.json` | Made in munkachy/psalter (`books/assemble.py`, `books/seasons.py`). "marks": where the book offers seasonal choices; "readings": where the two readings go in each Matins |
| `vault/` | Everything sealed. `index.json`: "pdfs" (book files), "lect" (readings, one file per day key), "necro" (the abbey's necrology notices by day of death). Never change its salt |
| `books.json`, `ordo-YEAR.json`, `house.json`, `necrology.json`, `collects.json` | Data, from munkachy/psalter |

### How an hour is shown

`show()` in app.js picks a recipe: `sundayRecipe` (Sat/Sun Vespers through the year) → `complineRecipe` → `sextRecipe` →
`saturdayRecipe` → `weekRecipe` (weekly Matins, Lauds, Vespers cut by season with `cutFile`, Sunday Te Deum) …, then
`weeklyExtras` (Psalm 94, sung Benedictus) and `withReadings` (slots for the readings at Matins). `drawRecipe` draws the
strips; each page sits in a `.pg` box (marks are placed on it), each reading slot is a `.lect-slot` that readings.js fills.
"Show the book pages instead" (`plain`) turns all cutting off; the readings then follow the pages in `#lect`.
`dayEnd()` shows the necrology after Compline (names from `necrology.json`, notices from the vault, `loadNecro`);
`ordoNote()` folds the same notices into the ordo line. The help text is the `.help-menu` in index.html: update it
when the page changes.

### Testing

Serve the repo root (`python3 -m http.server 8765`), open `http://127.0.0.1:8765/psalter/#date=YYYY-MM-DD`, unlock with
the password (env `LECTIONARY_PASSWORD`, typed into `#pw` by Playwright; never print it). `PSALTER_IN.recipe.items`
is what was pasted together; munkachy/psalter `books/ocr/` turns strips back into text to check them.

## Publishing (only when the user says so)

Work on the session's branch; then push it to `main`, then fast-forward `claude/sing-with-us-site-hgfd57` to `main`
(both are plain fast-forward pushes). Pages updates in about a minute; check `curl …/psalter/` shows the new `?v=`.
