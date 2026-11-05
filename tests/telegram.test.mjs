import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function portFree(){return new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function runScenario({mock=true,token=true}={}){
 const log=[];
 const tmp=await mkdtemp(join(tmpdir(),'hub-telegram-'));
 let fake;
 if(mock){fake=http.createServer(async(req,res)=>{let data='';for await(const c of req)data+=c;const msg=JSON.parse(data);log.push({url:req.url,...msg});res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,result:{message_id:2}}));});await new Promise(r=>fake.listen(0,'127.0.0.1',r));}
 const port=await portFree();const base=`http://127.0.0.1:${port}`;
 const env={...process.env,PORT:String(port),DATA_FILE:join(tmp,'requests.json'),NODE_ENV:mock?'test':'production',RENDER:mock?'false':'true',TELEGRAM_BOT_TOKEN:token?'123456789:test-secret-token':'',TELEGRAM_CHAT_ID:token?'123321':'',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',ADMIN_KEY:'e2e-super-secret-admin-key',TELEGRAM_TEST_API_URL:mock?`http://127.0.0.1:${fake.address().port}`:''};
 const processServer=spawn(process.execPath,['server.mjs'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 let errors='';processServer.stderr.on('data',chunk=>errors+=chunk);
 for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/health');if(r.ok)break;}catch{}await sleep(60);if(i===79)throw Error(errors||'startup timeout');}
 return {base,log,stop:async()=>{processServer.kill();await new Promise(r=>processServer.once('exit',r));if(fake)await new Promise(r=>fake.close(r));await rm(tmp,{recursive:true,force:true});}};
}
async function post(base,path,data){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return{status:r.status,data:await r.json()};}
test('Telegram integration: order, freelancer application, and inquiry all notify the owner',async()=>{
 const testHost=await runScenario();
 try{
  const order=await post(testHost.base,'/api/orders',{serviceId:'landing',name:'Anvar',contact:'@anvar01',email:'anvar@example.com',details:'Menga onlayn magazin uchun zamonaviy landing sahifasi kerak.'});
  assert.equal(order.status,201);assert.equal(order.data.telegramSent,true);
  const partner=await post(testHost.base,'/api/partners',{name:'Madina',contact:'@design_01',specialization:'uiux',details:'UI UX dizayn bo‘yicha hamkorlik qilishni xohlayman.'});
  assert.equal(partner.status,201);assert.equal(partner.data.telegramSent,true);
  const inquiry=await post(testHost.base,'/api/inquiries',{name:'Shahzoda',contact:'@shahzoda_test',topic:'pricing',details:'Bitta biznes sayti qancha turishini bilmoqchi edim.'});
  assert.equal(inquiry.status,201);assert.equal(inquiry.data.telegramSent,true);
  assert.equal(testHost.log.length,3);
  assert.ok(testHost.log[0].text.includes('YANGI BUYURTMA'));
  assert.ok(testHost.log[0].text.includes('Anvar'));
  assert.ok(testHost.log[0].text.includes('anvar@example.com'));
  assert.ok(testHost.log[0].text.includes('@anvar01'));
  assert.ok(testHost.log[0].text.includes('landing') || testHost.log[0].text.includes('Landing'));
  assert.ok(testHost.log[1].text.includes('FREELANCER ARIZASI'));
  assert.ok(testHost.log[1].text.includes('@design_01'));
  assert.ok(testHost.log[2].text.includes('YANGI MUROJAAT'));
  assert.ok(testHost.log[2].text.includes('Narxlarni bilmoqchi'));
  assert.ok(testHost.log.every(x=>x.chat_id==='123321' && x.url.includes('/sendMessage')));
  const admin=await fetch(testHost.base+'/api/admin/inquiries',{headers:{Authorization:'Bearer e2e-super-secret-admin-key'}});
  const records=await admin.json();assert.equal(records.items.length,1);assert.equal(records.items[0].name,'Shahzoda');
 }finally{await testHost.stop();}
});
test('invalid general inquiries rejected; production refuses to accept when Telegram is not configured',async()=>{
 const host=await runScenario({mock:false,token:false});
 try{
  const valid={name:'Mijoz',contact:'@mijoz_234',details:'Menga shu platformadagi xizmatlar haqida batafsilroq ma’lumot bering.',topic:'other'};
  const invalid=await post(host.base,'/api/inquiries',{...valid,topic:'hacker'});assert.equal(invalid.status,400);
  const response=await post(host.base,'/api/inquiries',valid);assert.equal(response.status,503);assert.ok(response.data.error.includes('Telegram'));
 }finally{await host.stop();}
});

test('Order with invalid optional email is rejected and never triggers bot message',async()=>{
 const host=await runScenario();
 try{
  const order=await post(host.base,'/api/orders',{serviceId:'online-market',name:'Test',contact:'@testname',email:'x@invalid',details:'Menga qimmatbaho internet magazin kerak.'});
  assert.equal(order.status,400);
  assert.equal(host.log.length,0);
 }finally{await host.stop();}
});
