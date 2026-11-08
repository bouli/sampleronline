window.effectBypass = (ac, destination, plugin, settings) => {
  const input = ac.createGain(), dry = ac.createGain(), wet = ac.createGain();
  input.connect(dry).connect(destination);
  const bus = plugin.createBus(ac, wet, settings);
  input.connect(bus.input); wet.connect(destination);
  function setEnabled(enabled, time = ac.currentTime, immediate = false) {
    for (const [param, value] of [[dry.gain, enabled ? 0 : 1], [wet.gain, enabled ? 1 : 0]]) {
      if (!immediate && param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(time);
      else { param.cancelScheduledValues(time); param.setValueAtTime(immediate ? value : param.value, time); }
      if (!immediate) param.linearRampToValueAtTime(value, time + .03);
    }
  }
  setEnabled(settings.enabled !== false, ac.currentTime, true);
  return { input, set: bus.set, setEnabled, destroy() { input.disconnect(); dry.disconnect(); wet.disconnect(); bus.destroy(); } };
};
