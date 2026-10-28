import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { splitCents, balances, settlements } from './money.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.env.SPLIT_DB || resolve(root, 'data/split.db');
mkdirSync(dirname(file), {recursive:true});
const db = new DatabaseSync(file);
db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS trips(id TEXT PRIMARY KEY,title TEXT NOT NULL,subtitle TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,tripId TEXT NOT NULL REFERENCES trips(id),name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS expenses(id TEXT PRIMARY KEY,tripId TEXT NOT NULL REFERENCES trips(id),title TEXT NOT NULL,cents INTEGER NOT NULL,payerId TEXT NOT NULL REFERENCES members(id),date TEXT NOT NULL,category TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS splits(expenseId TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,memberId TEXT NOT NULL REFERENCES members(id),cents INTEGER NOT NULL,PRIMARY KEY(expenseId,memberId));
 CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY,tripId TEXT NOT NULL REFERENCES trips(id),fromId TEXT NOT NULL REFERENCES members(id),toId TEXT NOT NULL REFERENCES members(id),cents INTEGER NOT NULL);`);

function transaction(fn) { db.exec('BEGIN'); try { const value=fn(); db.exec('COMMIT'); return value; } catch(e) {db.exec('ROLLBACK'); throw e;} }
function createTrip(title, names, subtitle='A good time, fairly shared.') {
 const id=randomUUID();
 transaction(()=>{ db.prepare('INSERT INTO trips VALUES(?,?,?)').run(id,title,subtitle); for(const name of names) db.prepare('INSERT INTO members VALUES(?,?,?)').run(randomUUID(),id,name); });
 return id;
}
function state(id) {
 const trip=db.prepare('SELECT * FROM trips WHERE id=?').get(id); if(!trip) return null;
 const members=db.prepare('SELECT * FROM members WHERE tripId=? ORDER BY rowid').all(id);
 const expenses=db.prepare('SELECT * FROM expenses WHERE tripId=? ORDER BY date DESC,rowid DESC').all(id).map(e=>({...e,splits:db.prepare('SELECT memberId AS id,cents FROM splits WHERE expenseId=?').all(e.id)}));
 const payments=db.prepare('SELECT * FROM payments WHERE tripId=?').all(id);
 const net=balances(members,expenses,payments);
 return {...trip,members,expenses,payments,balances:net,settlements:settlements(net)};
}
function addExpense(tripId,b) {
 const trip=state(tripId); if(!trip) throw new Error('Trip not found.');
 const ids=trip.members.map(m=>m.id);
 if(typeof b.title!=='string'||!b.title.trim()||b.title.length>100) throw new Error('Give the expense a short description.');
 if(!Number.isSafeInteger(b.cents)||b.cents<1||b.cents>100000000) throw new Error('Enter an amount between €0.01 and €1,000,000.');
 if(!ids.includes(b.payerId)||!Array.isArray(b.memberIds)||!b.memberIds.length||b.memberIds.some(id=>!ids.includes(id))) throw new Error('Choose a payer and people in this trip.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||new Date(b.date).toISOString().slice(0,10)!==b.date) throw new Error('Choose a valid date.');
 const category=['Food','Stay','Travel','Other'].includes(b.category)?b.category:'Other';
 const shares=splitCents(b.cents,b.memberIds),id=randomUUID();
 transaction(()=>{db.prepare('INSERT INTO expenses VALUES(?,?,?,?,?,?,?)').run(id,tripId,b.title.trim(),b.cents,b.payerId,b.date,category);for(const s of shares)db.prepare('INSERT INTO splits VALUES(?,?,?)').run(id,s.id,s.cents);});
}
if(!db.prepare('SELECT id FROM trips LIMIT 1').get()) {
 const id=createTrip('A weekend in Porto',['João','Inês','Miguel','Sofia'],'Four friends. Two nights. One shared tab.');
 const m=state(id).members.map(m=>m.id);
 for(const [title,cents,payer,date,category,memberIds] of [
  ['Apartment by the river',24000,m[0],'2026-10-23','Stay',m],
  ['Train tickets',6800,m[2],'2026-10-23','Travel',m],
  ['Dinner at the little tasca',8640,m[1],'2026-10-24','Food',m],
  ['Coffee & pastéis',1280,m[3],'2026-10-24','Food',m],
  ['A very necessary taxi',1460,m[0],'2026-10-25','Travel',[m[0],m[1],m[3]]]
 ]) addExpense(id,{title,cents,payerId:payer,date,category,memberIds});
}
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const server=http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost'); const parts=url.pathname.split('/').filter(Boolean);
  if(parts[0]!=='api') {
   if(!['GET','HEAD'].includes(req.method)) return json(res,405,{error:'Method not allowed.'});
   const dist=resolve(root,'dist'); let path=resolve(dist,'.'+decodeURIComponent(url.pathname));
   if(path!==dist&&!path.startsWith(dist+sep)) return json(res,403,{error:'Forbidden.'});
   if(path===dist||!existsSync(path)) path=resolve(dist,'index.html');
   if(!existsSync(path))return json(res,404,{error:'Run npm run build, or use npm run dev.'});
   const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(path)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type});res.end(req.method==='HEAD'?undefined:readFileSync(path));return;
  }
  // Mutations are same-origin only, including when running behind the Vite proxy.
  const origin=req.headers.origin;
  if(!['GET','HEAD'].includes(req.method)&&origin) {
   const source=new URL(origin);
   const localDev=source.protocol==='http:'&&['localhost','127.0.0.1'].includes(source.hostname)&&['5174',String(process.env.PORT||3001)].includes(source.port);
   if(source.host!==req.headers.host&&!localDev)return json(res,403,{error:'Cross-origin changes are not allowed.'});
  }
  let b={}; if(['POST','PUT'].includes(req.method)) { let body=''; for await(const chunk of req){body+=chunk;if(body.length>16384)return json(res,413,{error:'Request too large.'});} try{b=JSON.parse(body);}catch{return json(res,400,{error:'Invalid JSON.'});} }
  if(parts[1]==='trips'&&parts.length===2) {
   if(req.method==='GET')return json(res,200,db.prepare('SELECT id,title,subtitle FROM trips ORDER BY rowid').all());
   if(req.method==='POST') {
    if(typeof b.title!=='string'||!b.title.trim()||b.title.length>70||!Array.isArray(b.names)||b.names.length<2||b.names.length>12||b.names.some(n=>typeof n!=='string'||!n.trim()||n.length>30)||new Set(b.names.map(n=>n.trim().toLowerCase())).size!==b.names.length) return json(res,400,{error:'Add a trip name and 2–12 different names.'});
    return json(res,201,state(createTrip(b.title.trim(),b.names.map(n=>n.trim()))));
   }
  }
  const id=parts[2];
  if(parts[1]==='trips'&&id) {
   const trip=state(id); if(!trip)return json(res,404,{error:'Trip not found.'});
   if(parts.length===3&&req.method==='GET')return json(res,200,trip);
   if(parts[3]==='expenses'&&parts.length===4&&req.method==='POST'){addExpense(id,b);return json(res,201,state(id));}
   if(parts[3]==='expenses'&&parts.length===5&&req.method==='DELETE'){
    const result=db.prepare('DELETE FROM expenses WHERE id=? AND tripId=?').run(parts[4],id);
    return result.changes?json(res,200,state(id)):json(res,404,{error:'Expense not found.'});
   }
   if(parts[3]==='payments'&&parts.length===4&&req.method==='POST') {
    const valid=trip.settlements.find(s=>s.fromId===b.fromId&&s.toId===b.toId&&s.cents===b.cents);
    if(!valid)return json(res,409,{error:'Balances changed. Refresh and try again.'});
    db.prepare('INSERT INTO payments VALUES(?,?,?,?,?)').run(randomUUID(),id,b.fromId,b.toId,b.cents);return json(res,201,state(id));
   }
   if(parts[3]==='payments'&&parts.length===5&&req.method==='DELETE') {
    const result=db.prepare('DELETE FROM payments WHERE id=? AND tripId=?').run(parts[4],id);
    return result.changes?json(res,200,state(id)):json(res,404,{error:'Payment not found.'});
   }
  }
  json(res,404,{error:'Not found.'});
 } catch(e) {json(res,400,{error:e.message||'Something went wrong.'});}
});
server.listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log(`Split API → http://127.0.0.1:${process.env.PORT||3001}`));
