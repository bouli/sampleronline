const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer } = require('../scripts/serve.cjs');
let server, port;
before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
after(() => new Promise(resolve => server.close(resolve)));
function request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, response => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject); req.end();
  });
}
test('serves entry pages and script/CSS types, including version query strings', async () => {
  for (const [url, type] of [['/', 'text/html'], ['/synth.html', 'text/html'], ['/privacy.html', 'text/html'], ['/js/app.js?v=test', 'text/javascript'], ['/css/style.css', 'text/css']]) {
    const result = await request(url);
    assert.equal(result.status, 200, url);
    assert.ok(result.headers['content-type'].startsWith(type));
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.ok(result.body.length > 0);
  }
});
test('does not expose root contributor files, directories or traversal paths', async () => {
  for (const url of ['/AGENTS.md', '/README.md', '/Makefile', '/scripts/serve.cjs', '/tests/', '/js/vendor/', '/../AGENTS.md', '/%2e%2e%2fAGENTS.md']) {
    assert.equal((await request(url)).status, 404, url);
  }
});
test('supports HEAD and rejects malformed URLs and unsupported methods', async () => {
  const head = await request('/js/app.js', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.ok(Number(head.headers['content-length']) > 0);
  assert.equal((await request('/%ZZ')).status, 400);
  const post = await request('/', 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
});
