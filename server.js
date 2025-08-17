import http from 'http';
import { readFile, writeFile } from 'fs/promises';

const PORT = process.env.PORT || 3000;
const DATA_FILE = './scores.json';

async function readData(){
  try{
    const data = await readFile(DATA_FILE,'utf8');
    return JSON.parse(data);
  }catch(e){
    return {};
  }
}

async function writeData(data){
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2));
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
      req.on('data', chunk => body += chunk);
      req.on('end', async ()=>{
        try{
          const entry = JSON.parse(body);
          const data = await readData();
          const list = data[mode] || [];
          list.push(entry);
          list.sort((a,b)=>b.score - a.score || b.lines - a.lines);
          data[mode] = list.slice(0,10);
          await writeData(data);
          res.statusCode = 204;
        }catch(err){
          res.statusCode = 400;
          res.end('Bad Request');
          return;
        }
        res.end();
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
