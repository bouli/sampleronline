const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('dropdown changes release focus while other control changes retain focus', () => {
  const listeners = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/interface-resources/range-focus.js'), 'utf8'), {
    document: { addEventListener(type, listener) { listeners[type] = listener; } },
    window: { addEventListener() {} }
  });
  for (const tag of ['select', 'input', 'textarea']) {
    let blurred = false;
    const target = { matches: selector => selector === tag, blur() { blurred = true; } };
    listeners.change({ target });
    assert.equal(blurred, tag === 'select');
  }
});
