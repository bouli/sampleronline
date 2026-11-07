# Browser regression checklist

Run `make run`, then open both pages in a desktop browser and a phone browser.
These checks cover browser APIs and interaction that the Node suite does not emulate.

- Load audio by picker and drag/drop. Preview a pad, trim, reverse, and replace its sound. Check each clear-pad choice and Undo.
- Add hits across banks/patterns, including long loops. Copy/swap patterns with Confirm and Cancel. Shorten and expand meter/length; hidden hits return.
- Play a loop and select another pattern. The change starts at a complete loop boundary and existing sample tails ring out. Check BPM, swing, and metronome.
- Try pad and pattern shortcuts on QWERTY, AZERTY, and QWERTZ. Confirm physical positions and labels; typing fields must not trigger notes. After dragging a slider, shortcuts work immediately. Tab/arrow slider editing remains usable.
- In the synth, change Start with/My sounds, then play notes with the keyboard. Preview, Save WAV, and Send to sampler include filtering and the full reverb tail. Recall a saved patch after reload.
- Export a session with stereo samples, non-default effects, hidden hits, and saved synth patches. Cancel import without losing current work, then confirm import and reload. Try a malformed ZIP.
- At 320 px and wider, check transport rows, readable BPM, compact icons, and sticky playback controls. Open How to from the version badge with click/Enter; close with Escape. Help must not trigger background shortcuts.
- On a real iPhone, tap Play and pads; check audible output, device volume, interruption recovery, and Silent Mode behavior. Node tests cannot establish audio-device compatibility.
- Confirm no console errors or missing scripts/styles. Serve only `public/`: `/AGENTS.md`, `/Makefile`, `/tests/`, and the root `/README.md` should not be published.
