// Generated impulse and shared audio routing for synth and sampler reverb.
window.looperReverb = (() => {
  let cachedImpulse;
  function impulse(ac, decay, channels = 1) {
    if (cachedImpulse?.decay === decay && cachedImpulse.sampleRate === ac.sampleRate && cachedImpulse.channels === channels) return cachedImpulse.buffer;
    const buffer = ac.createBuffer(channels, Math.ceil(ac.sampleRate * decay), ac.sampleRate);
    for (let channel = 0; channel < channels; channel++) {
      const data = buffer.getChannelData(channel);
      let seed = 1207 + channel * 911, damped = 0;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        damped = .55 * damped + .45 * (seed / 2147483648);
        const t = i / ac.sampleRate;
        const fadeIn = Math.min(1, t / .002), fadeOut = Math.min(1, (data.length - 1 - i) / (ac.sampleRate * .02));
        data[i] = damped * Math.exp(-6.9 * t / decay) * fadeIn * fadeOut;
      }
    }
    cachedImpulse = { decay, channels, sampleRate: ac.sampleRate, buffer };
    return buffer;
  }
  function valid(settings) {
    return settings && Number.isFinite(settings.amount) && settings.amount >= 0 && settings.amount <= 100 && Number.isFinite(settings.decay) && settings.decay >= .1 && settings.decay <= 5;
  }
  function createBus(ac, destination, initial) {
    const input = ac.createGain(), dry = ac.createGain(), output = ac.createGain();
    input.connect(dry).connect(output); output.connect(destination);
    let branch = null, settings = { amount: 0, decay: 1.5 };
    const retired = new Map();
    function gainTo(param, value, immediate) {
      param.cancelScheduledValues(ac.currentTime);
      param.setValueAtTime(immediate ? value : param.value, ac.currentTime);
      if (!immediate) param.linearRampToValueAtTime(value, ac.currentTime + .03);
    }
    function retire(old) {
      input.disconnect(old.node);
      gainTo(old.gain.gain, 0, false);
      retired.set(old, setTimeout(() => {
        old.node.disconnect(); old.gain.disconnect(); retired.delete(old);
      }, 100));
    }
    function set(next, immediate = false) {
      if (!valid(next)) throw new Error('Invalid reverb settings');
      const mix = next.amount / 100;
      gainTo(dry.gain, Math.cos(mix * Math.PI / 2), immediate);
      if (!mix) {
        if (branch) { retire(branch); branch = null; }
      } else {
        if (!branch || next.decay !== settings.decay) {
          if (branch) retire(branch);
          const node = ac.createConvolver(), gain = ac.createGain();
          node.buffer = impulse(ac, next.decay, 2);
          gain.gain.value = 0;
          input.connect(node).connect(gain).connect(output);
          branch = { node, gain };
        }
        gainTo(branch.gain.gain, Math.sin(mix * Math.PI / 2), immediate);
      }
      settings = { ...next };
    }
    function destroy() {
      input.disconnect(); dry.disconnect(); output.disconnect();
      if (branch) { branch.node.disconnect(); branch.gain.disconnect(); branch = null; }
      retired.forEach((timer, old) => { clearTimeout(timer); old.node.disconnect(); old.gain.disconnect(); });
      retired.clear();
    }
    set(initial || settings, true);
    return { input, set, destroy };
  }
  return { impulse, valid, createBus };
})();
