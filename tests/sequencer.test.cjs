const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../public/interface-resources/sequencer-core.js');

test('patterns have eight independent banks, 128 pads and 768 stored steps', () => {
  const banks = core.createPatterns();
  assert.equal(banks.length, 8);
  assert.equal(banks[0].length, 128);
  assert.equal(banks[0][0].length, 768);
  banks[0][0][767] = true;
  assert.equal(banks[0][1][767], false);
  assert.equal(banks[1][0][767], false);
});

test('copy preserves hidden steps, replaces target hits and shares no row references', () => {
  const banks = core.createPatterns();
  banks[0][127][767] = true;
  banks[1][0][3] = true;
  const snapshot = core.clonePattern(banks[0]), targetRow = banks[1][127];
  banks[0][127][767] = false;
  core.replacePattern(banks[1], snapshot);
  assert.equal(banks[1][127], targetRow);
  assert.equal(banks[1][127][767], true);
  assert.equal(banks[1][0][3], false);
  snapshot[127][767] = false;
  assert.equal(banks[1][127][767], true);
});

test('swap exchanges all hits while preserving references held by playback', () => {
  const banks = core.createPatterns();
  banks[0][127][767] = true;
  banks[7][0][2] = true;
  const source = banks[0][127], destination = banks[7][0];
  core.swapPatterns(banks, 0, 7);
  assert.equal(banks[0][127], source);
  assert.equal(banks[7][0], destination);
  assert.equal(banks[7][127][767], true);
  assert.equal(banks[0][127][767], false);
  assert.equal(banks[0][0][2], true);
  assert.equal(banks[7][0][2], false);
  core.swapPatterns(banks, 0, 0);
  assert.equal(banks[0][0][2], true);
});

for (const keepHits of [true, false]) {
  test(`clearing a sound ${keepHits ? 'keeps' : 'removes'} hits across all patterns`, () => {
    const banks = core.createPatterns(), samples = Array(128).fill(null);
    samples[127] = { name: 'Old sound' };
    samples[0] = { name: 'Untouched' };
    banks.forEach(bank => { bank[127][767] = true; bank[0][0] = true; });
    core.clearPad(samples, banks, 127, keepHits);
    assert.equal(samples[127], null);
    assert.equal(samples[0].name, 'Untouched');
    for (const bank of banks) {
      assert.equal(bank[127][767], keepHits);
      assert.equal(bank[0][0], true);
    }
    samples[127] = { name: 'Replacement' };
    assert.equal(banks[7][127][767], keepHits);
  });
}

test('meter validation and step counts support the full loop range', () => {
  for (const beats of [1, 3, 4, 12]) for (const unit of [2, 4, 8, 16]) {
    assert.equal(core.validMeter({ beats, unit }), true);
    assert.equal(core.stepCount({ beats, unit }, 8), beats * 16 / unit * 8);
  }
  for (const meter of [null, {}, { beats: 0, unit: 4 }, { beats: 13, unit: 4 }, { beats: 4, unit: 3 }, { beats: 2.5, unit: 4 }]) assert.equal(core.validMeter(meter), false);
  assert.equal(core.stepCount({ beats: 12, unit: 2 }, 8), 768);
});

test('shorter loop views skip hidden hits without changing stored data', () => {
  const row = core.createPatterns()[0][0];
  row[767] = true;
  assert.equal(row.slice(0, core.stepCount({ beats: 4, unit: 4 }, 1)).some(Boolean), false);
  assert.equal(row.slice(0, core.stepCount({ beats: 12, unit: 2 }, 8))[767], true);
});

test('swing preserves bar duration, including odd-length bars', () => {
  for (const steps of [3, 6, 16, 20, 96]) for (const bpm of [40, 90, 240]) for (const swing of [0, .23, .6]) {
    const duration = Array.from({ length: steps }, (_, i) => core.stepDuration(i, bpm, swing, steps)).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(duration - steps * 60 / bpm / 4) < 1e-10);
  }
  assert.ok(core.stepDuration(0, 90, .6, 16) > core.stepDuration(1, 90, .6, 16));
  assert.equal(core.stepDuration(2, 120, .6, 3), .125);
});

test('sampler keymaps use physical codes across QWERTY, AZERTY and QWERTZ', () => {
  for (const event of [{ code: 'KeyQ', key: 'q' }, { code: 'KeyQ', key: 'a' }]) assert.equal(core.padKeyCodes.indexOf(event.code), 8);
  for (const event of [{ code: 'KeyY', key: 'y' }, { code: 'KeyY', key: 'z' }]) assert.equal(core.padKeyCodes.indexOf(event.code), 13);
  assert.equal(core.patternKeyCodes.indexOf('KeyA'), 0);
  assert.equal(core.patternKeyCodes.indexOf('KeyK'), 7);
  assert.equal(new Set(core.padKeyCodes).size, 16);
});

test('old synth patches default to bypass and renders include wet tails only', () => {
  assert.equal(core.synthDefaults['lofi-mix'], 0);
  assert.equal(core.synthDefaults['reverb-mix'], 0);
  const s = { hold: .5, release: .5 };
  assert.equal(core.synthRenderDuration(s), 1);
  assert.equal(core.synthRenderDuration({ ...s, 'reverb-mix': 0, 'reverb-decay': 5 }), 1);
  assert.equal(core.synthRenderDuration({ ...s, 'reverb-mix': 100, 'reverb-decay': 5 }), 6);
  assert.equal(core.synthRenderDuration({ ...s, 'reverb-mix': 50 }), 2.5);
});
