// Export planning and PCM encoding are shared with the dependency-free test suite.
((root, factory) => {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./sequencer-core.js'));
  else root.patternWav = factory(root.looperCore);
})(globalThis, core => {
  function plan({ rows, samples, meter, bars, bpm, swing, keepTail = false, reverb, lofi }) {
    const events = [], count = core.stepCount(meter, bars), barSteps = core.stepsPerBar(meter);
    let time = 0, lastEnd = 0;
    for (let step = 0; step < count; step++) {
      samples.forEach((sample, pad) => {
        if (!sample || sample.muted || !rows[pad][step]) return;
        events.push({ pad, time });
        lastEnd = Math.max(lastEnd, time + Math.max(.001, sample.end - sample.start));
      });
      time += core.stepDuration(step, bpm, swing / 100, barSteps);
    }
    // Swing redistributes paired steps without changing the musical loop length.
    const loopDuration = count * 60 / bpm / 4;
    const tail = events.length ? (reverb?.amount > 0 ? reverb.decay : 0) + (lofi?.amount > 0 ? .05 : 0) : 0;
    const duration = keepTail ? Math.max(loopDuration, lastEnd + tail) : loopDuration;
    return { events, loopDuration, duration };
  }
  function planPerformance({ performance, patternBanks, samples, keepTail = false, reverb, lofi }) {
    if (!performance?.length || !core.validPerformance(performance)) throw new Error('No valid performance to export.');
    const events = [];
    let time = 0, lastEnd = 0;
    for (const entry of performance) {
      const rows = patternBanks[entry.pattern];
      samples.forEach((sample, pad) => {
        if (!sample || sample.muted || !rows[pad][entry.step]) return;
        events.push({ pad, time });
        lastEnd = Math.max(lastEnd, time + Math.max(.001, sample.end - sample.start));
      });
      time += entry.duration;
    }
    const tail = events.length ? (reverb?.amount > 0 ? reverb.decay : 0) + (lofi?.amount > 0 ? .05 : 0) : 0;
    return { events, loopDuration: time, duration: keepTail ? Math.max(time, lastEnd + tail) : time };
  }
  function encode(buffer) {
    const channels = buffer.numberOfChannels, frames = buffer.length;
    const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
    const bytes = new ArrayBuffer(44 + frames * channels * 2), view = new DataView(bytes);
    const text = (offset, value) => [...value].forEach((letter, i) => view.setUint8(offset + i, letter.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
    view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, bytes.byteLength - 44, true);
    let peak = 0;
    for (const channel of data) for (const value of channel) peak = Math.max(peak, Math.abs(value));
    // Reduce only overloaded mixes, preserving stereo balance and quieter mixes.
    const scale = peak > 1 ? .98 / peak : 1;
    for (let frame = 0; frame < frames; frame++) for (let c = 0; c < channels; c++) {
      const value = Math.max(-1, Math.min(1, data[c][frame] * scale));
      view.setInt16(44 + (frame * channels + c) * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
    }
    return new Blob([bytes], { type: 'audio/wav' });
  }
  return { plan, planPerformance, encode };
});
