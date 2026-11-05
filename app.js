'use strict';
// ALI DIGITAL HUB V9. Backend routes and Telegram notification flow retained.
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const telegramUrl='https://t.me/dnyrv_001';
const currency=n=>new Intl.NumberFormat('ru-RU').format(n).replace(/\u00a0/g,' ');
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tones=['sage','lavender','coral','blue','yellow','pink','dark'];
let services=[];
let currentFilter='all';
let activeOverlay=null;
let lastFocus=null;
function safeVisual(v){return /^[a-z]+$/.test(v||'')?v:'landing';}
// Real-photo catalogue mapped to each service title. Remote photos are used first, local assets remain as offline fallbacks.
// V9 previews: real browser UI concept captures, bundled locally; no third-party image requests.
const photoCatalog={
 landing:{src:'assets/previews/landing.webp',fallback:'assets/previews/landing.webp',alt:'Landing Page sayt maketi'},
 business:{src:'assets/previews/business.webp',fallback:'assets/previews/business.webp',alt:'Biznes sayti bosh sahifa maketi'},
 market:{src:'assets/previews/market.webp',fallback:'assets/previews/market.webp',alt:'Online Market mahsulotlar sahifasi'},
 cinema:{src:'assets/previews/cinema.webp',fallback:'assets/previews/cinema.webp',alt:'Cinephile kino katalogi sahifasi'},
 booking:{src:'assets/previews/booking.webp',fallback:'assets/previews/booking.webp',alt:'Online bron qilish tizimi'},
 restaurant:{src:'assets/previews/restaurant.webp',fallback:'assets/previews/restaurant.webp',alt:'Restoran buyurtma sahifasi'},
 education:{src:'assets/previews/education.webp',fallback:'assets/previews/education.webp',alt:'Online ta’lim kurslar platformasi'},
 realestate:{src:'assets/previews/realestate.webp',fallback:'assets/previews/realestate.webp',alt:'Ko‘chmas mulk katalogi sayti'},
 hotel:{src:'assets/previews/hotel.webp',fallback:'assets/previews/hotel.webp',alt:'Mehmonxona rezervatsiya sayti'},
 clinic:{src:'assets/previews/clinic.webp',fallback:'assets/previews/clinic.webp',alt:'Klinika qabulga yozilish sayti'},
 barber:{src:'assets/previews/barber.webp',fallback:'assets/previews/barber.webp',alt:'Barbershop bron sayti'},
 event:{src:'assets/previews/event.webp',fallback:'assets/previews/event.webp',alt:'Tadbir chipta sayti'},
 saas:{src:'assets/previews/saas.webp',fallback:'assets/previews/saas.webp',alt:'SaaS boshqaruv paneli'},
 dashboard:{src:'assets/previews/dashboard.webp',fallback:'assets/previews/dashboard.webp',alt:'Admin Dashboard grafik va statistika'},
 mobile:{src:'assets/previews/mobile.webp',fallback:'assets/previews/mobile.webp',alt:'Flutter mobil ilova ekrani'},
 telegram:{src:'assets/previews/telegram.webp',fallback:'assets/previews/telegram.webp',alt:'Telegram Bot logosi va chat oynasi'},
 agent:{src:'assets/previews/agent.webp',fallback:'assets/previews/agent.webp',alt:'AI Agent chat interfeysi'},
 uiux:{src:'assets/previews/uiux.webp',fallback:'assets/previews/uiux.webp',alt:'UI UX dizayn maketi'},
 branding:{src:'assets/previews/branding.webp',fallback:'assets/previews/branding.webp',alt:'Branding va logo guideline maketi'},
 portfolio:{src:'assets/previews/portfolio.webp',fallback:'assets/previews/portfolio.webp',alt:'Shaxsiy portfolio sayti ko‘rinishi'}
};
function getPhoto(visual){return photoCatalog[safeVisual(visual)]||photoCatalog.landing;}
function serviceCard(s,index){
  const photo=getPhoto(s.visual);
  return `<article class="service-card"><div class="service-visual photo-service" style="background-image:url('${photo.fallback}');background-size:cover;background-position:center"><img class="service-photo" src="${photo.src}" data-fallback="${photo.fallback}" onerror="this.onerror=null;this.src=this.dataset.fallback" loading="lazy" alt="${escapeHtml(photo.alt)}"><div class="service-image-shade"></div><span class="service-overline">${escapeHtml(s.categoryLabel)}</span><span class="service-count">${String(index+1).padStart(2,'0')} / 20</span></div><div class="service-info"><div class="service-meta"><span>${escapeHtml(s.categoryLabel)}</span><small>${escapeHtml(s.tag||'Individual')}</small></div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description)}</p><div class="service-bottom"><div class="service-price"><small>BOSHLANG‘ICH NARX</small><strong>${currency(s.price)} <span>so‘m</span></strong></div><div class="service-actions"><button type="button" class="js-service-info" data-service="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.title)} haqida batafsil">＋</button><button type="button" class="service-buy js-open-order" data-service="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.title)} buyurtma qilish">↗</button></div></div></div></article>`;
}
function renderServices(){
  const search=$('#serviceSearch').value.toLocaleLowerCase('uz').trim();
  const matches=services.filter(s=>(currentFilter==='all'||s.category===currentFilter)&&`${s.title} ${s.categoryLabel} ${s.description} ${s.tag} ${(s.features||[]).join(' ')}`.toLocaleLowerCase('uz').includes(search));
  $('#servicesGrid').innerHTML=matches.map(s=>serviceCard(s,services.indexOf(s))).join('');
  $('#emptyServices').hidden=matches.length!==0;
  $('#resultCount').textContent=`${matches.length} ta xizmat`;
}
function fillSelects(){
  const opts=services.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)} — ${currency(s.price)} so‘mdan</option>`).join('');
  $('#orderService').innerHTML=opts;
  $('#calcService').innerHTML=opts;
  document.querySelectorAll('[data-price-id]').forEach(el=>{const selected=services.find(s=>s.id===el.dataset.priceId);el.textContent=selected?currency(selected.price)+' so‘mdan':'Narx kelishiladi';});
  updateEstimate();
}
function updateEstimate(){
  const selected=services.find(s=>s.id===$('#calcService').value);
  const addOns=$$('.calc-option:checked').reduce((sum,c)=>sum+Number(c.value),0);
  $('#calcTotal').textContent=selected?currency(selected.price+addOns):'—';
}
function activateOverlay(element){
  if(activeOverlay)closeOverlay(false);
  lastFocus=document.activeElement;
  element.hidden=false;
  activeOverlay=element;
  document.body.classList.add('modal-open');
  const first=$('input:not([tabindex="-1"]),select,button',element);
  first?.focus();
}
function closeOverlay(restore=true){
  if(activeOverlay){activeOverlay.hidden=true;activeOverlay=null;document.body.classList.remove('modal-open');}
  if(restore&&lastFocus?.isConnected)lastFocus.focus();
}
function openOrder(id,details=''){
  const feedback=$('#orderFeedback');feedback.hidden=true;feedback.replaceChildren();feedback.classList.remove('error');
  if(services.some(s=>s.id===id))$('#orderService').value=id;
  if(details)$('#orderForm [name="details"]').value=details;
  activateOverlay($('#orderModal'));
}
function openForm(kind){
  const id=kind==='partner'?'partnerModal':'inquiryModal';
  const feedback=kind==='partner'?'partnerFeedback':'inquiryFeedback';
  $('#'+feedback).hidden=true;$('#'+feedback).replaceChildren();
  activateOverlay($('#'+id));
}
function openDetail(id){
  const s=services.find(item=>item.id===id);if(!s)return;
  const overlay=document.createElement('div');overlay.className='detail-panel';overlay.id='detailPanel';overlay.setAttribute('role','presentation');
  overlay.innerHTML=`<aside class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawerHeading"><button class="drawer-close" type="button" data-close-modal aria-label="Oynani yopish">×</button><div class="drawer-tag">${escapeHtml(s.categoryLabel)} / ${escapeHtml(s.tag||'XIZMAT')}</div><h2 id="drawerHeading">${escapeHtml(s.title)}</h2><p>${escapeHtml(s.description)}</p><div class="drawer-visual" aria-hidden="true"><img class="drawer-photo" src="${escapeHtml(getPhoto(s.visual).src)}" data-fallback="${escapeHtml(getPhoto(s.visual).fallback)}" onerror="this.onerror=null;this.src=this.dataset.fallback" alt="${escapeHtml(getPhoto(s.visual).alt)}" loading="lazy"/><div class="drawer-visual-shade"></div><div class="drawer-visual-label">${escapeHtml(s.title)}</div></div><div class="drawer-list-heading">Loyiha nimalarni o‘z ichiga olishi mumkin?</div><ul class="drawer-list">${(s.features||[]).map(feature=>`<li>${escapeHtml(feature)}</li>`).join('')}</ul><div class="drawer-price"><small>Taxminiy boshlang‘ich narx</small><strong>${currency(s.price)} so‘m</strong></div><button class="btn btn-dark btn-block js-open-order" data-service="${escapeHtml(s.id)}">Bu xizmatni buyurtma qilish ↗</button><p><small>Yakuniy imkoniyatlar va narx suhbatda kelishiladi.</small></p></aside>`;
  document.body.append(overlay);
  activateOverlay(overlay);
  $('.drawer-close',overlay).focus();
}
function showFeedback(el,message,isError=false,shareText=''){
  el.hidden=false;el.classList.toggle('error',isError);el.replaceChildren();
  const t=document.createElement('div');t.textContent=message;el.append(t);
  if(shareText){
    const actions=document.createElement('div');actions.className='feedback-buttons';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Matnni nusxalash';
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(shareText);copy.textContent='Nusxalandi ✓';}catch{const temp=document.createElement('textarea');temp.value=shareText;document.body.append(temp);temp.select();try{document.execCommand('copy');copy.textContent='Nusxalandi ✓';}catch{copy.textContent='Nusxalanmadi';}temp.remove();}});
    const tg=document.createElement('a');tg.href=telegramUrl+'?text='+encodeURIComponent(shareText.slice(0,600));tg.target='_blank';tg.rel='noopener noreferrer';tg.textContent='Telegramda yuborish ↗';
    actions.append(copy,tg);el.append(actions);
  }
}
async function sendForm(form,kind){
  if(!form.reportValidity())return;
  const fields=Object.fromEntries(new FormData(form));
  const submit=$('button[type="submit"]',form);
  const feedback=$('#'+({order:'orderFeedback',partner:'partnerFeedback',inquiry:'inquiryFeedback'}[kind]));
  const common={name:fields.name.trim(),contact:fields.contact.trim(),details:fields.details.trim(),website:fields.website||''};
  const payload=kind==='order'?{...common,serviceId:fields.service,email:(fields.email||'').trim()}:kind==='partner'?{...common,specialization:fields.specialization}:{...common,topic:fields.topic};
  const selected=services.find(s=>s.id===fields.service);
  const shareText=kind==='order'?`ALI DIGITAL HUB — YANGI BUYURTMA\nXizmat: ${selected?.title||payload.serviceId}\nIsm: ${payload.name}\nAloqa: ${payload.contact}\nEmail: ${payload.email||'ko‘rsatilmagan'}\nTafsilot: ${payload.details}`:kind==='partner'?`ALI DIGITAL HUB — HAMKORLIK ARIZASI\nIsm: ${payload.name}\nAloqa: ${payload.contact}\nYo‘nalish: ${payload.specialization}\nPortfolio: ${payload.details}`:`ALI DIGITAL HUB — MUROJAAT\nMavzu: ${payload.topic}\nIsm: ${payload.name}\nAloqa: ${payload.contact}\nXabar: ${payload.details}`;
  const label=submit.textContent;submit.disabled=true;submit.textContent='Yuborilmoqda...';feedback.hidden=true;
  try{
    const endpoint=kind==='order'?'/api/orders':kind==='partner'?'/api/partners':'/api/inquiries';
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'Server bilan aloqa uzildi.');
    let text=`So‘rov №${data.id}. `;
    if(data.warning) text+=data.warning;
    else if(data.telegramSent)text+='Bazaga saqlandi va xabar Telegramga yuborildi. Siz bilan bog‘lanishimizni kuting.';
    else text+='Bazaga saqlandi, ammo Telegramga yetkazilgani tasdiqlanmadi. Telegram orqali ham yozishingiz mumkin.';
    showFeedback(feedback,text,Boolean(data.warning),data.telegramSent?'':shareText);
    form.reset();if(kind==='order'&&services.length)$('#orderService').value=services[0].id;
  }catch(error){showFeedback(feedback,`So‘rov serverga yuborilmadi: ${error.message} Quyidagi havola orqali Telegramdan yozing.`,true,shareText);}
  finally{submit.disabled=false;submit.textContent=label;}
}
function closeDetailIfPresent(){const detail=$('#detailPanel');if(detail){detail.remove();if(activeOverlay===detail){activeOverlay=null;document.body.classList.remove('modal-open');}}}
function initEvents(){
  $$('.filter').forEach(button=>button.addEventListener('click',()=>{currentFilter=button.dataset.filter;$$('.filter').forEach(b=>b.classList.toggle('active',b===button));renderServices();}));
  $('#serviceSearch').addEventListener('input',renderServices);
  $('#calcService').addEventListener('change',updateEstimate);
  $$('.calc-option').forEach(el=>el.addEventListener('change',updateEstimate));
  $('#calcOrder').addEventListener('click',()=>{
    const id=$('#calcService').value;
    const extras=$$('.calc-option:checked').map(el=>el.dataset.label);
    const extraLine=extras.length?`Qo‘shimcha imkoniyatlar: ${extras.join(', ')}.`:'Qo‘shimcha imkoniyatlar: tanlanmagan.';
    const details=`Narx hisoblagich bo‘yicha so‘rov. ${extraLine} Taxminiy boshlang‘ich narx: ${$('#calcTotal').textContent} so‘m. Loyiha tafsilotlarini muhokama qilmoqchiman.`;
    openOrder(id,details);
  });
  document.addEventListener('click',e=>{
    const order=e.target.closest('.js-open-order');if(order){if($('#detailPanel'))closeDetailIfPresent();openOrder(order.dataset.service||'business');return;}
    const info=e.target.closest('.js-service-info');if(info){openDetail(info.dataset.service);return;}
    if(e.target.closest('.js-open-partner')){openForm('partner');return;}
    if(e.target.closest('.js-open-inquiry')){openForm('inquiry');return;}
    if(e.target.closest('[data-close-modal]')||e.target.classList.contains('modal-overlay')||e.target.classList.contains('detail-panel')){const isDetail=activeOverlay?.id==='detailPanel';closeOverlay();if(isDetail)$('#detailPanel')?.remove();return;}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&activeOverlay){const isDetail=activeOverlay.id==='detailPanel';closeOverlay();if(isDetail)$('#detailPanel')?.remove();}
    if(e.key==='Tab'&&activeOverlay){const items=$$('button:not([disabled]),a[href],input:not([disabled]):not([tabindex="-1"]),select:not([disabled]),textarea:not([disabled])',activeOverlay).filter(el=>el.getClientRects().length);if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  $('#orderForm').addEventListener('submit',e=>{e.preventDefault();sendForm(e.currentTarget,'order');});
  $('#partnerForm').addEventListener('submit',e=>{e.preventDefault();sendForm(e.currentTarget,'partner');});
  $('#inquiryForm').addEventListener('submit',e=>{e.preventDefault();sendForm(e.currentTarget,'inquiry');});
  $('#menuToggle').addEventListener('click',()=>{const nav=$('#mobileNav');nav.hidden=!nav.hidden;$('#menuToggle').setAttribute('aria-expanded',String(!nav.hidden));});
  $$('#mobileNav a').forEach(a=>a.addEventListener('click',()=>{$('#mobileNav').hidden=true;$('#menuToggle').setAttribute('aria-expanded','false');}));
  $('#year').textContent=String(new Date().getFullYear());
}
async function init(){
  initEvents();
  try{const response=await fetch('/api/services');if(!response.ok)throw Error('Katalog ochilmadi');services=await response.json();if(!Array.isArray(services))throw Error('Katalog formati noto‘g‘ri');fillSelects();renderServices();}
  catch(error){$('#servicesGrid').innerHTML='<p>Hozir katalogni yuklab bo‘lmadi. Saytni Node.js server orqali oching yoki Telegramga yozing.</p>';$('#resultCount').textContent='Katalog vaqtincha yopiq';console.error(error);}
}
init();

// Accessibility: reduced motion and soft pointer-dependent 3D tilt.
if(window.matchMedia && window.matchMedia("(pointer:fine) and (prefers-reduced-motion:no-preference)").matches){
 const visual=document.getElementById("hero3d"); if(visual){visual.addEventListener("pointermove",(event)=>{const r=visual.getBoundingClientRect();const x=(event.clientX-r.left)/r.width-.5;const y=(event.clientY-r.top)/r.height-.5;visual.style.setProperty("--tilt-x",(-y*7).toFixed(2)+"deg");visual.style.setProperty("--tilt-y",(x*9).toFixed(2)+"deg");});visual.addEventListener("pointerleave",()=>{visual.style.setProperty("--tilt-x","0deg");visual.style.setProperty("--tilt-y","0deg");});}
}
