# CLICKBAIT 2.0

A session based photo and scrapbook editor. The homepage and editor are built with vanilla HTML, CSS, and JavaScript. Fabric.js runs locally in the browser; Express serves the application and its local assets. The app has no accounts, database, or project persistence.

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:3000`. The homepage opens one shared editor at `editor.html?world=<world-id>` for Pastel, Y2K, Desi, Grunge, Shoujo, or Floral.

## Project map

- `index.html`, `editor.html` — production pages
- `css/`, `js/` — separated interface styles and browser modules
- `assets/catalog.json`, `assets/` — the original asset catalog and library
- `frame-layouts.json` — normalized photo-slot layout data, separate from catalog metadata
- `CLICKBAIT_*.html` — untouched Claude prototypes for visual reference
- `demo-assets/` — homepage example images extracted from the prototype’s inline data

## Frame slot layouts

The catalog lists each frame’s `photoSlots` count, but has no slot coordinates. Add geometry under `frames` in `frame-layouts.json`, using the frame’s exact catalog `src` as its key, for example `{"slots":[{"x":0.1,"y":0.1,"width":0.35,"height":0.8}]}`. Add one slot entry for each `photoSlots` value. Each slot uses normalized `x`, `y`, `width`, and `height` values between 0 and 1; optional `rotation` and `radius` values can describe its presentation. Frames without a complete definition remain visible in the inventory and report that their photo slots need layout data.

## Session behavior

Uploads remain in browser memory for the open session. Export downloads the canvas locally. The Save action and project accounts from the visual prototype are intentionally not present because this app does not keep projects.
