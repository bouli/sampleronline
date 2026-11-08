const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../public/interface-resources/sequencer-core.js');
const wav = require('../public/interface-resources/pattern-wav.js');

function fixture() {
  const rows = core.createPatterns()[0], samples = Array(128).fill(null);
  samples[0] = { start: .1, end: .3, muted: false };
  return { rows, samples, meter: { beats: 4, unit: 4 }, bars: 1, bpm: 120, swing: 0, reverb: { amount: 0, decay: 2 }, lofi: { amount: 0 } };
}

test('exports one loop at the active meter, length, tempo and swing', () => {
  const s = fixture(); s.swing = 50; s.rows[0][0] = true; s.rows[0][1] = true; s.rows[0][2] = true;
  const plan = wav.plan(s);
  assert.deepEqual(plan.events, [{ pad: 0, time: 0 }, { pad: 0, time: .1875 }, { pad: 0, time: .25 }]);
  assert.equal(plan.loopDuration, 2);
  assert.equal(plan.duration, 2);
  s.meter = { beats: 3, unit: 16 }; s.bars = 2;
  assert.equal(wav.plan(s).loopDuration, .75);
});

test('all banks render while missing/muted pads and hidden hits are excluded', () => {
  const s = fixture();
  s.samples[127] = { start: 0, end: .1, muted: false };
  s.samples[1] = { start: 0, end: .1, muted: true };
  s.rows[127][0] = true; s.rows[1][0] = true; s.rows[2][0] = true; s.rows[0][767] = true;
  assert.deepEqual(wav.plan(s).events, [{ pad: 127, time: 0 }]);
  assert.equal(s.rows[0][767], true);
});

test('sample and effect tails are cut at the exact pattern boundary', () => {
  const s = fixture(); s.rows[0][15] = true; s.samples[0].end = 1.1;
  assert.equal(wav.plan(s).duration, 2);
  s.reverb.amount = 50; s.lofi.amount = 50;
  assert.equal(wav.plan(s).duration, 2);
});

test('empty patterns export exactly one silent loop even with effects enabled', () => {
  const s = fixture(); s.reverb.amount = 100;
  assert.deepEqual(wav.plan(s), { events: [], loopDuration: 2, duration: 2 });
});

function buffer(channels) {
  return { numberOfChannels: channels.length, length: channels[0].length, sampleRate: 44100, getChannelData: c => Float32Array.from(channels[c]) };
}
test('PCM WAV has stereo interleaving, correct headers and signed sample values', async () => {
  const bytes = await wav.encode(buffer([[0, .5, -1], [1, -.5, 0]])).arrayBuffer();
  const view = new DataView(bytes);
  assert.equal(Buffer.from(bytes, 0, 4).toString(), 'RIFF');
  assert.equal(Buffer.from(bytes, 8, 4).toString(), 'WAVE');
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 12);
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true)), [0, 32767, 16384, -16384, -32768, 0]);
});

test('overloaded mixes scale both channels together without changing source audio', async () => {
  const source = buffer([[2], [1]]), view = new DataView(await wav.encode(source).arrayBuffer());
  assert.ok(Math.abs(view.getInt16(44, true) / 32767 - .98) < .0001);
  assert.ok(Math.abs(view.getInt16(46, true) / 32767 - .49) < .0001);
  assert.equal(source.getChannelData(0)[0], 2);
});

test('four-second loops remain exactly 176400 frames regardless of swing and tails', () => {
  const s = fixture(); s.bars = 2; s.rows[0][31] = true; s.samples[0].end = 10;
  s.reverb = { amount: 100, decay: 5 };
  for (const swing of [0, 23, 60]) {
    s.swing = swing;
    assert.equal(wav.plan(s).duration, 4);
    assert.equal(Math.round(wav.plan(s).duration * 44100), 176400);
  }
});

test('Keep pattern tail includes the last sample and reverb decay only when enabled', () => {
  const s = fixture(); s.rows[0][15] = true; s.samples[0].end = 1.1;
  s.reverb = { amount: 50, decay: 2 }; s.lofi = { amount: 50 };
  assert.equal(wav.plan(s).duration, 2);
  const plan = wav.plan({ ...s, keepTail: true });
  assert.equal(plan.loopDuration, 2);
  assert.equal(plan.duration, 4.925);
  assert.deepEqual(plan.events, wav.plan(s).events);
});

test('tail option preserves one loop for an empty pattern and a short dry sound', () => {
  const s = fixture(); s.keepTail = true; s.reverb.amount = 100;
  assert.equal(wav.plan(s).duration, 2);
  s.rows[0][0] = true; s.reverb.amount = 0;
  assert.equal(wav.plan(s).duration, 2);
});
