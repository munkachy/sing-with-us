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
| `text.js` | **Book · Lectio · Cantus** (Nov 2026): the hour as set text. Lectio = all text (the chant as its words); Cantus = text, but the book's notation kept wherever there is chant (cut from the page by the chant block's `y`). Choice kept on the phone (`psalter-read`, default `book`). Text = vault "text" (book file path → sealed JSON {page index: [blocks]}), made by munkachy/psalter `books/text_seal.py`. A strip shows the blocks whose middle lies inside it, so recipes work unchanged; strips of pages not yet in text stay images (`#text-note` says so). Text strips are `.tx-strip`, not `.pg`, so ✎ page marks are a Book-mode feature. Where a rubric reads exactly "The Antiphon is repeated.", the antiphon last shown (the day's own) is printed again (`.tx-repeat`; a sung one with its notation in Cantus). The large capital is only for the first verse of a psalm or canticle. The pages sit on parchment in every theme: headings `--tx-head` (dark red in the default/cloister theme, black in the others), rubrics `--rubric`; chant crops are never inverted. So far in text: all of Weeks I–IV (Matins, Lauds, Sext), the weekly Vespers, Compline, Psalm 94 (Mode II D pages), the sung Benedictus |
| `proper.js` | The hebdomadarian's Proper: the whole Liber Hebdomadarii (vault "proper"). `resolve(d)` picks the day's page (sanctoral / season / weekly, Our Lady's Saturday, I Vespers by the ordo), `plan` the hour's capitulum and Oration; fills the `.proper-slot`s or `#proper`. Choices on the phone: `psalter-oration` (weekday: printed / Sunday), `psalter-oration-alt` (which of several Orations) |
| `assembly.json` | Made in munkachy/psalter (`books/assemble.py`, `books/seasons.py`). "marks": where the book offers seasonal choices; "readings": where the two readings go in each Matins; "proper_at": where the capitulum and Oration go in each weekly hour |
| `vault/` | Everything sealed. `index.json`: "pdfs" (book files), "lect" (readings, one file per day key), "necro" (the abbey's necrology notices by day of death), "proper" (the Proper, one file), "text" (the proofread book text, one file per book file). Never change its salt |
| `books.json`, `ordo-YEAR.json`, `house.json`, `necrology.json`, `collects.json` | Data, from munkachy/psalter |
| `house.json` | Kept here, by hand: the abbey's Our Lady Saturdays (`bvmSaturdays`) and the Master of Ceremonies' notices by date (`notices`, shown on the ordo line and in the calendar). The Office of the Dead days (2 Nov, every hour with its own Compline; 14 Nov, Matins to Sext) are `DEAD` in app.js |

### How an hour is shown

`show()` in app.js picks a recipe: `sundayRecipe` (Sat/Sun Vespers through the year) → `complineRecipe` → `sextRecipe` →
`saturdayRecipe` → `weekRecipe` (weekly Matins, Lauds, Vespers cut by season with `cutFile`, Sunday Te Deum) …, then
`weeklyExtras` (Psalm 94, sung Benedictus), `withProper` (slots for the Proper) and `withReadings` (slots for the readings at Matins). `drawRecipe` draws the
strips; each page sits in a `.pg` box (marks are placed on it), each reading slot is a `.lect-slot` that readings.js fills.
"Show the book pages instead" (`plain`) turns all cutting off; the readings then follow the pages in `#lect`.
`dayEnd()` shows the necrology after Compline (names from `necrology.json`, notices from the vault, `loadNecro`);
`ordoNote()` folds the same notices into the ordo line. The help text is the `.help-menu` in index.html: update it
when the page changes.

### Testing

Serve the repo root (`python3 -m http.server 8765`), open `http://127.0.0.1:8765/psalter/#date=YYYY-MM-DD`, unlock with
the password (env `LECTIONARY_PASSWORD`, typed into `#pw` by Playwright; never print it). `PSALTER_IN.recipe.items`
is what was pasted together (`pdf-pages` `dataset.done` is the recipe fully drawn); munkachy/psalter `books/ocr/` turns strips back into text to check them.

## Publishing: go live after every change, unless the user says to wait (the user, 27 Oct 2026)

Work on the session's branch; then push it to `main`, then fast-forward `claude/sing-with-us-site-hgfd57` to `main`
(both are plain fast-forward pushes). Pages updates in about a minute; check `curl …/psalter/` shows the new `?v=`.
