import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
let server,tmp,base;
async function portAvailable(){return await new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});s.on('error',reject);});}
async function fetchJson(url,options){const r=await fetch(base+url,options);return{status:r.status,body:await r.json()};}
const jsonBody=data=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
before(async()=>{tmp=await mkdtemp(join(tmpdir(),'ali-test-'));const port=await portAvailable();base=`http://127.0.0.1:${port}`;server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),DATA_FILE:join(tmp,'data.json'),ADMIN_KEY:'strong-private-test-admin-password',NODE_ENV:'test',RENDER:'false',TELEGRAM_BOT_TOKEN:'',TELEGRAM_CHAT_ID:'',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']});let err='';server.stderr.on('data',d=>err+=d);for(let i=0;i<75;i++){if(server.exitCode!==null)throw Error('Server failed: '+err);try{const r=await fetch(base+'/api/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,60));}throw Error('Server start timed out: '+err);});
after(async()=>{if(server){server.kill();await new Promise(r=>server.once('exit',r));}if(tmp)await rm(tmp,{recursive:true,force:true});});
test('homepage, images, admin and script are accessible',async()=>{for(const p of ['/', '/styles.css','/app.js','/admin.html','/assets/hero-v9.webp']){const r=await fetch(base+p);assert.equal(r.status,200,p);assert.ok((await r.arrayBuffer()).byteLength>100,p);}assert.equal((await fetchJson('/api/health')).body.ok,true);});
test('service catalog has 20 unique offerings, including new platform types',async()=>{const {status,body}=await fetchJson('/api/services');assert.equal(status,200);assert.equal(body.length,20);assert.equal(new Set(body.map(item=>item.id)).size,20);assert.ok(body.every(item=>item.price>=100000));for(const id of ['online-market','cinema','booking','education','mobile','agent'])assert.ok(body.some(item=>item.id===id),id);});
test('invalid requests are rejected',async()=>{const payload={serviceId:'landing',name:'A',contact:'@m',details:'short'};assert.equal((await fetchJson('/api/orders',jsonBody(payload))).status,400);const wrong={serviceId:'not-real',name:'Mijoz',contact:'@mijoz_123',details:'Menga yaxshi biznes web sayt yasash kerak'};assert.equal((await fetchJson('/api/orders',jsonBody(wrong))).status,400);assert.equal((await fetchJson('/api/orders',jsonBody({...wrong,serviceId:'landing',website:'robot'}))).status,400);});
test('order persists, private admin auth and order status update work',async()=>{const payload={serviceId:'business',name:'Test Mijoz',contact:'@testmijoz',details:'O‘z biznesim uchun bir nechta sahifali premium sayt kerak'};const create=await fetchJson('/api/orders',jsonBody(payload));assert.equal(create.status,201);assert.equal(create.body.storage,'local');assert.equal(create.body.telegramSent,false);assert.ok(create.body.id);assert.equal((await fetchJson('/api/admin/orders')).status,401);const headers={'Authorization':'Bearer strong-private-test-admin-password'};let list=await fetchJson('/api/admin/orders',{headers});assert.equal(list.status,200);assert.equal(list.body.items[0].contact,payload.contact);let update=await fetchJson('/api/admin/orders/'+create.body.id,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({status:'done'})});assert.equal(update.status,200);list=await fetchJson('/api/admin/orders',{headers});assert.equal(list.body.items[0].status,'done');const onDisk=JSON.parse(await readFile(join(tmp,'data.json'),'utf8'));assert.equal(onDisk.orders.length,1);});
test('new cinema and online-market services can be ordered',async()=>{for(const serviceId of ['cinema','online-market']){const data={serviceId,name:'Yangi Mijoz',contact:'@yangi_mijoz',details:'Menga professional yangi platforma tayyorlash kerak'};const result=await fetchJson('/api/orders',jsonBody(data));assert.equal(result.status,201,serviceId);}});
test('freelancer partnership request gets stored',async()=>{const p={name:'Freelancer Test',contact:'@freetest',specialization:'frontend',details:'Vue va JavaScript orqali saytlar yasayman; portfolio example.com'};const created=await fetchJson('/api/partners',jsonBody(p));assert.equal(created.status,201);const list=await fetchJson('/api/admin/partners',{headers:{'Authorization':'Bearer strong-private-test-admin-password'}});assert.equal(list.status,200);assert.equal(list.body.items[0].specialization,'frontend');});
test('private static files and traversal attacks are blocked',async()=>{for(const url of ['/data/requests.json','/.env.example','/server.mjs','/tests/server.test.mjs','/catalog.json']){const r=await fetch(base+url);assert.equal(r.status,404,url);}const r=await fetch(base+'/api/no-such-route');assert.equal(r.status,404);});

test('V10 owner phone, Telegram and Gmail are visible; contact form includes optional client email',async()=>{
 const html=await (await fetch(base+'/')).text();
 assert.ok(html.includes('tel:+998776882012'));
 assert.ok(html.includes('https://t.me/dnyrv_001'));
 assert.ok(html.includes('muhammadalidonyorov2012@gmail.com'));
 assert.ok(html.includes('name="email" type="email"'));
 const style=await fetch(base+'/v10-contact.css');assert.equal(style.status,200);
});
