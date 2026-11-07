const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const publicDir = path.resolve(__dirname, '../public');

test('shared modules also work as browser globals without CommonJS', async () => {
  const context = vm.createContext({ Blob, Uint8Array, Float32Array, ArrayBuffer, DataView, TextEncoder, TextDecoder, setTimeout, clearTimeout });
  for (const file of ['vendor/fflate.js', 'vendor/js-yaml.js', 'interface-resources/sequencer-core.js', 'interface-resources/session-archive.js']) {
    vm.runInContext(fs.readFileSync(path.join(publicDir, file), 'utf8'), context, { filename: file });
  }
  assert.equal(typeof context.looperCore.createPatterns, 'function');
  assert.equal(typeof context.sessionArchive.create, 'function');
  const blob = vm.runInContext(`sessionArchive.create({
    name:'Browser bridge',bpm:90,swing:0,timeSignature:{beats:4,unit:4},sequenceBars:1,
    activeBank:0,activePattern:0,selected:0,metronome:false,
    samples:Array(128).fill(null),patternBanks:looperCore.createPatterns()
  },[])`, context);
  assert.equal((await context.sessionArchive.read(blob)).session.name, 'Browser bridge');
});

test('both entry pages reference existing scripts with valid JavaScript syntax', () => {
  for (const page of ['index.html', 'synth.html']) {
    const html = fs.readFileSync(path.join(publicDir, page), 'utf8');
    for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
      const filename = path.join(publicDir, match[1].split('?')[0]);
      new vm.Script(fs.readFileSync(filename, 'utf8'), { filename });
    }
  }
});
