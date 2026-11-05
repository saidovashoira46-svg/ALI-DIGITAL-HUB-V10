import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const services=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8'));

test('20 locally bundled previews, one for every catalogue item',()=>{
 assert.equal(services.length,20);
 const visuals=new Set();
 for(const service of services){
  assert.ok(service.visual,service.id);
  visuals.add(service.visual);
  const img=path.join(dir,'assets','previews',service.visual+'.webp');
  assert.ok(fs.existsSync(img),img);
  assert.ok(fs.statSync(img).size>10000,img);
 }
 assert.equal(visuals.size,20,'every service requires its own visual');
});
test('no remote photo requests, stale stock photos or old service stickers in active UI',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.doesNotMatch(html+app,/images\.unsplash\.com/);
 assert.doesNotMatch(html+app,/assets\/[^"']+-card\.svg/);
 assert.match(html,/assets\/previews\/market\.webp/);
 assert.match(html,/assets\/previews\/cinema\.webp/);
 assert.match(html,/assets\/previews\/portfolio\.webp/);
 assert.match(app,/assets\/previews\/telegram\.webp/);
});
