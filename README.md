# Looper

A small browser sampler inspired by the hands-on SP-404 workflow.

Run `python3 -m http.server 8080 --bind 0.0.0.0` in this directory and open http://localhost:8080.

- Import audio by dropping files onto the bank or a specific pad.
- Click a pad to audition and select it; double-click to replace it.
- Trim with waveform handles or precise start/end values; adjust level or reverse.
- Click steps to build a pattern. Space starts/pauses; keys 1–8 trigger pads.
- Adjust tempo, swing, and metronome. M mutes a track.
- Export WAV renders one bar plus the sample decay tail.
- Open Synthesizer to create sounds with sine, triangle, saw, or square waves, noise, detune, pitch drop, an ADSR envelope, and a low-pass filter.
- Play the synth keyboard with your mouse or A/W/S/E/D/F/T/G/Y/H/U/J/K. Set the note length, then save a WAV or send the sound to the next empty sampler pad. Release tails are included.
- Five synth presets provide starting points for keys, bass, plucks, kicks, and hats.

Audio processing stays in the browser. The demo kit is synthesized locally. The sampler saves a local session when you open the Sound Lab, so moving between pages preserves your bank and sequence. Other edits remain in memory until you switch pages. Audio format support depends on the browser; WAV and MP3 are recommended.
