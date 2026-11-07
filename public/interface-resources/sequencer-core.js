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
  const synthRenderDuration = s => s.hold + s.release + ((s['reverb-mix'] || 0) > 0 ? (s['reverb-decay'] ?? synthDefaults['reverb-decay']) : 0);
  return { sampleEnvelope, applySampleEnvelope, padKeyCodes, patternKeyCodes, synthDefaults, validMeter, stepsPerBar, stepCount, createPatterns, clonePattern, replacePattern, swapPatterns, clearPad, stepDuration, synthRenderDuration };
});
