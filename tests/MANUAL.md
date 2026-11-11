# Browser regression checklist

Run `make run`, then open both pages in a desktop browser and a phone browser.
These checks cover browser APIs and interaction that the Node suite does not emulate.

- Load audio by picker and drag/drop. Preview a pad, trim, reverse, and replace its sound. Check each clear-pad choice and Undo. Set Fade In/Out on trimmed, reversed, and very short sounds; verify smooth edges in preview and sequencer playback. Export/import and reload to confirm fades persist.
- Add hits across banks/patterns, including long loops. Copy/swap patterns with Confirm and Cancel. Shorten and expand meter/length; hidden hits return.
- Play a loop and select another pattern. The change starts at a complete loop boundary and existing sample tails ring out. Check BPM, swing, and metronome.
- Try pad and pattern shortcuts on QWERTY, AZERTY, and QWERTZ. Confirm physical positions and labels; typing fields must not trigger notes. After dragging a slider, shortcuts work immediately. Tab/arrow slider editing remains usable.
- On both pages, change each dropdown using mouse/touch and keyboard; confirm focus releases and musical shortcuts work immediately. Tab back to a dropdown to change it again.
- In the synth, change Start with/My sounds, then play notes with the keyboard. Preview, Save WAV, and Send to sampler include filtering and the full reverb tail. Recall a saved patch after reload.
- Export a session with stereo samples, non-default effects, hidden hits, and saved synth patches. Cancel import without losing current work, then confirm import and reload. Try a malformed ZIP.
- At 320 px and wider, check transport rows, readable BPM, compact icons, and sticky playback controls. Open How to from the version badge with click/Enter; close with Escape. Help must not trigger background shortcuts.
- On a real iPhone, tap Play and pads; check audible output, device volume, interruption recovery, and Silent Mode behavior. Node tests cannot establish audio-device compatibility.
- Confirm no console errors or missing scripts/styles. Serve only `public/`: `/AGENTS.md`, `/Makefile`, `/tests/`, and the root `/README.md` should not be published.

- Export Pattern WAV with trims, fades, reverse, overlapping stereo samples, muted tracks, swing, and effects. Verify the WAV duration matches exactly one loop (e.g. 4 seconds), including when long samples or reverb extend past the last step; tails must be cut at the boundary by default. Enable Keep pattern tail in the popup and verify the full sample/reverb decay is included. Test Cancel and Escape, and pattern changes during the popup; the export should retain the pattern named in the popup. Verify hidden steps/metronome are excluded. Export during playback, cancel the download, and try an empty pattern. Confirm the transport stays responsive and matches the rendered audio.

- Pattern time machine: record A → B → A with repeated loops and a partial ending. Cancel/replace queued pattern choices before boundaries. Stop and replay with the clock; verify actual order, timing, tempo/swing changes, automatic end, and manual interruption. Replay must not overwrite the take. Reload and export/import the session, then replay again. Test Stop immediately after Play (before any audible step) and phone layout.

- Export Memory: record multiple patterns with repeats, tempo changes, and a partial ending. Verify the WAV matches time-machine replay, including the recorded stop length. Try Keep performance tail, Cancel/Escape, a silent performance, and later edits to patterns/samples. Export must not replace the recording. Check button availability and transport layout at phone widths.

### Sampler effect switches

- Set nonzero Lo-fi/reverb amounts; toggle each panel's On/Off button. Bypass preserves sliders and smoothly restores the effect.
- Verify physical KeyZ/KeyX on QWERTY, QWERTZ (Y/X), and AZERTY (W/X); confirm typing in controls and open dialogs does not toggle effects.
- During playback, switch effects between steps, stop mid-step, then replay the time machine. Check the original switch timing, locked switches during replay, and interruption without delayed switches.
- Export Memory with and without the tail; compare switches to replay. Export/import the session and reload to retain bypass states and recorded switches. Older archives retain their previous sound.
