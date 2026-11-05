import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
try{
 const raw=await fs.readFile(path.join(root,'.env'),'utf8');
 for(const line of raw.split(/\r?\n/)){
  const s=line.trim();if(!s||s.startsWith('#'))continue;
  const i=s.indexOf('=');if(i<0)continue;
  const key=s.slice(0,i).trim();let value=s.slice(i+1).trim().replace(/^(["'])(.*)\1$/,'$2');
  if(/^[A-Z_]+$/.test(key)&&process.env[key]===undefined)process.env[key]=value;
 }
}catch{}
const token=process.env.TELEGRAM_BOT_TOKEN?.trim();
if(!/^\d+:[\w-]{20,}$/.test(token||'')){
 console.error('Xato: .env fayliga BotFather bergan TELEGRAM_BOT_TOKEN ni kiriting. Tokenni boshqalarga yubormang.');
 process.exit(1);
}
async function api(method,data){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{
 const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:controller.signal});
 const obj=await r.json();if(!r.ok||!obj.ok)throw new Error(`Telegram: ${obj.description||'so‘rov bajarilmadi'}`);return obj.result;
 }finally{clearTimeout(timer);}
}
try{
 if(process.argv.includes('--chatid')){
  const updates=await api('getUpdates',{limit:100,timeout:0});
  const chats=[...new Map(updates.map(u=>u.message?.chat).filter(c=>c?.type==='private').map(c=>[c.id,c])).values()];
  if(!chats.length)console.log('Shaxsiy chat ID topilmadi. Telegramda o‘z yangi botingizga /start yuboring va shu buyruqni qayta yozing.');
  else{console.log('Botga yozgan shaxsiy chatlar (o‘zingiznikini tanlang):');for(const c of chats)console.log(`${c.first_name||'User'} ${c.username?'@'+c.username:''}: TELEGRAM_CHAT_ID=${c.id}`);}
 }else{
  const chatId=process.env.TELEGRAM_CHAT_ID?.trim();
  if(!chatId){console.error('Xato: .env ga TELEGRAM_CHAT_ID kiriting. Avval npm run telegram:chatid buyrug‘idan foydalaning.');process.exitCode=1;}
  else{await api('sendMessage',{chat_id:chatId,text:'✅ ALI DIGITAL HUB: Telegram xabarnomalari ishlayapti! Endi yangi buyurtma, freelancer arizasi va savollar shu chatga keladi.'});console.log('✅ Test xabari Telegramga yuborildi!');}
 }
}catch(e){console.error('Telegram ulanmadi:',e.message);process.exitCode=1;}
