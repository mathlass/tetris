const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'highscores.json');

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { classic: [], ultra: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function handleApi(req, res, parsedUrl) {
  if (req.method === 'GET') {
    const mode = parsedUrl.query.mode || 'classic';
    const data = readData();
    sendJson(res, 200, data[mode] || []);
  } else if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { name, score, lines, level, date, mode = 'classic' } = JSON.parse(body || '{}');
        if (typeof name !== 'string') throw new Error('Invalid');
        const entry = {
          name,
          score,
          lines,
          level,
          date: date || new Date().toISOString().slice(0,10)
        };
        const data = readData();
        const list = data[mode] || [];
        list.push(entry);
        list.sort((a,b)=> b.score - a.score || b.lines - a.lines || b.level - a.level);
        data[mode] = list.slice(0,10);
        saveData(data);
        sendJson(res, 201, entry);
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid data' });
      }
    });
  } else if (req.method === 'DELETE') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { mode = 'classic' } = body ? JSON.parse(body) : {};
        const data = readData();
        data[mode] = [];
        saveData(data);
        res.writeHead(204);
        res.end();
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid data' });
      }
    });
  } else {
    res.writeHead(405);
    res.end();
  }
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(__dirname, pathname === '/' ? '/index.html' : pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2'
    };
    const type = types[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname === '/api/highscores') {
    handleApi(req, res, parsedUrl);
  } else {
    serveStatic(req, res, parsedUrl.pathname);
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
