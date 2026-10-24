# The Oldest Conversation

(The site's working name was "Sing With Us"; the repository and web address keep that name for now.)

A small website from the Benedictine monks of Saint Bernard Abbey (Cullman, Alabama), inviting visitors to pray the Psalms with the community. Visitors reach it through QR codes in the abbey church.

It is a plain static site: HTML, one stylesheet, one small JavaScript file. No frameworks, no build step, no tracking, no cookies, no forms. Fonts and images are stored in the repository, so the site never contacts another server.

## What's where

| Path | Page |
|---|---|
| `index.html` | Landing page: welcome and the three doors |
| `seekers/` | Door 1: "Just curious?" (atheists, agnostics, the curious) |
| `seekers/bracketing/` | Optional page on "leaving the question open" (bracketing, Edith Stein) |
| `christians/` | Door 2: "Christian visitor?" (Protestant and non-denominational), with the ten common questions |
| `catholics/` | Door 3: "Catholic?" |
| `visit/` | Prayer times and what to expect |
| `our-psalter/` | How to follow along in the choir book |
| `meditations/` | The library of "phone calls" with the Psalms |
| `meditations/tips/` | All the meditation tips on one page (the same tips appear after each meditation) |
| `quotes/` | Quotes about prayer from the saints and the Catechism (each also appears somewhere on the site) |
| `oblates/` | Becoming an oblate |
| `about/` | Who we are, how the site was made, privacy, sources, picture credits |
| `assets/css/site.css` | All styling, including the three color themes |
| `assets/js/site.js` | Theme switcher, the gentle questions, and review mode |
| `assets/img/` | Pictures (credits are on the About page) |
| `assets/fonts/` | EB Garamond and Cinzel (SIL Open Font License) |
| `CONTENT-TODO.md` | Every placeholder, open decision, and quotation still to check |

## When you change the stylesheet or script

Every page loads `site.css?v=11` and `site.js?v=11`. Phones keep old copies of these files, so after any change to `assets/css/site.css` or `assets/js/site.js`, raise the number on every page (for example to `?v=12`). From the repository folder:

```sh
find . -name '*.html' -exec sed -i 's/?v=11"/?v=12"/g' {} +
```

## Three themes

Visitors can switch themes with the three round buttons in the header:

- **Habit**: deep black and candle gold, like our habits.
- **Cloister**: parchment and rubric red, like an old choir book.
- **Stained glass**: jewel colors.

If a visitor hasn't chosen, the site follows the phone's own light or dark setting (Cloister or Habit). The choice is remembered only in the visitor's own browser.

## Review mode

Add `?review` to the end of any page address (for example `.../christians/?review`). Small badges then appear next to every quotation and open item:

- **Green**: checked against the source.
- **Yellow**: still needs checking.
- **Red**: waiting on a decision.

Review mode stays on while you browse. Add `?review=off` to turn it off. Visitors never see the badges.

## Publishing on GitHub Pages

1. Merge this branch into `main` on GitHub.
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute or two, the site appears at `https://munkachy.github.io/sing-with-us/`.

All links inside the site are relative, so the site works both at that address and at a custom domain.

Note: on a free GitHub account, the repository itself is public, even while the pages ask search engines not to list them.

## Adding a custom domain later

1. Buy the domain from any registrar.
2. In **Settings → Pages → Custom domain**, enter it and save. GitHub adds a `CNAME` file to the repository.
3. At your registrar, point the domain to GitHub Pages as GitHub's instructions describe (DNS records for an apex domain, or a CNAME record for a `www` subdomain).
4. Once the domain works, tick **Enforce HTTPS**.

Print the final QR-code signs only after the address is settled.

## Removing `noindex` after the abbot approves

Every page has this line in its `<head>`:

```html
<meta name="robots" content="noindex, nofollow">
```

When the site is approved, delete that line (and the comment just above it) from every `.html` file. From the repository folder, this command does it in one step:

```sh
find . -name '*.html' -exec sed -i '/noindex, nofollow/d; /ask search engines not to list it/d' {} +
```

Also remove the sentence "Until it's approved, it asks search engines not to list it." from `about/index.html`.

## Content rules (short version)

- Never change psalm text. The meditations quote short excerpts of the Grail (the translation our choir sings), copied exactly; other quotations come from the World English Bible (Catholic edition, public domain).
- Heard replies are clearly marked meditations, credited only to "a Benedictine monk."
- Every Church-document quotation gives its source and was checked against the official text (see `CONTENT-TODO.md`).
- Name no individual monks or local people.
