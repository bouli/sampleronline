// Portable Looper archives: session.yaml plus original, untrimmed float32 WAVs.
// Kept independent of UI state so validation cannot partially replace a session.
window.sessionArchive = (() => {
  const MAX_BYTES = 512 * 1024 * 1024;
  const fail = message => { throw new Error(message); };
  const requireValue = (condition, message) => { if (!condition) fail(message); };
  const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
  const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const name = value => typeof value === 'string' && value.length > 0 && value.length <= 60;
  const padId = index => String.fromCharCode(65 + Math.floor(index / 16)) + String(index % 16 + 1).padStart(2, '0');
  function padIndex(id) {
    requireValue(typeof id === 'string' && /^[A-H](0[1-9]|1[0-6])$/.test(id), 'Invalid pad identifier.');
    return (id.charCodeAt(0) - 65) * 16 + +id.slice(1) - 1;
  }
  function encodeWav(audio) {
    const channels = audio.channels.length, frames = audio.channels[0].length, bytes = new Uint8Array(44 + frames * channels * 4), view = new DataView(bytes.buffer);
    const text = (offset, string) => [...string].forEach((letter, i) => view.setUint8(offset + i, letter.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 3, true); view.setUint16(22, channels, true);
    view.setUint32(24, audio.sampleRate, true); view.setUint32(28, audio.sampleRate * channels * 4, true);
    view.setUint16(32, channels * 4, true); view.setUint16(34, 32, true); text(36, 'data'); view.setUint32(40, bytes.length - 44, true);
    for (let frame = 0; frame < frames; frame++) for (let channel = 0; channel < channels; channel++) view.setFloat32(44 + (frame * channels + channel) * 4, audio.channels[channel][frame], true);
    return bytes;
  }
  function decodeWav(bytes) {
    requireValue(bytes && bytes.byteLength >= 44, 'A sample audio file is missing or incomplete.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const text = (offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));
    requireValue(text(0, 4) === 'RIFF' && text(8, 4) === 'WAVE', 'A sample is not a WAV file.');
    let format, data;
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const length = view.getUint32(offset + 4, true), start = offset + 8;
      requireValue(start + length <= bytes.length, 'A WAV file is truncated.');
      if (text(offset, 4) === 'fmt ') {
        requireValue(length >= 16, 'Invalid WAV format.');
        format = { type: view.getUint16(start, true), channels: view.getUint16(start + 2, true), rate: view.getUint32(start + 4, true), align: view.getUint16(start + 12, true), bits: view.getUint16(start + 14, true) };
      }
      if (text(offset, 4) === 'data') data = { start, length };
      offset = start + length + length % 2;
    }
    requireValue(format && data, 'A WAV file has no audio data.');
    requireValue(format.type === 3 && format.bits === 32 && integer(format.channels, 1, 32) && integer(format.rate, 8000, 96000) && format.align === format.channels * 4 && data.length > 0 && data.length % format.align === 0, 'Unsupported WAV format. Import the original Looper session ZIP.');
    const frames = data.length / format.align, channels = Array.from({ length: format.channels }, () => new Float32Array(frames));
    for (let frame = 0; frame < frames; frame++) for (let channel = 0; channel < format.channels; channel++) {
      const sample = view.getFloat32(data.start + (frame * format.channels + channel) * 4, true);
      requireValue(Number.isFinite(sample), 'A WAV contains invalid audio values.');
      channels[channel][frame] = sample;
    }
    return { sampleRate: format.rate, channels };
  }
  function validateLibrary(library) {
    requireValue(Array.isArray(library) && library.length <= 10000, 'Invalid saved synth sounds.');
    const ids = new Set(), ranges = { detune: [0, 40], noise: [0, 100], 'pitch-drop': [0, 36], attack: [.002, 1], decay: [.01, 2], sustain: [0, 100], release: [.01, 3], cutoff: [80, 18000], resonance: [.1, 12] };
    return library.map(sound => {
      requireValue(sound && typeof sound.id === 'string' && sound.id.length <= 100 && !ids.has(sound.id) && name(sound.name) && number(sound.createdAt, 0, Number.MAX_SAFE_INTEGER), 'Invalid saved synth sound.');
      ids.add(sound.id);
      const patch = sound.patch;
      requireValue(patch && ['sine', 'triangle', 'sawtooth', 'square'].includes(patch.wave) && [.125, .25, .5, 1, 2, 4].includes(patch.hold) && integer(patch.octave, 1, 6) && integer(patch.note, 0, 12) && ['warm', 'sub', 'pluck', 'kick', 'hat'].includes(patch.preset), 'Invalid synth settings.');
      const cleaned = { wave: patch.wave, hold: patch.hold, octave: patch.octave, note: patch.note, preset: patch.preset, frequency: 440 * 2 ** (((patch.octave + 1) * 12 + patch.note - 69) / 12) };
      for (const [key, [min, max]] of Object.entries(ranges)) {
        requireValue(number(patch[key], min, max), 'Invalid synth setting: ' + key);
        cleaned[key] = patch[key];
      }
      // Archives created before synth reverb load with the effect off.
      for (const [key, fallback, min, max] of [['reverb-mix', 0, 0, 100], ['reverb-decay', 1.5, .1, 5]]) {
        const value = patch[key] === undefined ? fallback : patch[key];
        requireValue(number(value, min, max), 'Invalid synth setting: ' + key);
        cleaned[key] = value;
      }
      return { id: sound.id, name: sound.name, createdAt: sound.createdAt, patch: cleaned };
    });
  }
  function create(snapshot, library) {
    let totalBytes = 0;
    const files = {}, pads = snapshot.samples.map((sample, i) => {
      if (!sample) return null;
      totalBytes += 44 + sample.audio.channels.length * sample.audio.channels[0].length * 4;
      requireValue(totalBytes <= MAX_BYTES, 'Session audio is larger than 512 MB.');
      const file = 'samples/' + padId(i) + '.wav';
      files[file] = encodeWav(sample.audio);
      return { pad: padId(i), name: sample.name, file, start: sample.start, end: sample.end, level: sample.level, reverse: sample.reverse, muted: sample.muted };
    });
    const manifest = {
      format: 'looper-session', version: 1,
      session: { name: snapshot.name, bpm: +snapshot.bpm, swing: +snapshot.swing, timeSignature: snapshot.timeSignature, sequenceBars: snapshot.sequenceBars, activeBank: snapshot.activeBank, activePattern: snapshot.activePattern, selectedPad: padId(snapshot.selected), metronome: !!snapshot.metronome, reverb: snapshot.reverb || { amount: 0, decay: 1.5 } },
      pads,
      patterns: snapshot.patternBanks.map((tracks, index) => ({ name: String.fromCharCode(65 + index), tracks: tracks.flatMap((row, pad) => {
        const steps = row.flatMap((on, step) => on ? [step] : []);
        return steps.length ? [{ pad: padId(pad), steps }] : [];
      }) })),
      synthLibrary: validateLibrary(library)
    };
    files['session.yaml'] = fflate.strToU8(jsyaml.dump(manifest, { noRefs: true, lineWidth: 100, sortKeys: false }));
    requireValue(totalBytes + files['session.yaml'].length <= MAX_BYTES, 'Session archive exceeds 512 MB.');
    return new Blob([fflate.zipSync(files, { level: 1 })], { type: 'application/zip' });
  }
  async function read(file) {
    requireValue(file.size <= MAX_BYTES, 'Session archive is larger than 512 MB.');
    let total = 0, entries = 0, files;
    try {
      files = fflate.unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: entry => {
        entries++; total += entry.originalSize;
        requireValue(entries <= 300 && total <= MAX_BYTES, 'Session archive expands beyond the supported size.');
        requireValue(!entry.name.includes('..') && !entry.name.startsWith('/'), 'Invalid archive path.');
        return true;
      } });
    } catch (error) { fail('Cannot read session ZIP: ' + error.message); }
    // Finder's Compress command wraps an exported folder and adds __MACOSX metadata.
    // Resolve sample paths relative to the one real manifest, never to metadata copies.
    const manifests = Object.keys(files).filter(path => !path.split('/').some(part => part === '__MACOSX' || part.startsWith('.')) && (path === 'session.yaml' || path.endsWith('/session.yaml')));
    requireValue(manifests.length === 1, manifests.length > 1 ? 'The ZIP contains multiple sessions. Choose an archive with one session.' : 'The ZIP must contain a session.yaml manifest.');
    const manifestPath = manifests[0], prefix = manifestPath.slice(0, -'session.yaml'.length);
    if (prefix) {
      files = Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith(prefix)).map(([path, data]) => [path.slice(prefix.length), data]));
    }
    requireValue(files['session.yaml'] && files['session.yaml'].length <= 32 * 1024 * 1024, 'The ZIP must contain a session.yaml manifest.');
    let manifest;
    try { manifest = jsyaml.load(fflate.strFromU8(files['session.yaml']), { schema: jsyaml.JSON_SCHEMA }); }
    catch { fail('session.yaml is not valid YAML.'); }
    requireValue(manifest && manifest.format === 'looper-session' && manifest.version === 1, 'This is not a supported Looper session.');
    const s = manifest.session;
    requireValue(s && name(s.name) && number(s.bpm, 40, 240) && number(s.swing, 0, 60) && integer(s.sequenceBars, 1, 8) && integer(s.activeBank, 0, 7) && integer(s.activePattern, 0, 7) && typeof s.metronome === 'boolean', 'Invalid session settings.');
    requireValue(s.timeSignature && integer(s.timeSignature.beats, 1, 12) && [2, 4, 8, 16].includes(s.timeSignature.unit), 'Invalid time signature.');
    const reverb = s.reverb === undefined ? { amount: 0, decay: 1.5 } : s.reverb;
    requireValue(reverb && number(reverb.amount, 0, 100) && number(reverb.decay, .1, 5), 'Invalid session reverb settings.');
    const selected = padIndex(s.selectedPad);
    requireValue(Math.floor(selected / 16) === s.activeBank, 'Selected pad does not belong to the selected bank.');
    requireValue(Array.isArray(manifest.pads) && manifest.pads.length === 128, 'The session must describe all 128 pads.');
    const samples = manifest.pads.map((pad, index) => {
      if (pad === null) return null;
      requireValue(pad && pad.pad === padId(index) && typeof pad.name === 'string' && pad.name.length <= 1024 && pad.file === 'samples/' + pad.pad + '.wav' && typeof pad.reverse === 'boolean' && typeof pad.muted === 'boolean' && number(pad.level, 0, 1.5), 'Invalid pad settings.');
      const audio = decodeWav(files[pad.file]), duration = audio.channels[0].length / audio.sampleRate;
      requireValue(number(pad.start, 0, duration) && number(pad.end, 0, duration + .000001) && pad.end > pad.start, 'Invalid trim points on ' + pad.pad + '.');
      return { name: pad.name, start: pad.start, end: Math.min(pad.end, duration), level: pad.level, reverse: pad.reverse, muted: pad.muted, audio };
    });
    requireValue(Array.isArray(manifest.patterns) && manifest.patterns.length === 8, 'The session must contain eight patterns.');
    const patternBanks = manifest.patterns.map((pattern, index) => {
      requireValue(pattern && pattern.name === String.fromCharCode(65 + index) && Array.isArray(pattern.tracks) && pattern.tracks.length <= 128, 'Invalid pattern.');
      const rows = Array.from({ length: 128 }, () => Array(768).fill(false)), used = new Set();
      for (const track of pattern.tracks) {
        requireValue(track && Array.isArray(track.steps) && track.steps.length <= 768, 'Invalid pattern steps.');
        const pad = padIndex(track.pad);
        requireValue(!used.has(pad), 'Duplicate track in a pattern.'); used.add(pad);
        const steps = new Set();
        for (const step of track.steps) {
          requireValue(integer(step, 0, 767) && !steps.has(step), 'Invalid or duplicate sequencer step.');
          steps.add(step); rows[pad][step] = true;
        }
      }
      return rows;
    });
    return {
      session: { name: s.name, bpm: s.bpm, swing: s.swing, timeSignature: { beats: s.timeSignature.beats, unit: s.timeSignature.unit }, sequenceBars: s.sequenceBars, activeBank: s.activeBank, activePattern: s.activePattern, selected, metronome: s.metronome, reverb: { amount: reverb.amount, decay: reverb.decay }, samples, patternBanks },
      library: validateLibrary(manifest.synthLibrary || [])
    };
  }
  return { create, read };
})();
