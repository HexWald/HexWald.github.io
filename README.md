# HexWald

My portfolio: [hexwald.github.io](https://hexwald.github.io/).

Static HTML, CSS and JavaScript. No build step. Fonts are served locally.

## Run locally

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. Opening `index.html` directly also works, although browser clipboard access may be limited.

## Edit

- `index.html`: page structure, project links and Russian fallback text.
- `content.js`: Russian and English copy, project details.
- `styles.css`: layout, typography and animations.
- `app.js`: previews, language preference, navigation and dialogs.
- `assets/scene.svg`: the block scene used in Cacao previews.

The previews use sample data and run locally in the browser. They do not scan servers, read Kwork or send Telegram messages. Source links point to the actual projects.

The page respects reduced motion. Project descriptions and source links remain available without JavaScript. Only the language preference is stored in localStorage.

## Checks

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
```

The check starts its own local server and tests the previews, both languages, keyboard navigation, mobile layout and reduced motion. Screenshots are saved under `build/`, which is ignored by Git.

GitHub Pages publishes the root of `main`.

## Fonts

Golos Text and Unbounded use the SIL Open Font License. License files are included in `assets/fonts`.
