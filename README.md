# Looper

A small browser sampler inspired by the hands-on SP-404 workflow.

Run `python3 -m http.server 8080 --bind 0.0.0.0` in this directory and open http://localhost:8080.

- Click the pencil beside the session name to unlock it for editing. Click the checkmark or press Enter to save locally and lock it again; Escape cancels and locks it.
- Banks A–H each hold 16 sounds (128 total). Bank buttons change the visible pads and the targets of your pad shortcuts. Patterns play and export sounds from all eight banks together; the sequencer labels every loaded pad by bank.
- Import audio by dropping files onto the bank or a specific pad.
- Use Edit beside Sample bank to clear a pad or swap two pads (including empty pads). To swap across banks, select the first pad, switch banks, then select the second. Swaps move each sound and its steps across all eight patterns; clearing removes the sound and its steps everywhere. Undo restores the last bank edit. Pad playback shortcuts and imports are disabled while editing; Done returns to normal use.
- Click a pad to audition and select it; double-click to replace it.
- Trim with waveform handles or precise start/end values; adjust level or reverse.
- Select PATTERN A–H to create eight independent sequences using the same eight sample banks. B–H start empty. Clear and WAV export apply to the selected pattern. During playback, selecting a pattern queues it for the next bar; the current pattern finishes and existing sample tails ring out. The queued button is outlined and marked NEXT. A later selection replaces the queue; clicking the current pattern cancels it before the next bar is scheduled. While stopped, pattern selection is immediate.
- Click steps to build a pattern. Space starts/pauses; the number-row positions 1–8 trigger pads 01–08 of the selected bank, and the eight letter-key positions Q–I trigger pads 09–16 (QWERTYUI on US layouts, QWERTZUI on German layouts). Pad badges show local key labels when the browser provides the keyboard layout; otherwise labels update as you press keys. Shortcuts are ignored while typing in fields or holding Ctrl, Alt, or Command.
- Pattern shortcuts use the eight home-row key positions A/S/D/F/G/H/J/K for patterns A–H. These positions have the same letters on US and German keyboards; button badges adapt to other layouts. They select immediately while stopped and queue the next bar during playback, just like clicking a pattern.
- Adjust tempo, swing, and metronome. M mutes a track.
- Export WAV renders one bar plus the sample decay tail.
- Open Synthesizer to create sounds with sine, triangle, saw, or square waves, noise, detune, pitch drop, an ADSR envelope, and a low-pass filter.
- Play the synth keyboard with your mouse or A/W/S/E/D/F/T/G/Y/H/U/J/K. Set the note length, then save a WAV or send the sound to the next empty pad in the selected sampler bank (or another bank if it is full). Release tails are included.
- My sounds (beside Start with) stores the complete synth settings, pitch, and note length whenever you save a WAV or send a sound to the sampler. Select a saved sound to edit it again; changed versions are kept separately. The library stays in this browser across reloads. Sounds created before this feature have no stored synth settings and cannot be restored as editable patches.
- Five synth presets provide starting points for keys, bass, plucks, kicks, and hats.

Audio processing stays in the browser. The demo kit is synthesized locally. The sampler saves a local session when you open the Sound Lab, so moving between pages preserves all eight banks, all eight patterns, and the selected pattern. Other edits remain in memory until you switch pages. Audio format support depends on the browser; WAV and MP3 are recommended.
