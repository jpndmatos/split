import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {spawn,type ChildProcess} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {unlinkSync} from 'node:fs';
import {once} from 'node:events';
const port=31874,file=join(tmpdir(),`split-test-${Date.now()}.db`);let child:ChildProcess;
async function request(path:string,method='GET',body?:unknown,origin?:string){const response=await fetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}
beforeAll(async()=>{child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{env:{...process.env,PORT:String(port),SPLIT_DB:file},stdio:'pipe'});await new Promise<void>((resolve,reject)=>{child.once('error',reject);child.once('exit',()=>reject(new Error('API exited before startup')));child.stdout!.on('data',()=>resolve());});});
afterAll(async()=>{if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}try{unlinkSync(file);}catch{}});
describe('SQLite API',()=>{
 it('creates a trip, stores an uneven split, and settles it',async()=>{
  const created=await request('/trips','POST',{title:'Test trip',names:['Ana','Bruno','Clara']});expect(created.status).toBe(201);const id=created.data.id,members=created.data.members.map((m:{id:string})=>m.id);
  const added=await request(`/trips/${id}/expenses`,'POST',{title:'Coffee',cents:1001,payerId:members[0],memberIds:members,date:'2026-10-28',category:'Food'});expect(added.status).toBe(201);expect(added.data.expenses[0].splits.reduce((n:number,s:{cents:number})=>n+s.cents,0)).toBe(1001);
  const persisted=await request(`/trips/${id}`);expect(persisted.data.expenses).toHaveLength(1);
  for(const transfer of added.data.settlements){expect((await request(`/trips/${id}/payments`,'POST',transfer)).status).toBe(201);}
  const settled=await request(`/trips/${id}`);expect(settled.data.settlements).toHaveLength(0);
  const payment=settled.data.payments[0];expect((await request(`/trips/${id}/payments/${payment.id}`,'DELETE')).data.settlements.length).toBeGreaterThan(0);
  expect((await request(`/trips/${id}/expenses/${added.data.expenses[0].id}`,'DELETE')).data.expenses).toHaveLength(0);
 });
 it('rejects invalid members, dates and duplicate names',async()=>{
  expect((await request('/trips','POST',{title:'Bad trip',names:['Ana','ana']})).status).toBe(400);
  const {data:trips}=await request('/trips');const {data:trip}=await request(`/trips/${trips[0].id}`);
  const body={title:'Oops',cents:100,payerId:trip.members[0].id,memberIds:['stranger'],date:'2026-10-28'};
  expect((await request(`/trips/${trip.id}/expenses`,'POST',body)).status).toBe(400);
  expect((await request(`/trips/${trip.id}/expenses`,'POST',{...body,memberIds:[trip.members[0].id],date:'2026-02-30'})).status).toBe(400);
 });
 it('rejects a foreign origin and stale settlement amounts',async()=>{
  expect((await request('/trips','POST',{title:'Foreign trip',names:['A','B']},'https://unrelated.example')).status).toBe(403);
  const {data:trips}=await request('/trips');expect((await request(`/trips/${trips[0].id}/payments`,'POST',{fromId:'x',toId:'y',cents:100})).status).toBe(409);
 });
});
