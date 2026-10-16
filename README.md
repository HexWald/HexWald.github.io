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
- `demo-data.js`: sample API responses and server records.
- `demos.js`: input validation, filters, previews and downloads.
- `app.js`: language preference, navigation and dialogs.

## Demos

- Kwork Notifier processes an editable JSON batch, sorts IDs and skips duplicates. Repeat a batch to see the effect of the in-memory history, or reset it to start over. The preview shows the latest prepared notification and a processing log.
- MC Scanner filters sample results by address, software and access status. Select a server to inspect its disconnect reason and mod list. CSV and JSON downloads contain the currently filtered records; missing values stay unknown.
- ServerInserter checks a text list against a sample existing address and finds duplicates, including case and default-port variations. Its JSON preview contains only accepted records. It does not write Minecraft's NBT format.
- Cacao previews crosshair style, size, gap and HUD scale. Settings can be copied as JSON. This is a browser model of the controls, not gameplay footage or a client configuration file.

The demos run locally with sample data. They do not scan servers, read Kwork or send Telegram messages. Their downloads are marked as samples. Source links point to the actual projects.

The page respects reduced motion. Project descriptions and source links remain available without JavaScript. Only the language preference is stored in localStorage.

## Checks

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
```

The check starts its own local server and tests valid and invalid input, duplicate handling, filtered downloads, both languages, keyboard navigation, mobile layout and reduced motion. It also checks that demos make no external requests. Screenshots are saved under `build/`, which is ignored by Git.

GitHub Pages publishes the root of `main`.

## Fonts

Golos Text uses the SIL Open Font License. Its license is included in `assets/fonts`.
