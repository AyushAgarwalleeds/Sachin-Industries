import {publicCount} from './event-counts.js';
const CONSENT_KEY='sachin.analytics-consent.v1';
const DENIED={analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
const EVENTS=new Set(['page_view','service_view','machine_select','machine_view','enquiry_open','enquiry_prepared','contact_click','brochure_view','brochure_print','scroll_depth','web_vital','video_start','video_progress','video_complete','video_seek','cad_start','cad_export','dwg_workspace_open','cad_import','map_open']);
const SERVICES=new Set(['laser','bending','shearing','Laser cutting','Bending','Shearing','Multiple processes']);
export function safePageLocation(value){
 const u=new URL(value);const clean=new URL(u.origin+u.pathname);
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){const v=u.searchParams.get(key);if(v&&/^[a-zA-Z0-9_.~-]{1,100}$/.test(v))clean.searchParams.set(key,v);}
 return clean.href;
}
function safeReferrer(value){try{return new URL(value).origin+'/';}catch{return '';}}
function parameters(input){
 const out={};
 if(['dxf','svg','json'].includes(input.file_type))out.file_type=input.file_type;
 if(['all','profiles','selection'].includes(input.export_scope))out.export_scope=input.export_scope;
 if(SERVICES.has(input.service))out.service=input.service;
 if(['phone','email','whatsapp','directions'].includes(input.channel))out.channel=input.channel;
 if(['3d','diagram'].includes(input.view))out.view=input.view;
 if([25,50,75].includes(input.video_percent))out.video_percent=input.video_percent;
 if([25,50,75,90].includes(input.percent_scrolled))out.percent_scrolled=input.percent_scrolled;
 if(['LCP','INP','CLS'].includes(input.metric_name))out.metric_name=input.metric_name;
 if(['good','needs-improvement','poor'].includes(input.metric_rating))out.metric_rating=input.metric_rating;
 for(const key of ['metric_value','metric_delta'])if(Number.isFinite(input[key]))out[key]=input[key];
 if(typeof input.metric_id==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(input.metric_id))out.metric_id=input.metric_id;
 return out;
}
export function createAnalytics({id,firstParty=false,win=window,doc=document,loadVitals=()=>import('web-vitals')}){
 const google = /^G-[A-Z0-9]{5,20}$/.test(id || '');
 if(!google && !firstParty)return{enabled:false,track:()=>false,setConsent:()=>{},getConsent:()=>null};
 let active=false,started=false,vitalsStarted=false;
 let memoryChoice = null;
 function getConsent() {
   const match = /(?:^|;\s*)si_analytics=(granted|denied)(?:;|$)/.exec(doc.cookie || '');
   if (match) return match[1];
   if (memoryChoice) return memoryChoice;
   try { return win.localStorage.getItem(CONSENT_KEY); } catch { return null; }
 }
 function track(name,input={}){
  if(!active || getConsent() !== 'granted' || !EVENTS.has(name))return false;
  const event = firstParty && publicCount(name, win.location.pathname, input.channel);
  if (event) win.fetch('/api/activity', {
    method:'POST', credentials:'same-origin', keepalive:true, referrerPolicy:'no-referrer',
    headers:{'Content-Type':'application/json'}, body:JSON.stringify(event)
  }).catch(() => {});
  if (google) win.gtag('event',name,{...parameters(input),page_location:safePageLocation(win.location.href),page_referrer:safeReferrer(doc.referrer),page_title:doc.title});
  return Boolean(event || google);
 }
 function clearCookies(){
  const names=(doc.cookie||'').split(';').map(v=>v.trim().split('=')[0]).filter(v=>/^_ga(?:_|$)/.test(v));
  const labels=win.location.hostname.split('.');const domains=['',win.location.hostname,...labels.map((_,i)=>'.'+labels.slice(i).join('.')).filter(v=>v.split('.').length>2)];
  for(const name of names)for(const domain of domains)doc.cookie=`${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain?`; domain=${domain}`:''}; SameSite=Lax`;
 }
 function setConsent(choice, remember=true){
  if(!['granted','denied'].includes(choice))return;
  memoryChoice = choice;
  if (remember) {
    try {
      doc.cookie = 'si_analytics=' + choice + '; Path=/; Max-Age=15552000; SameSite=Lax' + (win.location.protocol === 'https:' ? '; Secure' : '');
      if (win.localStorage.removeItem) win.localStorage.removeItem(CONSENT_KEY);
    } catch { /* Keep the choice in memory if browser storage is blocked. */ }
  }
  if(choice==='denied'){
   active=false;
   if (!google) return;
   win[`ga-disable-${id}`]=true;
   if(started)win.gtag('consent','update',DENIED);
   clearCookies();return;
  }
  if(active)return;
  active=true;
  if (!google) { track('page_view'); return; }
  win[`ga-disable-${id}`]=false;
  if(!started){
   win.dataLayer=win.dataLayer||[];win.gtag=win.gtag||function(){win.dataLayer.push(arguments);};
   win.gtag('consent','default',DENIED);
   win.gtag('consent','update',{...DENIED,analytics_storage:'granted'});
   win.gtag('js',new Date());
   win.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:safePageLocation(win.location.href),page_referrer:safeReferrer(doc.referrer)});
   const script=doc.createElement('script');script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${id}`;script.id='ga4-script';doc.head.appendChild(script);started=true;
  }else win.gtag('consent','update',{...DENIED,analytics_storage:'granted'});
  track('page_view');
  const path=win.location.pathname;const service=path.includes('laser-cutting')?'laser':path.includes('bending')?'bending':path.includes('shearing')?'shearing':null;
  if(service)track('service_view',{service});if(path.includes('capabilities'))track('brochure_view');
  if(!vitalsStarted){vitalsStarted=true;loadVitals().then(mod=>{for(const method of ['onLCP','onINP','onCLS'])mod[method]?.(metric=>track('web_vital',{metric_name:metric.name,metric_value:metric.value,metric_delta:metric.delta,metric_id:metric.id,metric_rating:metric.rating}));}).catch(()=>{});}
 }
 return{enabled:true,track,setConsent,getConsent};
}
export function initAnalytics(){
 let config={};try{config=JSON.parse(document.getElementById('analytics-config')?.textContent||'{}');}catch{}
 const api=createAnalytics({id:config.measurementId,firstParty:config.firstParty===true});
 if(!api.enabled)return api;
 const banner=document.getElementById('consent-banner');
 document.querySelectorAll('[data-cookie-settings]').forEach(b=>{b.hidden=false;b.addEventListener('click',()=>{banner.hidden=false;banner.querySelector('button')?.focus();});});
 document.querySelectorAll('[data-consent]').forEach(b=>b.addEventListener('click',()=>{api.setConsent(b.dataset.consent);banner.hidden=true;}));
 const saved=api.getConsent();
 if (saved === 'granted' || saved === 'denied') api.setConsent(saved,!/(?:^|;\s*)si_analytics=/.test(document.cookie));
 else banner.hidden=false;
 // A withdrawal in a second tab must also disable Google's already loaded tag.
 window.addEventListener('focus', () => {
   if (api.getConsent() === 'denied') api.setConsent('denied',false);
 });
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const href=a.getAttribute('href')||'';const channel=href.startsWith('tel:')?'phone':href.startsWith('mailto:')?'email':href.includes('wa.me/')?'whatsapp':href.includes('google.com/maps')?'directions':null;if(channel)api.track('contact_click',{channel});});
 let depths=new Set();window.addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-window.innerHeight;if(max<=0)return;const pct=window.scrollY/max*100;for(const n of [25,50,75,90])if(pct>=n&&!depths.has(n)&&api.track('scroll_depth',{percent_scrolled:n}))depths.add(n);},{passive:true});
 return api;
}
