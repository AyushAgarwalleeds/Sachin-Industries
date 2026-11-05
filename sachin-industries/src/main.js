import {initAnalytics} from './analytics.js';
const analytics=initAnalytics();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let motionEnabled = !reduced.matches;
const motionListeners = new Set();
function setMotion(on) {
  motionEnabled = on;
  document.body.dataset.motion = on ? 'on' : 'off';
  document.querySelectorAll('[data-motion-toggle]').forEach(b => { b.textContent = on ? 'PAUSE MOTION Ⅱ' : 'ENABLE MOTION ▷'; b.setAttribute('aria-pressed', String(!on)); });
  const b=document.querySelector('#pause-machine');
  if(b){b.textContent=on?'Ⅱ':'▷';b.setAttribute('aria-pressed',String(!on));b.setAttribute('aria-label',on?'Pause all decorative animation':'Enable decorative animation');}
  motionListeners.forEach(fn=>fn(on));
  syncAmbientFilm();
}
const footer=document.querySelector('.footer-bottom');
if(footer){const b=document.createElement('button');b.className='motion-toggle';b.dataset.motionToggle='';b.addEventListener('click',()=>setMotion(!motionEnabled));footer.append(b);}
setMotion(motionEnabled);
reduced.addEventListener('change',e=>setMotion(!e.matches));
if(motionEnabled) document.body.classList.add('js-motion');
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');revealObserver.unobserve(e.target);}}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(e=>revealObserver.observe(e));

const menu=document.querySelector('.menu-toggle'),mobileNav=document.querySelector('#mobile-nav');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');mobileNav.hidden=!open;});
mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobileNav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobileNav&&!mobileNav.hidden){mobileNav.hidden=true;menu.setAttribute('aria-expanded','false');menu.focus();}});
document.querySelector('[data-print]')?.addEventListener('click',()=>{analytics.track('brochure_print');window.print();});

const dialog=document.querySelector('#enquiry-dialog'),form=document.querySelector('#enquiry-form');
document.querySelectorAll('[data-open-enquiry]').forEach(b=>b.addEventListener('click',()=>{
  if(b.dataset.service){const s=b.dataset.service==='Laser cutting'?'Laser cutting':b.dataset.service;form.elements.service.value=s;}
  dialog.showModal();
  analytics.track('enquiry_open');
}));
document.querySelector('.dialog-close')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function enquiryText(){const d=new FormData(form);return `Hello Sachin Industries,\n\nMy name is ${d.get('name')}${d.get('company')?` from ${d.get('company')}`:''}.\n\nRequired process: ${d.get('service')}\n\nProject details:\n${d.get('details')}\n\nPlease let me know the next steps. Thank you.`;}
form?.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;analytics.track('enquiry_prepared',{channel:'email',service:form.elements.service.value});const subject=encodeURIComponent(`${form.elements.service.value} enquiry — ${form.elements.name.value}`);window.location.href=`mailto:sachinindustries1660@gmail.com?subject=${subject}&body=${encodeURIComponent(enquiryText())}`;document.querySelector('#enquiry-status').textContent='Your email app has been requested. Attach your drawings there, then send. If it does not open, email sachinindustries1660@gmail.com directly or use WhatsApp.';});
document.querySelector('#enquiry-whatsapp')?.addEventListener('click',()=>{if(!form.reportValidity())return;analytics.track('enquiry_prepared',{channel:'whatsapp',service:form.elements.service.value});window.open(`https://wa.me/919422027396?text=${encodeURIComponent(enquiryText())}`,'_blank','noopener,noreferrer');document.querySelector('#enquiry-status').textContent='Your enquiry is ready in WhatsApp. Review the message and send when you are ready.';});

const machineData={
 laser:{tag:'FIBER LASER / 12 kW',number:'01 / CUT WITH INTENT',title:'A cut above.<br>At every scale.',description:'Intricate profiles. Substantial plate. Our 12 kW fiber laser brings focused power to large-format sheet metal cutting.',specs:[['LASER POWER','12 <small>kW</small>'],['MAX. THICKNESS','40 <small>mm*</small>'],['WORKING BED','8,000 × 2,500 <small>mm</small>']],link:'/laser-cutting-pune.html',linkText:'Explore laser cutting'},
 bending:{tag:'HYDRAULIC PRESS BRAKE / 8 m',number:'02 / FORM MEETS FORCE',title:'Think long.<br>Bend with purpose.',description:'Long sections and substantial plate, shaped by experienced hands. Our press brake capability turns flat sheet into strong, purposeful forms.',specs:[['MAX. THICKNESS','25 <small>mm*</small>'],['MAX. LENGTH','8,000 <small>mm*</small>'],['PROCESS','Press brake']],link:'/sheet-metal-bending-pune.html',linkText:'Explore bending'},
 shearing:{tag:'HEAVY-DUTY SHEARING / 8 m',number:'03 / STRAIGHT TO THE POINT',title:'Big sheets.<br>Straight cuts.',description:'From long strips to plate cut to size, heavy-duty shearing prepares your material for what comes next. Scale backed by everyday know-how.',specs:[['MAX. THICKNESS','25 <small>mm*</small>'],['MAX. LENGTH','8,000 <small>mm*</small>'],['PROCESS','Straight shearing']],link:'/sheet-metal-shearing-pune.html',linkText:'Explore shearing'}
};
let machineApi,selected='laser';
function selectMachine(name){
 selected=name;const d=machineData[name];
 document.querySelectorAll('[data-machine]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.machine===name));b.tabIndex=b.dataset.machine===name?0:-1;});
 document.querySelector('#machine-panel').setAttribute('aria-labelledby',`tab-${name}`);
 document.querySelector('#machine-tag').textContent=d.tag;
 document.querySelector('#machine-number').textContent=d.number;
 document.querySelector('#machine-title').innerHTML=d.title;
 document.querySelector('#machine-description').textContent=d.description;
 document.querySelector('#machine-specs').innerHTML=d.specs.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
 const link=document.querySelector('#machine-link');link.href=d.link;link.innerHTML=`${d.linkText} <span>↗</span>`;
 const fallback=document.querySelector('.stage-fallback');fallback.src=`/illustrations/${name}.svg`;fallback.alt=`${d.tag} machine illustration`;
 machineApi?.select(name);
 analytics.track('machine_select',{service:name});
}
document.querySelectorAll('[data-machine]').forEach(b=>{b.addEventListener('click',()=>selectMachine(b.dataset.machine));b.addEventListener('keydown',e=>{const tabs=[...document.querySelectorAll('[data-machine]')];let i=tabs.indexOf(b);if(e.key==='ArrowRight')i=(i+1)%3;else if(e.key==='ArrowLeft')i=(i+2)%3;else if(e.key==='Home')i=0;else if(e.key==='End')i=2;else return;e.preventDefault();tabs[i].focus();selectMachine(tabs[i].dataset.machine);});});
document.querySelector('#pause-machine')?.addEventListener('click',()=>setMotion(!motionEnabled));
document.querySelector('#reset-machine')?.addEventListener('click',()=>machineApi?.reset());

// Lazy-load the 3D engine on the home page. Every capability remains readable without it.
if(document.querySelector('#machine-stage')){
 const load3d=()=>import('./scenes.js');
 const stage=document.querySelector('#machine-stage');
 const stageObserver=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;stageObserver.disconnect();load3d().then(mod=>{machineApi=mod.initMachines(stage,motionEnabled);machineApi?.select(selected);motionListeners.add(v=>machineApi?.setMotion(v));}).catch(()=>{});},{rootMargin:'300px'});
 stageObserver.observe(stage);
}
document.querySelectorAll('[data-stage-view]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelector('#machine-stage').dataset.view=b.dataset.stageView;
 document.querySelectorAll('[data-stage-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 analytics.track('machine_view',{view:b.dataset.stageView,service:selected});
}));
if(document.querySelector('.hero'))import('./motion.js').then(mod=>{const motion=mod.initMotion(motionEnabled);motionListeners.add(on=>motion.setMotion(on));}).catch(()=>{});

function syncAmbientFilm(){
 document.querySelectorAll('[data-ambient-film]').forEach(video=>{
  const play=motionEnabled&&video.dataset.inView==='true'&&matchMedia('(min-width:1001px)').matches&&!document.hidden&&!navigator.connection?.saveData;
  if(play)video.play().catch(()=>{});else{video.pause();video.classList.remove('is-playing');}
 });
 document.querySelectorAll('[data-toggle-film]').forEach(b=>{b.textContent=motionEnabled?'Ⅱ':'▷';b.setAttribute('aria-pressed',String(!motionEnabled));b.setAttribute('aria-label',motionEnabled?'Pause background film':'Play background film');});
}
document.querySelectorAll('[data-toggle-film]').forEach(b=>b.addEventListener('click',()=>setMotion(!motionEnabled)));
document.querySelectorAll('[data-ambient-film]').forEach(video=>{
 video.addEventListener('playing',()=>video.classList.add('is-playing'));
 new IntersectionObserver(entries=>{video.dataset.inView=String(entries[0].isIntersecting);syncAmbientFilm();},{threshold:.1}).observe(video);
});
document.addEventListener('visibilitychange',syncAmbientFilm);matchMedia('(min-width:1001px)').addEventListener('change',syncAmbientFilm);
async function seekFilm(video,time,play){
 if(video.readyState<1)await new Promise((resolve,reject)=>{video.addEventListener('loadedmetadata',resolve,{once:true});video.addEventListener('error',reject,{once:true});video.load();});
 video.currentTime=Math.min(Math.max(0,time),Number.isFinite(video.duration)?Math.max(0,video.duration-.05):time);
 if(play)await video.play();
}
document.querySelectorAll('[data-film-seek]').forEach(b=>b.addEventListener('click',()=>{
 const video=document.getElementById(b.dataset.filmTarget),time=Number(b.dataset.filmSeek);
 if(!video)return;seekFilm(video,time,true).catch(()=>{});
 analytics.track('video_seek',{service:time<8?'laser':time<16?'bending':'shearing'});
}));
document.querySelectorAll('[data-track-film]').forEach(video=>{
 let started=false;const reached=new Set();
 const update=()=>{
  document.querySelectorAll(`[data-film-target="${video.id}"]`).forEach(b=>b.setAttribute('aria-pressed',String(Math.min(2,Math.floor(video.currentTime/8))===Number(b.dataset.filmSeek)/8)));
  if(!video.duration||video.paused)return;
  for(const percent of [25,50,75])if(video.currentTime/video.duration*100>=percent&&!reached.has(percent)){analytics.track('video_progress',{video_percent:percent});reached.add(percent);}
 };
 video.addEventListener('play',()=>{if(!started){analytics.track('video_start');started=true;}});
 video.addEventListener('timeupdate',update);video.addEventListener('ended',()=>analytics.track('video_complete'));update();
});
const startAt=Number(new URLSearchParams(location.search).get('t'));
if(location.pathname.includes('process-film')&&Number.isFinite(startAt)&&startAt>0&&startAt<24)seekFilm(document.querySelector('#process-player'),startAt,false).catch(()=>{});

if(document.querySelector('#cad-app'))import('./cad/main.js').then(m=>m.initCad(analytics)).catch(()=>{const status=document.querySelector('#cad-save-status');if(status)status.textContent='Editor could not load. Reload the page or read the CAD guide below.';});
document.querySelector('[data-load-map]')?.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.title='Interactive factory map for Sachin Industries, S-68 MIDC Bhosari, Pune';frame.src='https://maps.google.com/maps?q=Sachin%20Industries%20S-68%20MIDC%20Bhosari%20Pune%20411026&z=16&output=embed';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='lazy';document.querySelector('#factory-map-frame').replaceChildren(frame);analytics.track('map_open');});
