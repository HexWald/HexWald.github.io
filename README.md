# HexWald portfolio

Single-page portfolio. Static HTML/CSS/JavaScript. No build step, external fonts, cookies, analytics or third-party runtime dependencies.

## Local preview

Open `index.html` in a browser, or run:

```shell
python -m http.server 8000
```

Then visit http://localhost:8000.

## Content and privacy

- Project names, descriptions, links and technology lists: `content.js`.
- Main page, contact links and metadata: `index.html`.
- Layout, type and mobile styles: `styles.css`.
- Language switch and project details: `app.js`.
- No name, location, age, school or email address is included.

Project summaries are a first draft based on public work and the Telegram project feed. Please review them before publishing, especially the private Sketch Projects entry. No employment history or years of experience are claimed.

## Publish on GitHub Pages

1. Create a **public** repository named `HexWald.github.io` under the `HexWald` GitHub account.
2. **Unzip** the archive and open its extracted folder.
3. Upload `index.html`, `styles.css`, `content.js`, `app.js`, `favicon.svg`, `.nojekyll` to the repository root. `README.md` is optional. **Do not upload the ZIP** or the containing folder as a folder. The file `index.html` must be at the top level.
4. Commit to the `main` branch.
5. Settings > Pages > Build and deployment > Deploy from a branch > `main` / `(root)` > Save.
6. After deployment completes, open https://hexwald.github.io/.

All 6 site files are necessary/recommended. If your computer hides `.nojekyll`, GitHub Pages normally still handles these files, but uploading it avoids Jekyll processing.

## Note

This is an independently built portfolio in the user's requested minimal style, not the source code of a third-party reference project.
