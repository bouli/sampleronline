// Lightweight session tone shaping, before the shared reverb bus.
window.looperLofi = (() => {
  function valid(s) {
    return s && Number.isFinite(s.amount) && s.amount >= 0 && s.amount <= 100 && Number.isFinite(s.low) && s.low >= 20 && s.low <= 2000 && Number.isFinite(s.high) && s.high >= 2500 && s.high <= 18000;
  }
  function createBus(ac, destination, initial) {
    const input = ac.createGain(), dry = ac.createGain(), wet = ac.createGain();
    const highpass = ac.createBiquadFilter(), lowpass = ac.createBiquadFilter();
    highpass.type = 'highpass'; lowpass.type = 'lowpass';
    highpass.Q.value = lowpass.Q.value = Math.SQRT1_2;
    input.connect(dry).connect(destination);
    input.connect(highpass).connect(lowpass).connect(wet).connect(destination);
    function set(s, immediate = false) {
      if (!valid(s)) throw new Error('Invalid lo-fi settings');
      for (const [param, value] of [[dry.gain, 1 - s.amount / 100], [wet.gain, s.amount / 100], [highpass.frequency, s.low], [lowpass.frequency, s.high]]) {
        param.cancelScheduledValues(ac.currentTime);
        param.setValueAtTime(immediate ? value : param.value, ac.currentTime);
        if (!immediate) param.linearRampToValueAtTime(value, ac.currentTime + .03);
      }
    }
    function destroy() { for (const node of [input, dry, wet, highpass, lowpass]) node.disconnect(); }
    set(initial, true);
    return { input, set, destroy };
  }
  return { valid, createBus };
})();
