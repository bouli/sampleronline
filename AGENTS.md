# Repository Guidelines

## Project Structure & Module Organization

This is a static browser application using vanilla HTML, CSS, JavaScript, Web Audio, and IndexedDB. There is no backend or build pipeline. Serve/deploy only `public/`; root contributor files must not be published.

- `public/index.html`, `public/app.js`, and `public/style.css`: sampler, banks, patterns, sequencer, and shared styling.
- `public/synth.html`, `public/synth.js`, and `public/synth.css`: synthesizer and sample capture.
- `public/interface-resources/`: browser storage, session archives, audio startup, focus handling, and How to guides.
- `public/plugins/`: lo-fi filtering and reverb audio modules.
- `public/vendor/`: bundled ZIP/YAML libraries and licenses. Demo samples are generated in code.
- `scripts/serve.cjs`: dependency-free Node development server; serves only `public/`.
- `tests/*.test.cjs`: dependency-free Node regression tests; `tests/MANUAL.md`: browser checklist.

## Build, Test, and Development Commands

- `PORT=8080 node scripts/serve.cjs`: serve the public application; open `http://localhost:8080`.
- `make run`: serve `public/` on port 8000; override with `make run PORT=8080`.
- `git diff --check`: check whitespace before submitting changes.

Use Node.js 20+ and `make test` (or `node --test tests/*.test.cjs`) for tests; no dependency installation is needed. The app and tests do not require Python. If adding Python tooling, use `uv` for its execution. No compilation or lint command is configured.

## Coding Style & Naming Conventions

Follow nearby code. Prefer two-space indentation and semicolons in readable JavaScript; avoid reformatting existing compact files during unrelated changes. Use camelCase for variables/functions and kebab-case for filenames, HTML IDs, and CSS classes. Keep shared interface utilities in `public/interface-resources/` and audio effects in `public/plugins/`. Preserve script loading order and update HTML references when moving files. Refresh existing asset version query strings when changing cached resources.

## Feature Documentation & Keyboard Shortcuts

Whenever adding a feature, update the relevant How to instructions and keymaps in `public/interface-resources/how-to.js` as part of the same change. Keep both the sampler and synth guides accurate for their respective features.

Always consider QWERTY, AZERTY, and QWERTZ layouts when adding or changing keyboard shortcuts. For shortcuts based on physical positions, use `KeyboardEvent.code` and show layout-aware labels where supported, with sensible fallbacks. Document whether shortcuts follow physical positions or typed characters, and verify their behavior across layouts. Preserve normal typing and keyboard access to controls.

## Testing Guidelines

Tests use Node's built-in test runner and the same shared modules used by the browser. Name tests `tests/*.test.cjs`. Add meaningful regressions for logic changes; no coverage threshold is configured. Follow `tests/MANUAL.md` for browser interactions, IndexedDB, focus, layout, and audio output. Verify affected behavior in both pages, desktop and narrow mobile layouts. Check browser console errors, touch controls, keyboard shortcuts, and focus behavior. For audio changes, test playback continuity, effect bypass, and synth WAV output; confirm iPhone behavior on a real device when possible. For persistence changes, export/import a session, reload it, and check older-session defaults. Preserve all banks, patterns, and hidden steps.

## Commit & Pull Request Guidelines

History uses scoped Conventional Commit messages, such as `feat(looper): Add pattern to the transport label` and `feat(help): Add how-to guides`. Follow that format with a concise description. Pull requests should explain the user-visible change, relevant validation, and any limitations. Link related issues when available; include desktop/mobile screenshots for layout changes.

## Data & Compatibility

Sounds and sessions stay in the user's browser. Preserve original pad audio, validate archives before replacing data, and retain import confirmation. New persisted settings need export/import support and backward-compatible defaults.
