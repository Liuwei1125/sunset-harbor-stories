# GitHub project archive

This repository preserves the Sunset Harbor Stories source project, offline releases, artwork, Blender source files, verification evidence, previews, and engine research. Files previously ignored only to keep the Site deployment small are included here for safekeeping.

## History and research

The original main branch history is retained. The original `research/web-game-engines` repository is included as ordinary files under that path, and its original Git history is preserved separately on the `archive/web-game-engines` branch.

## Build

Use Node.js to run `npm run check` for the main bundles' syntax checks. Use Python 3 to run `python3 tools/build_site.py` (or `npm run site:prepare`) to regenerate the root `dist/` output. The root `dist/` is reproducible and excluded from Git; the separate research site's existing `research/web-game-engines/dist/` is included. Building also updates `site-verification/build.json`.

This GitHub archive does not change or deploy the existing Sites installations.

## Asset attribution and local-only files

Keep the existing `NOTICE.md`, asset provenance, author credits, license texts, and modification notes with redistributed assets. Individual third-party assets retain their respective licenses; publishing this archive does not grant a new blanket license.

The nine photographs listed in `art/vehicles/su7/references/sources.json` are modeling references without redistribution permission from this project. Their source URLs and hashes are retained, but the photographs are excluded from this public repository and preserved in a separate local backup. They are not used as model textures.

Git administration data, machine caches, dependencies, local runtime data, and secret environment files are excluded. Automatic local Codex checkpoint references are not published.
