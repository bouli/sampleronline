const test = require('node:test');
const assert = require('node:assert/strict');
const archive = require('../public/interface-resources/session-archive.js');
const core = require('../public/interface-resources/sequencer-core.js');
const zip = require('../public/vendor/fflate.js');
const yaml = require('../public/vendor/js-yaml.js');

function fixture() {
  const snapshot = {
    name: 'Tape & keys: café', bpm: 117, swing: 23, timeSignature: { beats: 3, unit: 8 },
    sequenceBars: 2, activeBank: 7, activePattern: 5, selected: 127, metronome: true,
    lofi: { amount: 65, low: 500, high: 3000 }, reverb: { amount: 25, decay: 2 },
    samples: Array(128).fill(null), patternBanks: core.createPatterns()
  };
  snapshot.samples[127] = {
    name: 'Stereo <&>', start: .001, end: .008, level: .63, reverse: true, muted: true,
    audio: { sampleRate: 44100, channels: [Float32Array.from({ length: 441 }, (_, i) => Math.sin(i * .1) * .3), Float32Array.from({ length: 441 }, (_, i) => Math.cos(i * .1) * .2)] }
  };
  snapshot.patternBanks.forEach((bank, i) => { bank[127][767 - i] = true; bank[i][i] = true; });
  const library = [{ id: 'test-synth', name: 'Saved keys', createdAt: 123456789, patch: {
    detune: 9, noise: 2, 'pitch-drop': 0, attack: .025, decay: .6, sustain: 45, release: .5, cutoff: 3600, resonance: .8,
    wave: 'triangle', hold: .5, frequency: 130.8127826502993, octave: 3, note: 0, preset: 'warm', ...core.synthDefaults
  } }];
  return { snapshot, library };
}
async function filesForFixture() {
  const { snapshot, library } = fixture();
  return zip.unzipSync(new Uint8Array(await archive.create(snapshot, library).arrayBuffer()));
}
function bundle(files) { return new Blob([zip.zipSync(files)]); }
async function changedManifest(change) {
  const files = await filesForFixture();
  const manifest = yaml.load(zip.strFromU8(files['session.yaml']));
  change(manifest);
  files['session.yaml'] = zip.strToU8(yaml.dump(manifest));
  return bundle(files);
}

test('ZIP/YAML roundtrip preserves metadata, stereo float audio, trims and every hidden hit', async () => {
  const { snapshot, library } = fixture();
  const decoded = await archive.read(archive.create(snapshot, library));
  assert.deepEqual(decoded.session, snapshot);
  assert.deepEqual(decoded.library, library);
});

test('empty session archive roundtrips', async () => {
  const { snapshot } = fixture();
  snapshot.samples.fill(null);
  snapshot.patternBanks = core.createPatterns();
  const decoded = await archive.read(archive.create(snapshot, []));
  assert.deepEqual(decoded.session, snapshot);
  assert.deepEqual(decoded.library, []);
});

test('older session and synth effects load with bypass defaults', async () => {
  const blob = await changedManifest(m => {
    delete m.session.lofi; delete m.session.reverb;
    for (const key of Object.keys(core.synthDefaults)) delete m.synthLibrary[0].patch[key];
  });
  const decoded = await archive.read(blob);
  assert.deepEqual(decoded.session.lofi, { amount: 0, low: 200, high: 5000 });
  assert.deepEqual(decoded.session.reverb, { amount: 0, decay: 1.5 });
  for (const [key, value] of Object.entries(core.synthDefaults)) assert.equal(decoded.library[0].patch[key], value);
});

test('Finder enclosing folder and metadata are accepted', async () => {
  const files = await filesForFixture();
  const wrapped = Object.fromEntries(Object.entries(files).map(([path, data]) => ['First Session/' + path, data]));
  wrapped['__MACOSX/._session.yaml'] = new Uint8Array([1]);
  const decoded = await archive.read(bundle(wrapped));
  assert.equal(decoded.session.samples[127].name, 'Stereo <&>');
});

for (const [name, change, error] of [
  ['unsupported version', m => m.version = 2, /supported Looper session/],
  ['invalid tempo', m => m.session.bpm = 0, /session settings/],
  ['invalid meter', m => m.session.timeSignature.unit = 3, /time signature/],
  ['invalid lo-fi', m => m.session.lofi.amount = 101, /lo-fi/],
  ['invalid reverb', m => m.session.reverb.decay = 6, /reverb/],
  ['invalid synth effect', m => m.synthLibrary[0].patch['lofi-low'] = 0, /synth setting/],
  ['duplicate steps', m => m.patterns[0].tracks[0].steps = [0, 0], /duplicate sequencer step/],
  ['step outside capacity', m => m.patterns[0].tracks[0].steps = [768], /sequencer step/],
  ['invalid trim', m => m.pads[127].end = 1, /trim points/],
  ['selected pad in wrong bank', m => m.session.selectedPad = 'A01', /selected bank/],
]) {
  test(`rejects ${name}`, async () => {
    await assert.rejects(archive.read(await changedManifest(change)), error);
  });
}

test('rejects corrupt ZIP, missing WAV and ambiguous manifests', async () => {
  await assert.rejects(archive.read(new Blob(['broken'])), /ZIP|manifest/);
  let files = await filesForFixture();
  delete files['samples/H16.wav'];
  await assert.rejects(archive.read(bundle(files)), /audio file/);
  files = await filesForFixture();
  files['other/session.yaml'] = files['session.yaml'];
  await assert.rejects(archive.read(bundle(files)), /multiple sessions/);
});

test('rejects unsafe archive paths and non-finite sample audio', async () => {
  let files = await filesForFixture();
  files['../bad'] = new Uint8Array([1]);
  await assert.rejects(archive.read(bundle(files)), /archive path/);
  files = await filesForFixture();
  const wav = files['samples/H16.wav'];
  new DataView(wav.buffer, wav.byteOffset, wav.byteLength).setFloat32(44, NaN, true);
  await assert.rejects(archive.read(bundle(files)), /invalid audio values/);
});
