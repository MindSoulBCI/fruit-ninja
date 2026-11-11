const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
require('../build.cjs');
const port = Number(process.env.PORT || 4174);
http.createServer((req, res) => {
  if (req.url === '/favicon.ico') {res.writeHead(204);res.end();return;}
  if (!['/', '/index.html'].includes(new URL(req.url, 'http://localhost').pathname)) {res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  fs.createReadStream(path.join(__dirname,'../index.html')).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Fruit Ninja: http://127.0.0.1:${port}`));
