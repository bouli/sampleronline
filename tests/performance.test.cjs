const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../public/interface-resources/sequencer-core.js');
const entry = (time, pattern, step = 0) => ({ time, pattern, step, meter: { beats: 4, unit: 4 }, bars: 1, bpm: 120, swing: 0, duration: .125 });

test('recording retains the actual pattern order and repeated steps', () => {
  const trace = [entry(0, 0), entry(.125, 0, 1), entry(.25, 1), entry(.375, 1, 1), entry(.5, 0)];
  const log = core.finishPerformance(trace, .625);
  assert.deepEqual(log.map(e => e.pattern), [0, 0, 1, 1, 0]);
  assert.deepEqual(log.map(e => e.step), [0, 1, 0, 1, 0]);
  assert.equal(core.validPerformance(log), true);
  assert.ok(log.every(e => !('time' in e)));
  assert.equal(trace[0].time, 0);
});

test('stop removes lookahead steps that were never heard and truncates the last step', () => {
  const log = core.finishPerformance([entry(10, 0), entry(10.125, 1), entry(10.25, 2)], 10.2);
  assert.deepEqual(log.map(e => e.pattern), [0, 1]);
  assert.ok(Math.abs(log[1].duration - .075) < 1e-12);
  assert.equal(core.validPerformance(log), true);
  assert.deepEqual(core.finishPerformance([entry(10, 0)], 9), []);
});

test('tempo, swing, meter and partial-loop start points survive the log', () => {
  const e = { ...entry(2, 7, 11), meter: { beats: 3, unit: 4 }, bars: 2, bpm: 97, swing: 23 };
  e.duration = core.stepDuration(e.step, e.bpm, e.swing / 100, 12);
  const log = core.finishPerformance([e], 3);
  assert.equal(core.validPerformance(log), true);
  assert.equal(log[0].step, 11);
  assert.equal(log[0].bpm, 97);
  assert.equal(log[0].swing, 23);
  assert.notEqual(log[0].meter, e.meter);
});

test('malformed recordings are rejected before import or replay', () => {
  const good = core.finishPerformance([entry(0, 0)], .125)[0];
  assert.equal(core.validPerformance([]), true);
  for (const changed of [{ pattern: 8 }, { step: 768 }, { bpm: 0 }, { swing: 61 }, { duration: -1 }, { duration: .5 }, { bars: 0 }, { meter: { beats: 4, unit: 3 } }]) {
    assert.equal(core.validPerformance([{ ...good, ...changed }]), false);
  }
  assert.equal(core.validPerformance(null), false);
});
