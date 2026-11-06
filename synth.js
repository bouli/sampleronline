const $ = selector => document.querySelector(selector);
const controls = ['detune', 'noise', 'pitch-drop', 'attack', 'decay', 'sustain', 'release', 'cutoff', 'resonance', 'lofi-mix', 'lofi-low', 'lofi-high', 'reverb-mix', 'reverb-decay'];
const controlDefaults = { 'lofi-mix': 0, 'lofi-low': 200, 'lofi-high': 5000, 'reverb-mix': 0, 'reverb-decay': 1.5 };
const renderDuration = s => s.hold + s.release + ((s['reverb-mix'] || 0) > 0 ? (s['reverb-decay'] ?? 1.5) : 0);
const presets = {
  warm: { wave: 'triangle', detune: 9, noise: 2, 'pitch-drop': 0, attack: .025, decay: .6, sustain: 45, release: .5, cutoff: 3600, resonance: .8, octave: 3, hold: .5 },
  sub: { wave: 'sine', detune: 0, noise: 0, 'pitch-drop': 0, attack: .008, decay: .3, sustain: 70, release: .2, cutoff: 800, resonance: .7, octave: 2, hold: .5 },
  pluck: { wave: 'sawtooth', detune: 6, noise: 1, 'pitch-drop': 0, attack: .002, decay: .25, sustain: 0, release: .2, cutoff: 2200, resonance: 2, octave: 4, hold: .5 },
  kick: { wave: 'sine', detune: 0, noise: 3, 'pitch-drop': 24, attack: .002, decay: .3, sustain: 0, release: .1, cutoff: 1800, resonance: .7, octave: 1, hold: .5 },
  hat: { wave: 'square', detune: 0, noise: 100, 'pitch-drop': 0, attack: .002, decay: .08, sustain: 0, release: .04, cutoff: 16000, resonance: .6, octave: 4, hold: .125 }
};
const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const shortcuts = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k'];
let octave = 3, note = 0, context, currentSource, cachedRender, renderTimer, playVersion = 0, previousAutoName = '';
let savedSounds = [];
const frequency = () => 440 * 2 ** (((octave + 1) * 12 + note - 69) / 12);
const noteName = () => noteNames[note % 12] + (octave + Math.floor(note / 12));
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3000);
}
function settings() {
  return Object.fromEntries(controls.map(id => [id, +$('#' + id).value]).concat([['wave', $('#wave-type').value], ['hold', +$('#hold').value], ['frequency', frequency()]]));
}
function updateName() {
  const name = $('#preset').selectedOptions[0].textContent + ' ' + noteName();
  if (!$('#sound-name').value.trim() || $('#sound-name').value === previousAutoName) $('#sound-name').value = name;
  previousAutoName = name;
}
function refresh() {
  for (const id of controls) {
    const value = +$('#' + id).value;
    $('#' + id + '-value').textContent = ['attack', 'decay', 'release', 'reverb-decay'].includes(id) ? (value < 1 ? Math.round(value * 1000) + ' ms' : value.toFixed(2) + ' s') : ['cutoff', 'lofi-low', 'lofi-high'].includes(id) ? (value >= 1000 ? (value / 1000).toFixed(1) + ' kHz' : value + ' Hz') : id === 'detune' ? value + ' cents' : id === 'pitch-drop' ? value + ' st' : id === 'resonance' ? value.toFixed(1) : ['reverb-mix', 'lofi-mix'].includes(id) && value === 0 ? 'Off' : value + '%';
  }
  document.querySelectorAll('[data-wave]').forEach(button => {
    const active = button.dataset.wave === $('#wave-type').value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
  $('#note-display').textContent = noteName() + ' · ' + frequency().toFixed(2) + ' Hz';
  $('#octave-label').textContent = 'OCTAVE ' + octave;
  $('#octave-down').disabled = octave <= 1;
  $('#octave-up').disabled = octave >= 6;
  document.querySelectorAll('.key').forEach(key => key.classList.toggle('active', +key.dataset.note === note));
  $('#sample-length').textContent = renderDuration(settings()).toFixed(2) + ' sec';
  cachedRender = null;
  clearTimeout(renderTimer);
  renderTimer = setTimeout(async () => {
    const signature = JSON.stringify(settings());
    try {
      const buffer = await getRendered();
      if (signature === JSON.stringify(settings())) drawWave(buffer);
    } catch { toast('Could not render this sound. Try another preset.'); }
  }, 100);
}
function buildKeyboard() {
  const keyboard = $('#keyboard');
  keyboard.innerHTML = '';
  const whites = [0, 2, 4, 5, 7, 9, 11, 12];
  const blackPositions = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };
  for (const n of [...whites, 1, 3, 6, 8, 10]) {
    const key = document.createElement('button');
    key.className = 'key' + (n in blackPositions ? ' black' : '');
    key.dataset.note = n;
    key.setAttribute('aria-label', 'Play ' + noteNames[n % 12] + (octave + Math.floor(n / 12)));
    if (n in blackPositions) key.style.left = blackPositions[n] / 8 * 100 + '%';
    key.innerHTML = `<span>${noteNames[n % 12]}${octave + Math.floor(n / 12)}</span><small>${shortcuts[n].toUpperCase()}</small>`;
    key.onpointerdown = event => { if (event.button !== 0) return; event.preventDefault(); selectNote(n); };
    // Native button clicks from keyboard and assistive technology.
    key.onclick = event => { if (event.detail === 0) selectNote(n); };
    keyboard.append(key);
  }
}
function selectNote(n) {
  note = n;
  updateName();
  refresh();
  preview();
}
async function renderSound(s) {
  const sampleRate = 44100;
  const dryDuration = s.hold + s.release, duration = renderDuration(s);
  const ac = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = s.cutoff; filter.Q.value = s.resonance;
  const envelope = ac.createGain();
  const sustain = s.sustain / 100;
  envelope.gain.setValueAtTime(0, 0);
  envelope.gain.linearRampToValueAtTime(.55, s.attack);
  envelope.gain.linearRampToValueAtTime(.55 * sustain, s.attack + s.decay);
  const atRelease = s.hold < s.attack ? .55 * s.hold / s.attack : s.hold < s.attack + s.decay ? .55 * (1 - (1 - sustain) * (s.hold - s.attack) / s.decay) : .55 * sustain;
  envelope.gain.cancelScheduledValues(s.hold);
  // Keep the attack/decay segment continuous when the note ends partway through it.
  envelope.gain.linearRampToValueAtTime(atRelease, s.hold);
  envelope.gain.linearRampToValueAtTime(0, dryDuration);
  filter.connect(envelope);
  // Blend before reverb so both its dry signal and tail use the lo-fi tone.
  let output = envelope;
  const lofiMix = (s['lofi-mix'] ?? 0) / 100;
  if (lofiMix > 0) {
    const highpass = ac.createBiquadFilter(), lowpass = ac.createBiquadFilter();
    highpass.type = 'highpass'; highpass.frequency.value = s['lofi-low'] ?? 200;
    lowpass.type = 'lowpass'; lowpass.frequency.value = s['lofi-high'] ?? 5000;
    highpass.Q.value = lowpass.Q.value = Math.SQRT1_2;
    const dry = ac.createGain(), wet = ac.createGain();
    output = ac.createGain();
    // Linear blending avoids boosting correlated dry/filtered signals.
    dry.gain.value = 1 - lofiMix; wet.gain.value = lofiMix;
    envelope.connect(dry).connect(output);
    envelope.connect(highpass).connect(lowpass).connect(wet).connect(output);
  }
  const mix = (s['reverb-mix'] || 0) / 100;
  if (mix === 0) output.connect(ac.destination);
  else {
    const dry = ac.createGain(), wet = ac.createGain(), reverb = ac.createConvolver();
    dry.gain.value = Math.cos(mix * Math.PI / 2);
    wet.gain.value = Math.sin(mix * Math.PI / 2);
    reverb.buffer = looperReverb.impulse(ac, s['reverb-decay'] ?? 1.5);
    output.connect(dry).connect(ac.destination);
    output.connect(reverb).connect(wet).connect(ac.destination);
  }
  const noiseMix = s.noise / 100;
  for (const cents of [-s.detune / 2, s.detune / 2]) {
    const oscillator = ac.createOscillator(), gain = ac.createGain();
    oscillator.type = s.wave;
    oscillator.frequency.setValueAtTime(s.frequency * 2 ** (s['pitch-drop'] / 12), 0);
    oscillator.frequency.exponentialRampToValueAtTime(s.frequency, Math.min(.12, s.hold));
    oscillator.detune.value = cents;
    gain.gain.value = (1 - noiseMix) / 2;
    oscillator.connect(gain).connect(filter);
    oscillator.start(0); oscillator.stop(dryDuration);
  }
  if (noiseMix > 0) {
    const noiseBuffer = ac.createBuffer(1, Math.ceil(dryDuration * sampleRate), sampleRate), data = noiseBuffer.getChannelData(0);
    // A repeatable noise texture keeps the preview and exported waveform consistent.
    let seed = 417;
    for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; data[i] = seed / 2147483648; }
    const source = ac.createBufferSource(), gain = ac.createGain();
    source.buffer = noiseBuffer; gain.gain.value = noiseMix;
    source.connect(gain).connect(filter); source.start(0);
  }
  const buffer = await ac.startRendering();
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (const sample of data) peak = Math.max(peak, Math.abs(sample));
  if (peak > .95) for (let i = 0; i < data.length; i++) data[i] *= .95 / peak;
  return buffer;
}
function getRendered() {
  const s = settings(), signature = JSON.stringify(s);
  if (!cachedRender || cachedRender.signature !== signature) cachedRender = { signature, promise: renderSound(s) };
  return cachedRender.promise;
}
function drawWave(buffer) {
  const canvas = $('#synth-wave'), rect = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  const g = canvas.getContext('2d'); g.scale(dpr, dpr);
  const data = buffer.getChannelData(0), w = rect.width, h = rect.height;
  g.strokeStyle = '#8b9e6e'; g.lineWidth = 1.4;
  for (let x = 0; x < w; x += 3) {
    let peak = 0, end = Math.min(data.length, Math.ceil((x + 3) / w * data.length));
    for (let i = Math.floor(x / w * data.length); i < end; i++) peak = Math.max(peak, Math.abs(data[i]));
    const height = Math.max(1, peak * h * .48);
    g.beginPath(); g.moveTo(x, h / 2 - height); g.lineTo(x, h / 2 + height); g.stroke();
  }
}
async function preview() {
  const version = ++playVersion;
  context ||= looperAudio.createContext();
  // Resume from the user gesture before waiting on offline rendering.
  const resumed = context.resume();
  try {
    const buffer = await getRendered();
    await resumed;
    if (version !== playVersion) return;
    if (currentSource) { try { currentSource.stop(); } catch {} }
    const source = context.createBufferSource();
    source.buffer = buffer; source.connect(context.destination); source.start(); currentSource = source;
    drawWave(buffer);
  } catch { toast('Could not play this sound. Please try again.'); }
}
function applyPreset() {
  $('#my-sounds').value = '';
  $('#capture-status').textContent = 'Release and reverb tails are included in your sample.';
  const preset = presets[$('#preset').value];
  controls.forEach(id => $('#' + id).value = preset[id] ?? controlDefaults[id]);
  $('#wave-type').value = preset.wave;
  $('#hold').value = preset.hold;
  octave = preset.octave; note = 0;
  buildKeyboard(); updateName(); refresh();
}
function wav(buffer) {
  const samples = buffer.getChannelData(0), bytes = new ArrayBuffer(44 + samples.length * 2), view = new DataView(bytes);
  const text = (offset, string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return new Blob([bytes], { type: 'audio/wav' });
}
controls.forEach(id => $('#' + id).oninput = refresh);
$('#hold').onchange = refresh;
$('#preset').onchange = applyPreset;
document.querySelectorAll('[data-wave]').forEach(button => button.onclick = () => { $('#wave-type').value = button.dataset.wave; refresh(); });
$('#octave-down').onclick = () => { octave = Math.max(1, octave - 1); buildKeyboard(); updateName(); refresh(); };
$('#octave-up').onclick = () => { octave = Math.min(6, octave + 1); buildKeyboard(); updateName(); refresh(); };
$('#audition').onclick = preview;
$('#download-sound').onclick = async () => {
  const button = $('#download-sound');
  button.disabled = true;
  try {
    const sound = captureSound();
    const buffer = await getRendered();
    let saved = true;
    try { await rememberSound(sound); }
    catch { saved = false; }
    const url = URL.createObjectURL(wav(buffer)), link = document.createElement('a');
    link.href = url; link.download = sound.name.replace(/[^a-z0-9 _-]/gi, '') + '.wav';
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(saved ? 'WAV ready. This sound is also saved in My sounds.' : 'WAV ready. Could not save to My sounds; browser storage is unavailable.');
  } catch { toast('Could not export your sound. Please try again.'); }
  finally { button.disabled = false; }
};
$('#send-sample').onclick = async () => {
  const button = $('#send-sample'); button.disabled = true;
  // Capture the exact patch and audio before asynchronous storage work.
  const sound = captureSound();
  try {
    const buffer = await getRendered();
    const session = await loopStore.get('session');
    if (session && session.samples.length >= 128 && session.samples.every(Boolean)) {
      toast('All 128 pads are full. Save this sound as WAV and drop it onto a pad to replace it.');
      return;
    }
    await rememberSound(sound);
    await loopStore.put('synth-sample', { name: sound.name, audio: loopStore.pack(buffer) });
    location.href = 'index.html';
  } catch { toast('Could not transfer your sound. Save it as WAV and import it into the sampler.'); }
  finally { button.disabled = false; }
};
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  const n = shortcuts.indexOf(event.key.toLowerCase());
  if (n !== -1) { event.preventDefault(); selectNote(n); }
  if (event.code === 'Space') { event.preventDefault(); preview(); }
});
window.addEventListener('resize', () => getRendered().then(drawWave).catch(() => {}));
window.addEventListener('pagehide', () => { playVersion++; if (currentSource) { try { currentSource.stop(); } catch {} } });
applyPreset();


function captureSound() {
  return {
    name: $('#sound-name').value.trim() || 'Synth ' + noteName(),
    patch: { ...settings(), octave, note, preset: $('#preset').value }
  };
}
function renderSavedSounds(selectedId = $('#my-sounds').value) {
  const select = $('#my-sounds');
  select.replaceChildren(new Option(savedSounds.length ? 'Choose a saved sound…' : 'No saved sounds yet', ''));
  const counts = new Map();
  savedSounds.forEach(sound => {
    const version = (counts.get(sound.name) || 0) + 1;
    counts.set(sound.name, version);
    select.add(new Option(sound.name + (version > 1 ? ' · version ' + version : ''), sound.id));
  });
  select.disabled = savedSounds.length === 0;
  select.value = selectedId;
}
// Add history atomically so two tabs cannot overwrite each other's saved sounds.
async function rememberSound(sound) {
  await libraryReady;
  const db = await loopStore.db();
  try {
    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction('data', 'readwrite'), store = transaction.objectStore('data');
      const request = store.get('synth-library');
      let library, entry;
      request.onsuccess = () => {
        library = request.result || [];
        entry = library.find(item => item.name === sound.name && JSON.stringify(item.patch) === JSON.stringify(sound.patch));
        if (!entry) {
          entry = { ...sound, id: crypto.randomUUID(), createdAt: Date.now() };
          library.push(entry);
          store.put(library, 'synth-library');
        }
      };
      transaction.oncomplete = () => resolve({ library, entry });
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Sound could not be saved'));
    });
    savedSounds = result.library;
    renderSavedSounds(result.entry.id);
  } finally { db.close(); }
}
$('#my-sounds').onchange = () => {
  const sound = savedSounds.find(item => item.id === $('#my-sounds').value);
  if (!sound) return;
  const patch = sound.patch;
  controls.forEach(id => $('#' + id).value = patch[id] ?? controlDefaults[id]);
  $('#wave-type').value = patch.wave;
  $('#hold').value = patch.hold;
  $('#preset').value = patch.preset;
  octave = patch.octave; note = patch.note;
  $('#sound-name').value = sound.name;
  previousAutoName = '';
  playVersion++;
  buildKeyboard(); refresh();
  $('#capture-status').textContent = 'Loaded ' + sound.name + '. Adjust it to create a new version.';
};
const libraryReady = (async () => {
  try {
    savedSounds = await loopStore.get('synth-library') || [];
    renderSavedSounds();
  } catch {
    $('#my-sounds').replaceChildren(new Option('Saved sounds unavailable', ''));
    toast('Could not load My sounds. Check browser storage.');
  }
})();
