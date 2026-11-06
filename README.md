# Looper

A small browser sampler inspired by the hands-on SP-404 workflow.

Run `python3 -m http.server 8080 --bind 0.0.0.0` in this directory and open http://localhost:8080.

- Import audio by dropping files onto the bank or a specific pad.
- Click a pad to audition and select it; double-click to replace it.
- Trim with waveform handles or precise start/end values; adjust level or reverse.
- Click steps to build a pattern. Space starts/pauses; keys 1–8 trigger pads.
- Adjust tempo, swing, and metronome. M mutes a track.
- Export WAV renders one bar plus the sample decay tail.

Audio processing stays in the browser. The demo kit is synthesized locally. Sessions are held in memory and reset on reload. Audio format support depends on the browser; WAV and MP3 are recommended.
