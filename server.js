// Minimal HTTP server for storing high scores
import http from 'http';
import { readFile, writeFile } from 'fs/promises';
import { logError } from './src/logger.js';

const PORT = process.env.PORT || 3000;
const DATA_FILE = './scores.json';
const MAX_BODY_SIZE = 10_000; // ~10KB
const MAX_NAME_LEN = 20;
const MAX_DATE_LEN = 20;

function isValidEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const { name, score, lines, date } = entry;
  return (
    typeof name === 'string' && name.length > 0 && name.length <= MAX_NAME_LEN &&
    typeof score === 'number' && Number.isInteger(score) && score >= 0 &&
    typeof lines === 'number' && Number.isInteger(lines) && lines >= 0 &&
    typeof date === 'string' && date.length > 0 && date.length <= MAX_DATE_LEN
  );
}

async function readData() {
  try {
    const data = await readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    logError('Failed to read score data', e);
    return {};
  }
}

async function writeData(data) {
  try {
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    logError('Failed to write score data', e);
  }
}

const server = http.createServer(async (req,res)=>{
  const url = new URL(req.url, `http://${req.headers.host}`);
  if(url.pathname.startsWith('/scores/')){
    const mode = url.pathname.split('/')[2];
    if(req.method === 'GET'){
      const data = await readData();
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify(data[mode] || []));
      return;
    }
    if(req.method === 'POST'){
      let body='';
      let tooBig=false;
      req.on('data', chunk => {
        body += chunk;
        if(body.length > MAX_BODY_SIZE && !tooBig){
          tooBig=true;
          res.statusCode = 400;
          res.end('Bad Request');
          req.socket.destroy();
        }
      });
      req.on('end', async ()=>{
        if(tooBig) return;
        try {
          const entry = JSON.parse(body);
          if(!isValidEntry(entry)){
            logError('Invalid score submission', 'Validation failed');
            res.statusCode = 400;
            res.end('Bad Request');
            return;
          }
          const data = await readData();
          const list = data[mode] || [];
          list.push(entry);
          list.sort((a, b) => b.score - a.score || b.lines - a.lines);
          data[mode] = list.slice(0, 10);
          await writeData(data);
          res.statusCode = 204;
          res.end();
        } catch (err) {
          logError('Invalid score submission', err);
          res.statusCode = 400;
          res.end('Bad Request');
        }
      });
      return;
    }
  }
  res.statusCode = 404;
  res.end();
});

server.listen(PORT, ()=>{
  console.log(`Score server running on ${PORT}`);
});
