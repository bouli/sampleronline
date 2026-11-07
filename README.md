# Looper

A small browser sampler inspired by the hands-on SP-404 workflow.

The browser application lives in `public/`. Serve and deploy that directory only; `Makefile`, `README.md`, and `AGENTS.md` stay at the repository root.

Install Node.js 20 or newer, then run `make run` in this directory and open http://localhost:8000. For port 8080, use `make run PORT=8080` or `PORT=8080 node scripts/serve.cjs`. The dependency-free development server serves only `public/` and disables caching so edits appear on reload.

- Click the pencil beside the session name to unlock it for editing. Click the checkmark or press Enter to save locally and lock it again; Escape cancels and locks it.
- Banks A–H each hold 16 sounds (128 total). Bank buttons change the visible pads and the targets of your pad shortcuts. Patterns play sounds from all eight banks together; the sequencer labels every loaded pad by bank.
- Import audio by dropping files onto the bank or a specific pad.
- Use Edit beside Sample bank to clear a pad or swap two pads (including empty pads). To swap across banks, select the first pad, switch banks, then select the second. Swaps move each sound and its steps across all eight patterns; clearing removes the sound and its steps everywhere. Undo restores the last bank edit. Pad playback shortcuts and imports are disabled while editing; Done returns to normal use.
- Click a pad to audition and select it; double-click to replace it.
- Trim with waveform handles or precise start/end values; adjust level or reverse.
- Select PATTERN A–H to create eight independent sequences using the same eight sample banks. B–H start empty. Clear applies to the selected pattern. During playback, selecting a pattern queues it for the next loop; the current pattern finishes its loop and existing sample tails ring out. The queued button is outlined and marked NEXT. A later selection replaces the queue; clicking the current pattern cancels it before the next loop is scheduled. While stopped, pattern selection is immediate.
- Click steps to build a pattern. Space starts/pauses; the number-row positions 1–8 trigger pads 01–08 of the selected bank, and the eight letter-key positions Q–I trigger pads 09–16 (QWERTYUI on US layouts, QWERTZUI on German layouts). Pad badges show local key labels when the browser provides the keyboard layout; otherwise labels update as you press keys. Shortcuts are ignored while typing in fields or holding Ctrl, Alt, or Command.
- Pattern shortcuts use the eight home-row key positions A/S/D/F/G/H/J/K for patterns A–H. These positions have the same letters on US and German keyboards; button badges adapt to other layouts. They select immediately while stopped and queue the next loop during playback, just like clicking a pattern.
- Click the pencil beside the sequencer step count to choose 1–8 bars. The step count follows the time signature (two bars of 4/4 = 32 steps). The checkmark or Enter saves and locks it; Escape cancels. Shortening hides and skips later steps, preserving them for when you expand again. During playback, length, time-signature, and pattern changes wait for the current loop to finish. The transport counts bars, the metronome accents each bar, and session exports preserve the entire loop.
- Click the pencil beside the time signature to unlock its beat-count (1–12) and beat-value (2, 4, 8, 16) selectors. Click the checkmark or Enter to apply and lock; Escape cancels. Each bar uses sixteenth-note steps (3/4 = 12 steps, 6/8 = 12, 5/4 = 20). BPM always counts quarter notes. Changes during playback apply at the next loop; sample tails ring out. Shorter bars hide and skip extra steps without deleting them, across every pattern and bank. Increasing the bar restores them. The metronome uses the active signature; it is saved with the session.
- Adjust tempo, swing, and metronome. M mutes a track.
- Export Session downloads a ZIP containing session.yaml, original untrimmed 32-bit float WAV files for every loaded pad, all eight patterns (including hidden steps), all settings, and the My sounds synth library. Drop a session ZIP onto Import Session, or click it to choose a file. The Import Session picker shows all files to avoid operating-system ZIP filter issues; choose the exported .zip archive. ZIPs may contain the session files at the root or inside an enclosing folder (including archives compressed with macOS Finder). Import Session validates the ZIP contents, then asks for confirmation before replacing the session and synth library. Import restores the session stopped, with editing controls locked. Archives up to 512 MB uncompressed are supported.
- Session ZIP/YAML support uses locally bundled fflate 0.8.2 and js-yaml 4.1.1 (MIT; licenses in public/vendor/). No CDN connection is needed.
- Open Synthesizer to create sounds with sine, triangle, saw, or square waves, noise, detune, pitch drop, an ADSR envelope, and a low-pass filter.
- Play the synth keyboard with your mouse or A/W/S/E/D/F/T/G/Y/H/U/J/K. Set the note length, then save a WAV or send the sound to the next empty pad in the selected sampler bank (or another bank if it is full). Release tails are included.
- My sounds (beside Start with) stores the complete synth settings, pitch, and note length whenever you save a WAV or send a sound to the sampler. Select a saved sound to edit it again; changed versions are kept separately. The library stays in this browser across reloads. Sounds created before this feature have no stored synth settings and cannot be restored as editable patches.
- Session reverb below the step sequencer provides amount (0–100%, Off at zero) and decay (0.1–5 seconds). One shared reverb processes pad previews and all banks/patterns during playback, while the metronome stays dry. Original pad audio is preserved. Settings are saved locally and in session ZIP/YAML export/import; older sessions load with reverb off.
- Synth reverb offers amount (0–100%, Off at zero) and decay (0.1–5 seconds). Preview, Save WAV, and Send to sampler render the same sound with its full reverb tail baked in. Reverb settings are included in My sounds and session ZIPs; older saved sounds load with reverb off.
- Five synth presets provide starting points for keys, bass, plucks, kicks, and hats.

Audio processing stays in the browser. The demo kit is synthesized locally. The sampler saves a local session when you open the Sound Lab, so moving between pages preserves all eight banks, all eight patterns, and the selected pattern. Other edits remain in memory until you switch pages. Audio format support depends on the browser; WAV and MP3 are recommended.

The synth Lo-fi tone panel blends a lightweight high-pass/low-pass filter before reverb. Low cut (20–2,000 Hz), high cut (2,500–18,000 Hz), and amount are saved with My sounds and session archives. It starts off; filtering is baked into previews, WAVs, and samples sent to the sampler.

Session lo-fi tone applies to all banks and patterns before session reverb, with smooth control changes and an Off default. Filter settings persist locally and in session ZIPs; older sessions load with the filter off. Original pad audio and the metronome remain unchanged.

## Automated tests

Install Node.js 20 or newer, then run:

```sh
make test
# Equivalent:
node --test tests/*.test.cjs
```

The suite uses Node's built-in test runner and the application's bundled ZIP/YAML libraries. No npm install, Python test dependencies, browser download, or running server is needed. The development server also uses Node via `make run`; Python and uv are not required.

Tests exercise the same shared core used by the browser: pattern copy/swap, pad clearing, hidden-step preservation, meter/swing timing, physical keymaps, synth defaults/durations, and session ZIP validation/roundtrips with exact stereo audio. They also verify the browser-global module entry points and script references.

Run one group or filter by test name:

```sh
node --test tests/archive.test.cjs
node --test --test-name-pattern="swap" tests/sequencer.test.cjs
```

Tests live outside `public/` and do not access saved browser sessions. Actual clicks, focus, downloads, IndexedDB, mobile layout, and audible playback require browser checks; follow [the manual checklist](tests/MANUAL.md), including a real iPhone audio check. No coverage threshold is configured.
