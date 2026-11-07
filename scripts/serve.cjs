const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '../public');
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.woff': 'font/woff', '.woff2': 'font/woff2'
};

function createServer() {
  return http.createServer(async (request, response) => {
    // Development assets should always reflect the latest working tree.
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(request.url.split('?')[0]); }
    catch { response.writeHead(400); response.end(); return; }
    try {
      let filename = path.resolve(publicDir, '.' + pathname);
      const insidePublic = value => value.startsWith(publicDir + path.sep);
      if (filename !== publicDir && !insidePublic(filename)) throw new Error('Outside public');
      if ((await fs.stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
      filename = await fs.realpath(filename);
      if (!insidePublic(filename) || !(await fs.stat(filename)).isFile()) throw new Error('Not a public file');
      const data = await fs.readFile(filename);
      response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(filename)] || 'application/octet-stream',
        'Content-Length': data.length
      });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : 'Not found');
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8000), host = process.env.HOST || '0.0.0.0';
  const server = createServer();
  server.on('error', error => { console.error(`Server failed: ${error.message}`); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`Serving public/ at http://${host}:${server.address().port}`));
}
module.exports = { createServer };
