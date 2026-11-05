import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,timingSafeEqual} from 'node:crypto';

const root=path.dirname(fileURLToPath(import.meta.url));
async function loadEnv(){try{const raw=await fs.readFile(path.join(root,'.env'),'utf8');for(const line of raw.split(/\r?\n/)){const x=line.trim();if(!x||x.startsWith('#'))continue;const i=x.indexOf('=');if(i<=0)continue;const key=x.slice(0,i).trim();let value=x.slice(i+1).trim();if(/^['"].*['"]$/.test(value))value=value.slice(1,-1);if(/^[A-Z_][A-Z0-9_]*$/.test(key)&&process.env[key]===undefined)process.env[key]=value;}}catch(e){if(e.code!=='ENOENT')throw e;}}
await loadEnv();
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
const byId=new Map(catalog.map(item=>[item.id,item]));
const PORT=Number(process.env.PORT||3000);
const supabaseUrl=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const telegramToken=process.env.TELEGRAM_BOT_TOKEN||'';
const telegramChatId=process.env.TELEGRAM_CHAT_ID||'';
// Mahalliy avtomatik testlar uchun soxta Telegram API; productionda faqat rasmiy API.
const telegramApiBase=(process.env.NODE_ENV==='test' && /^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.TELEGRAM_TEST_API_URL||''))?process.env.TELEGRAM_TEST_API_URL:'https://api.telegram.org';
const adminKey=process.env.ADMIN_KEY||'';
const isProduction=process.env.NODE_ENV==='production'||process.env.RENDER==='true';
const useSupabase=Boolean(supabaseUrl&&supabaseKey);
const useTelegram=Boolean(telegramToken&&telegramChatId);
const dataFile=path.resolve(process.env.DATA_FILE||path.join(root,'data','requests.json'));
let writeQueue=Promise.resolve();
const ratelimit=new Map();
const MIMES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'};
function send(res,status,obj,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj));}
function ip(req){return req.socket.remoteAddress||'unknown';}
function isLimited(req){const key=ip(req),now=Date.now();const arr=(ratelimit.get(key)||[]).filter(v=>now-v<60000);arr.push(now);ratelimit.set(key,arr);return arr.length>12;}
function checkOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{const u=new URL(origin);return u.host===req.headers.host;}catch{return false;}}
async function body(req){const max=7000;let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw Object.assign(Error('So‘rov juda katta.'),{code:413});chunks.push(chunk);}try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw Object.assign(Error('JSON formati noto‘g‘ri.'),{code:400});}}
function validStr(x,min,max){return typeof x==='string'&&x.trim().length>=min&&x.trim().length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);}
async function readLocal(){try{return JSON.parse(await fs.readFile(dataFile,'utf8'));}catch(e){if(e.code==='ENOENT')return{orders:[],partners:[],inquiries:[]};throw e;}}
async function saveLocal(collection,item){const work=writeQueue.then(async()=>{const db=await readLocal();(db[collection]??=[]).push(item);await fs.mkdir(path.dirname(dataFile),{recursive:true});const tmp=dataFile+'.'+randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(db,null,2),'utf8');await fs.rename(tmp,dataFile);});writeQueue=work.catch(()=>{});await work;}
function sbHeaders(){return{'apikey':supabaseKey,'Authorization':'Bearer '+supabaseKey,'Content-Type':'application/json','Prefer':'return=representation'};}
async function supabaseQuery(table,method,payload,query=''){
 const controller=new AbortController();const tm=setTimeout(()=>controller.abort(),8500);
 try{const response=await fetch(`${supabaseUrl}/rest/v1/${table}${query}`,{method,headers:sbHeaders(),body:payload===undefined?undefined:JSON.stringify(payload),signal:controller.signal});const text=await response.text();if(!response.ok)throw Error(`Database HTTP ${response.status}: ${text.slice(0,150)}`);return text?JSON.parse(text):[];}finally{clearTimeout(tm);}
}
function telegramText(item,kind){
 const service=byId.get(item.service_id);
 const headings={orders:'🛍 YANGI BUYURTMA',partners:'🤝 FREELANCER ARIZASI',inquiries:'✉️ SAYTDAN YANGI MUROJAAT'};
 const topics={website:'Web-sayt kerak',pricing:'Narxlarni bilmoqchi',buy:'Xizmat sotib olmoqchi',partner:'Hamkorlik bo‘yicha savol',other:'Boshqa savol'};
 const lines=[headings[kind]+' — ALI DIGITAL HUB',`№ ${item.id}`,`Sana: ${item.created_at}`,`Ism: ${item.name}`,`Aloqa: ${item.contact}`];
 if(kind==='orders')lines.push(`Xizmat: ${service?.title||item.service_id}`,`Boshlang‘ich narx: ${service?.price.toLocaleString('ru-RU')||'Kelishiladi'} so‘m`, `Mijoz emaili: ${item.email||'ko‘rsatilmagan'}`);
 if(kind==='partners')lines.push(`Yo‘nalish: ${item.specialization}`);
 if(kind==='inquiries')lines.push(`Mavzu: ${topics[item.topic]||item.topic}`);
 lines.push(`Tafsilot: ${item.details}`, '', 'Javob berish uchun yuqoridagi mijoz aloqasidan foydalaning.');
 return lines.join('\n').slice(0,4000);
}
async function sendTelegram(item,kind){
 if(!useTelegram)return false;
 const content=telegramText(item,kind);
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController();const tm=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch(`${telegramApiBase}/bot${telegramToken}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:telegramChatId,text:content,disable_web_page_preview:true}),signal:controller.signal});
   const result=await response.json();
   if(response.ok&&result.ok)return true;
   console.warn('Telegram HTTP xato',response.status,'(token logga yozilmaydi)');
   if(response.status<500&&response.status!==429)return false;
  }catch(e){console.warn('Telegram tarmoqqa ulanmadi:',e.message);}
  finally{clearTimeout(tm);}
  if(attempt===0)await new Promise(resolve=>setTimeout(resolve,500));
 }
 return false;
}
async function createRequest(req,res,kind){
 if(!checkOrigin(req))return send(res,403,{error:'Noto‘g‘ri sayt manzili.'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{error:'JSON yuboring.'});
 if(isLimited(req))return send(res,429,{error:'Juda ko‘p so‘rov. Birozdan keyin qayta urinib ko‘ring.'});
 let data;try{data=await body(req);}catch(e){return send(res,e.code||400,{error:e.message});}
 if(data.website)return send(res,400,{error:'So‘rov qabul qilinmadi.'});
 if(!validStr(data.name,2,90)||!validStr(data.contact,4,120)||!validStr(data.details,10,1800))return send(res,400,{error:'Ism, aloqa yoki loyiha tafsilotlarini to‘g‘ri to‘ldiring.'});
 if(kind==='orders'&&data.email!=null&&data.email!==''&&(typeof data.email!=='string'||data.email.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())))return send(res,400,{error:'Email manzilini to‘g‘ri kiriting.'});
 if(kind==='orders'&&!byId.has(data.serviceId))return send(res,400,{error:'Xizmatni to‘g‘ri tanlang.'});
 if(kind==='partners'&&!['frontend','backend','uiux','branding'].includes(data.specialization))return send(res,400,{error:'Yo‘nalishni to‘g‘ri tanlang.'});
 if(kind==='inquiries'&&!['website','pricing','buy','partner','other'].includes(data.topic))return send(res,400,{error:'Murojaat mavzusini tanlang.'});
 if(isProduction&&!useTelegram)return send(res,503,{error:'Telegram xabarnomalari hali sozlanmagan. @dnyrv_001 ga to‘g‘ridan-to‘g‘ri yozing.'});
 const item={id:randomUUID().slice(0,12).toUpperCase(),name:data.name.trim(),contact:data.contact.trim(),details:data.details.trim(),created_at:new Date().toISOString(),status:'new'};
 if(kind==='orders'){item.service_id=data.serviceId;item.email=(data.email||'').trim();}else if(kind==='partners')item.specialization=data.specialization;else item.topic=data.topic;
 let storage='local';let telegramSent=false;
 try{
   if(useSupabase){const row={...item};if(kind==='orders')delete row.email; /* Legacy Supabase schema compatibility; optional email still goes to Telegram. */ const inserted=await supabaseQuery(kind,'POST',row);if(inserted?.[0]?.id)item.id=inserted[0].id;storage='supabase';}
   else if(!isProduction){await saveLocal(kind,item);}else{storage='telegram';}
   telegramSent=await sendTelegram(item,kind);
   if(storage==='telegram'&&!telegramSent)return send(res,503,{error:'Telegramga xabar yuborilmadi. @dnyrv_001 ga bevosita yozing.'});
   // Bazaga yozilgan, ammo Telegram ishlamasa, buni mijozga ochiq bildiramiz.
   if(isProduction&&!telegramSent)return send(res,202,{ok:true,id:item.id,storage,telegramSent:false,warning:'So‘rov bazaga saqlandi, lekin Telegramga yetib bormadi. Iltimos, Telegramdan ham yozing.'});
   send(res,201,{ok:true,id:item.id,storage,telegramSent});
 }catch(e){console.error('So‘rovni saqlash xatosi:',e.message);send(res,503,{error:'So‘rovni saqlash vaqtincha ishlamayapti. Telegramdan yozing.'});}
}
function authorized(req){if(!adminKey)return false;const provided=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const a=Buffer.from(provided),b=Buffer.from(adminKey);return a.length===b.length&&timingSafeEqual(a,b);}
async function getAdmin(req,res,kind){if(!authorized(req))return send(res,401,{error:'Admin paroli noto‘g‘ri.'});try{if(useSupabase){const rows=await supabaseQuery(kind,'GET',undefined,'?select=*&order=created_at.desc&limit=200');return send(res,200,{items:rows});}if(isProduction)return send(res,503,{error:'Buyurtmalar ro‘yxati uchun Supabase talab qilinadi.'});const db=await readLocal();send(res,200,{items:(db[kind]||[]).slice().reverse()});}catch(e){console.error('Admin list xato:',e.message);send(res,503,{error:'Bazaga ulanib bo‘lmadi.'});}}
async function patchAdmin(req,res,orderId){if(!authorized(req))return send(res,401,{error:'Admin paroli noto‘g‘ri.'});let data;try{data=await body(req);}catch(e){return send(res,e.code||400,{error:e.message});}if(!['new','in_progress','done','cancelled'].includes(data.status))return send(res,400,{error:'Holat noto‘g‘ri.'});try{if(useSupabase){const rows=await supabaseQuery('orders','PATCH',{status:data.status},`?id=eq.${encodeURIComponent(orderId)}`);if(!rows.length)return send(res,404,{error:'Buyurtma topilmadi.'});}else{if(isProduction)return send(res,503,{error:'Supabase sozlanmagan.'});const work=writeQueue.then(async()=>{const db=await readLocal();const found=db.orders.find(x=>x.id===orderId);if(!found)return false;found.status=data.status;await fs.writeFile(dataFile,JSON.stringify(db,null,2));return true;});writeQueue=work.catch(()=>{});if(!await work)return send(res,404,{error:'Buyurtma topilmadi.'});}return send(res,200,{ok:true});}catch(e){console.error('Update xato:',e.message);return send(res,503,{error:'Holatni saqlab bo‘lmadi.'});}}
async function staticFile(req,res,urlPath){
 let decoded;try{decoded=decodeURIComponent(urlPath);}catch{return send(res,400,{error:'Manzil noto‘g‘ri.'});}
 if(decoded==='/'||decoded==='')decoded='/index.html';
 if(decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').some(x=>x==='..')||decoded.startsWith('/data/')||decoded.startsWith('/tests/')||decoded.startsWith('/.'))return send(res,404,{error:'Topilmadi.'});
 const loc=path.resolve(root,'.'+decoded);
 if(!loc.startsWith(root+path.sep))return send(res,404,{error:'Topilmadi.'});
 const ext=path.extname(loc).toLowerCase();if(!MIMES[ext]||loc.endsWith('catalog.json'))return send(res,404,{error:'Topilmadi.'});
 try{const stat=await fs.stat(loc);if(!stat.isFile())return send(res,404,{error:'Topilmadi.'});const data=await fs.readFile(loc);res.writeHead(200,{'Content-Type':MIMES[ext], 'Cache-Control':ext==='.html'||ext==='.js'||ext==='.css'?'no-store':'public, max-age=3600','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:data);}catch(e){send(res,e.code==='ENOENT'?404:500,{error:'Fayl topilmadi.'});}
}
const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);const p=url.pathname;
 if(req.method==='GET'&&p==='/api/health')return send(res,200,{ok:true,storage:useSupabase?'supabase':isProduction?'telegram-only':'local',telegramConfigured:useTelegram});
 if(req.method==='GET'&&p==='/api/services')return send(res,200,catalog);
 if(req.method==='POST'&&p==='/api/orders')return createRequest(req,res,'orders');
 if(req.method==='POST'&&p==='/api/partners')return createRequest(req,res,'partners');
 if(req.method==='POST'&&p==='/api/inquiries')return createRequest(req,res,'inquiries');
 if(req.method==='GET'&&p==='/api/admin/orders')return getAdmin(req,res,'orders');
 if(req.method==='GET'&&p==='/api/admin/partners')return getAdmin(req,res,'partners');
 if(req.method==='GET'&&p==='/api/admin/inquiries')return getAdmin(req,res,'inquiries');
 if(req.method==='PATCH'&&/^\/api\/admin\/orders\/[A-Za-z0-9-]+$/.test(p))return patchAdmin(req,res,p.split('/').at(-1));
 if(p.startsWith('/api/'))return send(res,404,{error:'API topilmadi.'});
 if(req.method==='GET'||req.method==='HEAD')return staticFile(req,res,p);
 return send(res,405,{error:'Metodga ruxsat yo‘q.'});
 }catch(e){console.error('Server xatosi:',e);if(!res.headersSent)send(res,500,{error:'Ichki server xatosi.'});}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`ALI DIGITAL HUB V10 http://localhost:${PORT} | storage=${useSupabase?'supabase':'local'} | telegram=${useTelegram?'ready':'not configured'}`));
