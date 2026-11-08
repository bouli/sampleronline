// Pure session operations shared by the browser and dependency-free Node tests.
((root, factory) => {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.looperCore = factory();
})(globalThis, () => {
  const padKeyCodes = Object.freeze(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI']);
  const patternKeyCodes = Object.freeze(['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK']);
  const synthDefaults = Object.freeze({ 'lofi-mix': 0, 'lofi-low': 200, 'lofi-high': 5000, 'reverb-mix': 0, 'reverb-decay': 1.5 });
  const validMeter = value => !!value && Number.isInteger(value.beats) && value.beats >= 1 && value.beats <= 12 && [2, 4, 8, 16].includes(value.unit);
  const stepsPerBar = meter => meter.beats * 16 / meter.unit;
  const stepCount = (meter, bars) => stepsPerBar(meter) * bars;
  const createPatterns = () => Array.from({ length: 8 }, () => Array.from({ length: 128 }, () => Array(768).fill(false)));
  const clonePattern = rows => rows.map(row => row.slice());
  function replacePattern(target, rows) {
    // Preserve references held by playback and the editor.
    rows.forEach((row, index) => target[index].splice(0, row.length, ...row));
  }
  function swapPatterns(banks, source, target) {
    if (source === target) return;
    const rows = clonePattern(banks[source]);
    replacePattern(banks[source], banks[target]);
    replacePattern(banks[target], rows);
  }
  function clearPad(samples, banks, index, keepHits) {
    samples[index] = null;
    if (!keepHits) banks.forEach(bank => bank[index].fill(false));
  }
  function stepDuration(step, bpm, swing, barSteps) {
    const localStep = step % barSteps, base = 60 / bpm / 4;
    return base * (barSteps % 2 === 1 && localStep === barSteps - 1 ? 1 : localStep % 2 === 0 ? 1 + swing : 1 - swing);
  }
  function sampleEnvelope(duration, fadeIn = 0, fadeOut = 0) {
    // Fit overlapping fades into the trimmed sound without extending playback.
    fadeIn = Math.max(0, Math.min(fadeIn, duration));
    fadeOut = Math.max(0, Math.min(fadeOut, duration));
    const scale = Math.min(1, duration / (fadeIn + fadeOut || duration));
    return { fadeIn: fadeIn * scale, fadeOut: fadeOut * scale };
  }
  function applySampleEnvelope(param, when, duration, level, fadeIn, fadeOut) {
    const fades = sampleEnvelope(duration, fadeIn, fadeOut);
    param.setValueAtTime(fades.fadeIn > 0 ? 0 : level, when);
    if (fades.fadeIn > 0) param.linearRampToValueAtTime(level, when + fades.fadeIn);
    if (fades.fadeOut > 0) {
      const holdUntil = when + Math.max(fades.fadeIn, duration - fades.fadeOut);
      if (holdUntil > when + fades.fadeIn) param.setValueAtTime(level, holdUntil);
      param.linearRampToValueAtTime(0, when + duration);
    }
  }
  function finishPerformance(entries, endTime) {
    return entries.filter(entry => entry.time < endTime).map(({ time, ...entry }) => ({
      ...entry, meter: { ...entry.meter }, duration: Math.min(entry.duration, endTime - time)
    }));
  }
  function validPerformance(entries) {
    return Array.isArray(entries) && entries.length <= 100000 && entries.every(entry =>
      entry && Number.isInteger(entry.pattern) && entry.pattern >= 0 && entry.pattern < 8 &&
      validMeter(entry.meter) && Number.isInteger(entry.bars) && entry.bars >= 1 && entry.bars <= 8 &&
      Number.isInteger(entry.step) && entry.step >= 0 && entry.step < stepCount(entry.meter, entry.bars) &&
      Number.isFinite(entry.bpm) && entry.bpm >= 40 && entry.bpm <= 240 &&
      Number.isFinite(entry.swing) && entry.swing >= 0 && entry.swing <= 60 &&
      Number.isFinite(entry.duration) && entry.duration > 0 &&
      (entry.effects === undefined || (Array.isArray(entry.effects) && entry.effects.length <= 10000 && entry.effects.every((event, index) =>
        event && Number.isFinite(event.offset) && event.offset >= 0 && event.offset < entry.duration &&
        typeof event.lofi === 'boolean' && typeof event.reverb === 'boolean' && (!index || event.offset >= entry.effects[index - 1].offset)))) &&
      entry.duration <= stepDuration(entry.step, entry.bpm, entry.swing / 100, stepsPerBar(entry.meter)) + 1e-8);
  }
  const synthRenderDuration = s => s.hold + s.release + ((s['reverb-mix'] || 0) > 0 ? (s['reverb-decay'] ?? synthDefaults['reverb-decay']) : 0);
  return { finishPerformance, validPerformance, sampleEnvelope, applySampleEnvelope, padKeyCodes, patternKeyCodes, synthDefaults, validMeter, stepsPerBar, stepCount, createPatterns, clonePattern, replacePattern, swapPatterns, clearPad, stepDuration, synthRenderDuration };
});
