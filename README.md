# Looper

A small browser sampler inspired by the hands-on SP-404 workflow.

Run `python3 -m http.server 8080 --bind 0.0.0.0` in this directory and open http://localhost:8080.

- Import audio by dropping files onto the bank or a specific pad.
- Click a pad to audition and select it; double-click to replace it.
- Trim with waveform handles or precise start/end values; adjust level or reverse.
- Select PATTERN A–H to create eight independent sequences using the same sample bank. B–H start empty. Clear and WAV export apply to the selected pattern. During playback, selecting a pattern queues it for the next bar; the current pattern finishes and existing sample tails ring out. The queued button is outlined and marked NEXT. A later selection replaces the queue; clicking the current pattern cancels it before the next bar is scheduled. While stopped, pattern selection is immediate.
- Click steps to build a pattern. Space starts/pauses; the number-row positions 1–8 trigger A01–A08, and the eight letter-key positions Q–I trigger A09–A16 (QWERTYUI on US layouts, QWERTZUI on German layouts). Pad badges show local key labels when the browser provides the keyboard layout; otherwise labels update as you press keys. Shortcuts are ignored while typing in fields or holding Ctrl, Alt, or Command.
- Pattern shortcuts use the eight home-row key positions A/S/D/F/G/H/J/K for patterns A–H. These positions have the same letters on US and German keyboards; button badges adapt to other layouts. They select immediately while stopped and queue the next bar during playback, just like clicking a pattern.
- Adjust tempo, swing, and metronome. M mutes a track.
- Export WAV renders one bar plus the sample decay tail.
- Open Synthesizer to create sounds with sine, triangle, saw, or square waves, noise, detune, pitch drop, an ADSR envelope, and a low-pass filter.
- Play the synth keyboard with your mouse or A/W/S/E/D/F/T/G/Y/H/U/J/K. Set the note length, then save a WAV or send the sound to the next empty sampler pad. Release tails are included.
- Five synth presets provide starting points for keys, bass, plucks, kicks, and hats.

Audio processing stays in the browser. The demo kit is synthesized locally. The sampler saves a local session when you open the Sound Lab, so moving between pages preserves your bank, all eight patterns, and the selected pattern. Other edits remain in memory until you switch pages. Audio format support depends on the browser; WAV and MP3 are recommended.
