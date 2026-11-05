import * as G from './geometry.js';
import {newDocument,defaultLayers,validateDocument,MAX_ENTITIES,entitySvg,exportSvg} from './io.js';
import {TOOL_GROUPS,TOOLS,ICONS} from './catalog.js';
import './cad.css';

export function initCad(analytics={track(){}}){
const app=document.querySelector('#cad-app');if(!app||app.dataset.ready)return;app.dataset.ready='true';
const $=s=>app.querySelector(s),$$=s=>[...app.querySelectorAll(s)],stage=$('#cad-stage'),canvas=$('#cad-canvas'),world=$('#cad-world'),objects=$('#cad-entities'),preview=$('#cad-preview'),grips=$('#cad-grips'),overlay=$('#cad-screen-overlay'),command=$('#cad-command'),dialog=$('#cad-dialog'),options=$('#cad-options'),panel=$('#cad-panel-content');
let doc=newDocument(),selection=new Set(),history=[],redo=[],activePanel='properties',ribbon='draw',tool='select',points=[],cursor=[0,0],snapHit=null,settings={},clipboard=[],interaction=null,spacePan=false,lastTool='line',saveTimer,worker=null,workerId=0;
const requests=new Map(),view={center:[180,110],zoom:1},flags={grid:true,snap:true,ortho:false,polar:false},snapModes={Endpoint:true,Midpoint:true,Center:true,Quadrant:true,Intersection:true,Grid:true};
let gridStep=5,sceneBounds=new Map(),snapCache=[],W=800,H=500,lastCommand='',logLines=[];
const factor=()=>doc.units==='in'?25.4:1,fmt=n=>Number((n/factor()).toFixed(4)).toLocaleString('en-IN',{maximumFractionDigits:4}),unitLabel=()=>doc.units==='in'?'in':'mm';
const layer=e=>doc.layers.find(l=>l.name===e.layer),visible=e=>layer(e)?.visible,editable=e=>visible(e)&&!layer(e)?.locked,selected=()=>[...selection].map(id=>doc.entities.find(e=>e.id===id)).filter(e=>e&&editable(e));
const selectable=()=>doc.entities.filter(editable),visibleGeometry=()=>doc.entities.filter(visible),field=(name,label,value,type='number',extra={})=>({name,label,value,type,...extra});
function log(message){logLines.push(String(message));logLines=logLines.slice(-25);const el=$('#cad-log');el.textContent=logLines.join('\n');el.scrollTop=el.scrollHeight;}
function ensureLayer(next,name){let l=next.layers.find(l=>l.name===name);if(!l){l=defaultLayers().find(l=>l.name===name)||{name,color:'#dafa70',role:'cut',visible:true,locked:false,dash:'solid'};next.layers.push(l);}return l;}
function scheduleSave(){clearTimeout(saveTimer);$('#cad-save-status').textContent='Saving on this device…';saveTimer=setTimeout(()=>{try{localStorage.setItem('sachin-cad-v1',JSON.stringify(doc));$('#cad-save-status').textContent='Saved on this device';}catch{$('#cad-save-status').textContent='Recovery storage full — download a project';}},500);}
function commit(label,change,{select=null}={}){
 try{const next=G.clone(doc);change(next);if(next.entities.length>MAX_ENTITIES)throw new Error(`A drawing can contain up to ${MAX_ENTITIES.toLocaleString()} entities.`);validateDocument(next);
  const old=JSON.stringify(doc);history.push(old);while(history.length>80||history.reduce((n,s)=>n+s.length*2,0)>32*1024*1024)history.shift();redo=[];doc=next;if(select)selection=new Set(select);selection=new Set([...selection].filter(id=>doc.entities.some(e=>e.id===id&&editable(e))));renderAll();scheduleSave();log(label);return true;
 }catch(error){log(error.message);return false;}
}
function addEntities(list,label='Geometry created'){
 if(!list.length)return;
 const ok=commit(label,next=>{for(const e of list){const l=ensureLayer(next,e.layer);if(l.locked||!l.visible)throw new Error(`Layer ${l.name} is hidden or locked. Make it visible and unlocked first.`);G.validateEntity(e);}next.entities.push(...list);},{select:list.map(e=>e.id)});return ok;
}
function undo(){if(!history.length){log('Nothing to undo.');return;}redo.push(JSON.stringify(doc));doc=JSON.parse(history.pop());selection.clear();cancel(false);renderAll();scheduleSave();log('Undo.');}
function redoAction(){if(!redo.length){log('Nothing to redo.');return;}history.push(JSON.stringify(doc));doc=JSON.parse(redo.pop());selection.clear();cancel(false);renderAll();scheduleSave();log('Redo.');}
function needSelection(min=1){const list=selected();if(list.length<min)throw new Error(`Select ${min===1?'one or more':`at least ${min}`} unlocked object${min===1?'':'s'} first.`);return list;}
function replaceEntities(old,list,label){const ids=new Set(old.map(e=>e.id));return commit(label,next=>{next.entities=next.entities.filter(e=>!ids.has(e.id));next.entities.push(...list);},{select:list.map(e=>e.id)});}
function applyMatrix(m,copy=false){const list=needSelection(),out=list.map(e=>{const n=G.transform(e,m);if(copy){n.id=G.uid();delete n.group;}return n;});if(copy)addEntities(out,`${out.length} object${out.length===1?'':'s'} copied.`);else replaceEntities(list,out,'Transformation applied.');}
function sampleDocument(){
 const next=newDocument();next.name='Mounting plate — example';
 next.entities=[G.rectangle([0,0],[360,220],'CUT',12),...[25,335].flatMap(x=>[25,195].map(y=>G.entity('circle',{center:[x,y],r:7}))),G.slot([180,110],100,28),G.entity('line',{a:[70,0],b:[70,220]},'BEND'),G.entity('line',{a:[290,0],b:[290,220]},'BEND'),G.entity('dimension',{a:[0,0],b:[360,0],p:[0,-30],mode:'horizontal'},'ANNOTATION'),G.entity('dimension',{a:[360,0],b:[360,220],p:[395,0],mode:'vertical'},'ANNOTATION'),G.entity('text',{at:[0,246],text:'SACHIN / MOUNTING PLATE — EXAMPLE',height:6,rotation:0},'ANNOTATION')];return next;
}
try{const recovered=localStorage.getItem('sachin-cad-v1');doc=recovered?validateDocument(JSON.parse(recovered)):sampleDocument();if(recovered)log('Recovered your last drawing from this device.');}catch{doc=sampleDocument();log('Local recovery could not be read. A fresh example is open.');}
function screen(p){return [(p[0]-view.center[0])*view.zoom+W/2,H/2-(p[1]-view.center[1])*view.zoom];}
function fromScreen(p){return [(p[0]-W/2)/view.zoom+view.center[0],(H/2-p[1])/view.zoom+view.center[1]];}
function eventPoint(e){const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
function setView(){
 const ox=W/2-view.center[0]*view.zoom,oy=H/2+view.center[1]*view.zoom;world.setAttribute('transform',`translate(${ox} ${oy}) scale(${view.zoom} ${-view.zoom})`);
 let step=gridStep*view.zoom;while(step<12)step*=5;while(step>160)step/=5;
 for(const [id,size] of [['cad-grid-small',step],['cad-grid-major',step*5]]){const p=$('#'+id);p.setAttribute('width',size);p.setAttribute('height',size);p.setAttribute('patternTransform',`translate(${ox} ${oy})`);p.firstElementChild.setAttribute('d',`M${size} 0H0V${size}`);}
 $('#cad-grid').style.display=flags.grid?'':'none';$('#cad-zoom').textContent=`${view.zoom.toFixed(2)}×`;renderGrips();renderPreview();
}
function fit(){const list=visibleGeometry(),b=G.bounds(list);if(doc.stock.show){b.x=Math.min(b.x,0);b.y=Math.min(b.y,0);b.width=Math.max(b.x+b.width,doc.stock.width)-b.x;b.height=Math.max(b.y+b.height,doc.stock.height)-b.y;b.center=[b.x+b.width/2,b.y+b.height/2];}view.center=b.center;view.zoom=Math.max(.00001,Math.min(5000,Math.min((W-120)/Math.max(20,b.width),(H-125)/Math.max(20,b.height))));setView();}
function zoomAt(screenPoint,amount){const before=fromScreen(screenPoint);view.zoom=Math.max(.00001,Math.min(5000,view.zoom*amount));const after=fromScreen(screenPoint);view.center=G.add(view.center,G.sub(before,after));setView();}
function sceneMarkup(e){const l=layer(e),sel=selection.has(e.id),dash=l.dash==='dashed'?'stroke-dasharray="7 4"':l.dash==='dotted'?'stroke-dasharray="1 4"':'';return `<g class="cad-object${sel?' is-selected':''}${l.locked?' is-locked':''}" data-e="${G.esc(e.id)}" style="color:${l.color}" ${dash}><title>${G.esc(e.type)} on ${G.esc(e.layer)}</title>${entitySvg(e,factor())}</g>`;}
function renderScene(){
 sceneBounds=new Map();snapCache=[];for(const e of visibleGeometry()){try{sceneBounds.set(e.id,G.bounds(e));if(editable(e))snapCache.push(...G.snapPoints(e).map(p=>({...p,id:e.id})));}catch{}}
 objects.innerHTML=visibleGeometry().map(sceneMarkup).join('');
 $('#cad-stock').innerHTML=doc.stock.show?`<rect x="0" y="0" width="${doc.stock.width}" height="${doc.stock.height}" fill="#b9d88f07" stroke="#8eac7155" stroke-width="1" vector-effect="non-scaling-stroke"/><text transform="translate(5 5) scale(1 -1)" font-size="${12/view.zoom}" fill="#8ca477">SHEET ${G.num(doc.stock.width)} × ${G.num(doc.stock.height)} mm</text>`:'';
 $('#cad-entity-count').textContent=`${doc.entities.length} objects · ${selection.size} selected`;renderGrips();
}
function renderAll(){
 $('#cad-name').value=doc.name;$('#cad-units').value=doc.units;$('#cad-grid-step').value=G.clean(gridStep/factor());renderScene();renderPanel();setView();
 $$('[data-act=undo]').forEach(b=>b.disabled=!history.length);$$('[data-act=redo]').forEach(b=>b.disabled=!redo.length);
}
function renderRibbon(){
 $('#cad-ribbon').innerHTML=TOOL_GROUPS[ribbon].map(t=>`<button data-tool="${t.id}" title="${G.esc(t.command+' — '+t.help)}" aria-pressed="${tool===t.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[t.icon]||ICONS.line}"/></svg><span>${t.label}</span></button>`).join('');
 $$('[data-ribbon]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ribbon===ribbon)));
}
function toolPrompt(){
 const n=points.length,base={select:'Select objects. Shift adds. Drag a window; selected objects and square grips can be dragged.',pan:'Drag to pan. Scroll or pinch to zoom.',line:n?'Next point. Enter finishes. C closes. U removes the last point.':'First point. Type x,y or click.','polyline':n?'Next vertex. Enter finishes. C closes.':'First vertex. Type x,y or click.',rectangle:n?'Opposite corner. @width,height gives a precise size.':'First corner.',circle:n?'Radius point, or type a radius.':'Circle centre.',arc:['Start point.','Point on the arc.','End point.'][n],ellipse:['Ellipse centre.','Major-axis end.','Minor-axis distance, or type a value.'][n],polygon:n?'Radius point, or type a radius.':'Polygon centre.',slot:'Place the centre of your slot.',spline:'Pick interpolation points. Enter finishes. U removes the last point.',point:'Place a construction point. Escape finishes.',move:n?'Destination point or @dx,dy.':'Pick a base point for the selected objects.',copy:n?'Copy destination or @dx,dy.':'Pick a base point for the selected objects.',offset:n?'Choose the side of the offset.':'Click a line, arc, circle or closed profile.',trim:'Click the part to remove. Other visible geometry provides the boundaries.',extend:'Click near the line endpoint to extend.',fillet:n?'Select the second straight line.':'Select the first straight line.',chamfer:n?'Select the second straight line.':'Select the first straight line.',break:'Click a line or arc at the break point.',text:'Place your text label.',leader:['Arrow point.','Elbow point.','Text position.'][n],dimension:['First extension point.','Second extension point.','Position the dimension line.'][n],dimh:['First point.','Second point.','Position the horizontal dimension.'][n],dimv:['First point.','Second point.','Position the vertical dimension.'][n],radius:n?'Position the radius label.':'Click a circle or arc.',diameter:n?'Position the diameter label.':'Click a circle or arc.',measure:n?'Second measurement point.':'First measurement point.'};
 return base[tool]||'Choose a tool or type HELP.';
}
function setTool(next,config={}){tool=next;points=[];settings=config;snapHit=null;lastTool=next==='select'?lastTool:next;stage.dataset.tool=tool;$('#cad-tool-name').textContent=tool.toUpperCase();$('#cad-prompt').textContent=toolPrompt();$$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));renderPreview();}
function cancel(message=true){const clear=tool==='select'&&selection.size;interaction=null;setTool('select');grips.style.opacity='';objects.style.opacity='';if(clear){selection.clear();renderAll();}if(message)log('Command cancelled.');}
function selectedGrips(){
 const list=selected();if(list.length!==1)return [];const e=list[0],out=[],push=(p,kind,index=0)=>out.push({p,kind,index,id:e.id});
 if(e.type==='line'){push(e.a,'a');push(e.b,'b');}
 if(e.type==='polyline')e.points.slice(0,150).forEach((p,i)=>push(p,'vertex',i));
 if(e.type==='bezier')e.segments.slice(0,100).forEach((s,i)=>{push(s.p,'anchor',i);if(G.length(s.in||[0,0])>G.EPS)push(G.add(s.p,s.in),'in',i);if(G.length(s.out||[0,0])>G.EPS)push(G.add(s.p,s.out),'out',i);});
 if(e.type==='circle'){push(e.center,'center');push(G.add(e.center,[e.r,0]),'radius');}
 if(e.type==='arc'){push(e.center,'center');push(G.arcPoint(e,0),'start');push(G.arcPoint(e,1),'end');}
 if(e.type==='ellipse'){push(e.center,'center');push(G.polar(e.center,e.rx,G.rad(e.angle||0)),'major');push(G.polar(e.center,e.ry,G.rad((e.angle||0)+90)),'minor');}
 if(['point','text'].includes(e.type))push(e.at,'at');
 if(e.type==='dimension'){push(e.a,'a');push(e.b,'b');push(e.p,'p');}
 if(e.type==='radial'){push(e.center,'center');push(e.edge,'edge');push(e.p,'p');}
 return out;
}
function renderGrips(){const size=3.5/view.zoom;grips.innerHTML=selectedGrips().map(g=>`<rect data-grip="${g.kind}" data-grip-index="${g.index}" data-e="${g.id}" x="${g.p[0]-size}" y="${g.p[1]-size}" width="${size*2}" height="${size*2}" fill="${g.kind==='in'||g.kind==='out'?'#75b9ed':'#dafa70'}" stroke="#0b1511" stroke-width="1" vector-effect="non-scaling-stroke" style="cursor:move"/>`).join('');}
function gripEntity(e,kind,index,p){const n=G.clone(e);if(['a','b','p','at','edge'].includes(kind))n[kind]=p;else if(kind==='center'){const d=G.sub(p,e.center);return G.transform(e,G.translation(d));}else if(kind==='vertex')n.points[index]=p;else if(kind==='anchor')n.segments[index].p=p;else if(kind==='in'||kind==='out')n.segments[index][kind]=G.sub(p,n.segments[index].p);else if(kind==='radius')n.r=G.distance(e.center,p);else if(kind==='start'||kind==='end')n[kind]=Math.atan2(p[1]-e.center[1],p[0]-e.center[0]);else if(kind==='major')n.rx=G.distance(e.center,p);else if(kind==='minor')n.ry=G.distance(e.center,p);return n;}
function previewEntities(){
 if(interaction?.kind==='grip')return [gripEntity(interaction.original,interaction.grip,interaction.index,cursor)];
 if(interaction?.kind==='move')return interaction.originals.map(e=>G.transform(e,G.translation(G.sub(cursor,interaction.start))));
 if(!points.length)return [];
 const p=points[0],q=cursor,current=doc.currentLayer;
 try{
  if(['line','polyline','spline','leader'].includes(tool)){const pts=[...points,q];if(tool==='spline'&&pts.length>=3)return [G.spline(pts,current)];return [G.entity('polyline',{points:pts,closed:false},current)];}
  if(tool==='rectangle')return [G.rectangle(p,q,current)];
  if(tool==='circle')return [G.entity('circle',{center:p,r:G.distance(p,q)},current)];
  if(tool==='arc'&&points.length===2)return [G.arcThrough(p,points[1],q,current)];
  if(tool==='arc')return [G.entity('line',{a:p,b:q},current)];
  if(tool==='ellipse'){const v=G.sub(points[1]||q,p),rx=G.length(v),u=G.unit(v);return [G.entity('ellipse',{center:p,rx,ry:points.length>1?Math.max(G.EPS,Math.abs(G.dot(G.sub(q,p),[-u[1],u[0]]))):rx*.4,angle:G.deg(Math.atan2(v[1],v[0]))},current)];}
  if(tool==='polygon')return [polygonEntity(p,q,settings.sides)];
  if(['move','copy'].includes(tool))return selected().map(e=>G.transform(e,G.translation(G.sub(q,p))));
  if(['dimension','dimh','dimv'].includes(tool)&&points.length===2)return [G.entity('dimension',{a:p,b:points[1],p:q,mode:tool==='dimh'?'horizontal':tool==='dimv'?'vertical':'aligned'},'ANNOTATION')];
  if(tool==='measure')return [G.entity('line',{a:p,b:q},'ANNOTATION')];
  if(tool==='offset'&&settings.target)return G.offset(settings.target,settings.distance,q);
 }catch{}return [];
}
function renderPreview(){
 const list=previewEntities();preview.innerHTML=list.map(e=>`<g fill="none" stroke="#dafa70" color="#dafa70" stroke-width="1.3" stroke-dasharray="5 4" opacity=".85" vector-effect="non-scaling-stroke">${entitySvg(e,factor())}</g>`).join('');
 let markup='';if(snapHit){const p=screen(snapHit.p);markup+=`<rect x="${p[0]-5}" y="${p[1]-5}" width="10" height="10" fill="#101b13" stroke="#dafa70"/><text x="${p[0]+12}" y="${p[1]-12}" fill="#dafa70" font-size="10" font-family="Consolas,monospace">${snapHit.kind}</text>`;}
 if(interaction?.kind==='box'){const a=interaction.screen,b=screen(cursor),crossing=b[0]<a[0];markup+=`<rect x="${Math.min(a[0],b[0])}" y="${Math.min(a[1],b[1])}" width="${Math.abs(a[0]-b[0])}" height="${Math.abs(a[1]-b[1])}" fill="${crossing?'#dafa7011':'#74bcff11'}" stroke="${crossing?'#dafa70':'#74bcff'}" stroke-dasharray="${crossing?'5 4':'none'}"/>`;}
 if(points.length&&['line','polyline','circle','rectangle','move','copy','measure'].includes(tool)){const p=screen(cursor);markup+=`<text x="${p[0]+15}" y="${p[1]+20}" fill="#a6bd90" font-size="10" font-family="Consolas,monospace">${fmt(G.distance(points.at(-1),cursor))} ${unitLabel()}</text>`;}
 overlay.innerHTML=markup;
}
function hitTest(p){let best=null,min=8/view.zoom;for(const e of selectable()){const b=sceneBounds.get(e.id),t=min;if(!b||p[0]<b.x-t||p[0]>b.x+b.width+t||p[1]<b.y-t||p[1]>b.y+b.height+t)continue;const q=G.nearest(e,p);if(q.distance<min){best=e;min=q.distance;}if(e.type==='text'&&p[0]>=b.x&&p[0]<=b.x+b.width&&p[1]>=b.y&&p[1]<=b.y+b.height)return e;}return best;}
function snapped(p){
 snapHit=null;if(flags.snap&&(tool!=='select'||interaction?.kind==='grip')&&tool!=='pan'&&!spacePan){let best=9/view.zoom;
  for(const x of snapCache){if(!snapModes[x.kind]||interaction?.kind==='grip'&&x.id===interaction.original.id)continue;const d=G.distance(x.p,p);if(d<best){snapHit=x;best=d;}}
  if(snapModes.Intersection){const near=selectable().filter(e=>{const b=sceneBounds.get(e.id),t=10/view.zoom;return b&&p[0]>=b.x-t&&p[0]<=b.x+b.width+t&&p[1]>=b.y-t&&p[1]<=b.y+b.height+t;}).slice(0,7);for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++){try{for(const q of G.intersections(near[i],near[j])){const d=G.distance(p,q);if(d<best){snapHit={p:q,kind:'Intersection'};best=d;}}}catch{}}}
  if(snapHit)return snapHit.p;
  if(snapModes.Grid)p=p.map(n=>Math.round(n/gridStep)*gridStep);
 }
 if(points.length&&(flags.ortho||flags.polar)){const a=points.at(-1),v=G.sub(p,a);if(flags.ortho)p=Math.abs(v[0])>Math.abs(v[1])?[p[0],a[1]]:[a[0],p[1]];else{const angle=Math.round(Math.atan2(v[1],v[0])/(Math.PI/4))*Math.PI/4;p=G.polar(a,G.length(v),angle);}}
 return p;
}
function checkbox(label,name,value){return field(name,label,value,'checkbox',{wide:true});}
function showForm(title,fields,onSubmit,{description='',submit='Apply'}={}){
 options.innerHTML=`<h2>${G.esc(title)}</h2>${description?`<p>${G.esc(description)}</p>`:''}<div class="cad-form-grid">${fields.map(f=>`<label class="cad-field${f.wide?' wide':''}${f.type==='checkbox'?' checkbox':''}">${f.type==='checkbox'?`<input type="checkbox" name="${f.name}" ${f.value?'checked':''}>`:''}<span>${G.esc(f.label)}</span>${f.type==='select'?`<select name="${f.name}">${f.choices.map(x=>{const value=Array.isArray(x)?x[0]:x,label=Array.isArray(x)?x[1]:x;return `<option value="${G.esc(value)}" ${String(value)===String(f.value)?'selected':''}>${G.esc(label)}</option>`;}).join('')}</select>`:f.type==='textarea'?`<textarea name="${f.name}" maxlength="2000" required>${G.esc(f.value)}</textarea>`:f.type==='checkbox'?'':`<input name="${f.name}" type="${f.type}" value="${G.esc(f.value)}" ${f.type==='number'?'step="any"':''} ${f.min!==undefined?`min="${f.min}"`:''} ${f.max!==undefined?`max="${f.max}"`:''} required>`}${f.hint?`<small>${G.esc(f.hint)}</small>`:''}</label>`).join('')}</div><p class="cad-dialog-error" role="alert"></p><div class="cad-dialog-actions"><button type="button" data-close-cad>Cancel</button><button type="submit">${G.esc(submit)}</button></div>`;
 options.onsubmit=async e=>{e.preventDefault();const data=new FormData(options),values=Object.fromEntries(fields.map(f=>[f.name,f.type==='number'?Number(data.get(f.name)):f.type==='checkbox'?data.has(f.name):data.get(f.name)]));try{await onSubmit(values);dialog.close();}catch(error){options.querySelector('.cad-dialog-error').textContent=error.message;}};
 if(!dialog.open)dialog.showModal();
}
dialog.addEventListener('click',e=>{if(e.target.closest('[data-close-cad]'))dialog.close();if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});

function renderPanel(){
 $$('[data-panel]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.panel===activePanel)));
 const list=selected(),f=factor();
 if(activePanel==='layers'){
  panel.innerHTML=`<h3>Layers with purpose.</h3><p class="cad-panel-caption">CURRENT / ${G.esc(doc.currentLayer)}</p>${doc.layers.map(l=>`<div class="cad-layer-row${doc.currentLayer===l.name?' is-current':''}"><div class="cad-layer-head"><input type="color" value="${l.color}" data-layer-color="${G.esc(l.name)}" aria-label="Colour for layer ${G.esc(l.name)}"><button data-layer-current="${G.esc(l.name)}" title="Make ${G.esc(l.name)} current">${G.esc(l.name)}</button><button data-layer-act="visible" data-layer="${G.esc(l.name)}" aria-pressed="${l.visible}" aria-label="${l.visible?'Hide':'Show'} layer ${G.esc(l.name)}">${l.visible?'◉':'○'}</button><button data-layer-act="locked" data-layer="${G.esc(l.name)}" aria-pressed="${l.locked}" aria-label="${l.locked?'Unlock':'Lock'} layer ${G.esc(l.name)}">${l.locked?'▣':'□'}</button></div><div class="cad-layer-role"><select data-layer-role="${G.esc(l.name)}" aria-label="Purpose of ${G.esc(l.name)}">${['cut','bend','annotation','construction'].map(r=>`<option ${r===l.role?'selected':''}>${r}</option>`).join('')}</select><select data-layer-dash="${G.esc(l.name)}" aria-label="Line style of ${G.esc(l.name)}">${['solid','dashed','dotted'].map(d=>`<option ${d===l.dash?'selected':''}>${d}</option>`).join('')}</select></div></div>`).join('')}<button class="cad-panel-button" data-inspect-act="layer-add">+ New layer</button><button class="cad-panel-button secondary" data-inspect-act="layer-purge">Remove empty custom layers</button><p>Click a layer name to draw on it. Locked layers cannot be selected or edited. Hidden layers are excluded from export.</p>`;return;
 }
 if(activePanel==='job'){renderReview();return;}
 if(!list.length){panel.innerHTML=`<h3>Every detail matters.</h3><p class="cad-panel-caption">PROPERTIES / NO SELECTION</p><div class="cad-empty-symbol">⌖</div><p>Select an object to inspect and edit its geometry. Shift-click adds to a selection. Drag a square grip to edit a vertex.</p><div class="cad-mini-stats"><div><small>Objects</small>${doc.entities.length}</div><div><small>Units</small>${unitLabel()}</div><div><small>Current layer</small>${G.esc(doc.currentLayer)}</div><div><small>Local recovery</small>Automatic</div></div><button class="cad-panel-button" data-inspect-act="selectall">Select all unlocked</button><button class="cad-panel-button secondary" data-act="help">Command reference ↗</button><p>Drawings are processed on your device. Download a project file to keep a durable copy.</p>`;return;}
 const e=list[0],b=G.bounds(list),mixed=new Set(list.map(e=>e.layer)).size>1;let fields=[];
 const coords=(name,label,p)=>[field(name+'x',label+' X',G.clean(p[0]/f)),field(name+'y',label+' Y',G.clean(p[1]/f))];
 if(list.length===1){
  if(e.type==='line')fields=[...coords('a','Start',e.a),...coords('b','End',e.b)];
  else if(e.type==='circle'||e.type==='arc')fields=[...coords('center','Centre',e.center),field('r','Radius',G.clean(e.r/f)),...(e.type==='arc'?[field('start','Start angle °',G.clean(G.deg(e.start))),field('end','End angle °',G.clean(G.deg(e.end)))]:[])];
  else if(e.type==='ellipse')fields=[...coords('center','Centre',e.center),field('rx','X radius',G.clean(e.rx/f)),field('ry','Y radius',G.clean(e.ry/f)),field('angle','Rotation °',e.angle||0)];
  else if(e.type==='text')fields=[...coords('at','Position',e.at),field('height','Text height',G.clean(e.height/f)),field('rotation','Rotation °',e.rotation||0),field('text','Text',e.text,'textarea',{wide:true})];
  else if(e.type==='point')fields=coords('at','Position',e.at);
 }
 if(!fields.length)fields=[field('dx','Move X',0),field('dy','Move Y',0),field('angle','Rotate °',0),field('scale','Scale',1)];
 const fieldHtml=fields.map(x=>`<label class="cad-field${x.wide?' wide':''}"><span>${G.esc(x.label)}</span>${x.type==='textarea'?`<textarea name="${x.name}" maxlength="2000">${G.esc(x.value)}</textarea>`:`<input name="${x.name}" type="${x.type}" step="any" value="${G.esc(x.value)}" required>`}</label>`).join('');
 panel.innerHTML=`<h3>${list.length===1?G.esc(e.type.charAt(0).toUpperCase()+e.type.slice(1)):`${list.length} objects`}</h3><p class="cad-panel-caption">EDIT GEOMETRY / ${unitLabel().toUpperCase()}</p><form id="cad-properties-form"><div class="cad-form-grid">${fieldHtml}<label class="cad-field wide"><span>Layer</span><select name="layer">${mixed?'<option value="__mixed" selected>Mixed layers</option>':''}${doc.layers.map(l=>`<option value="${G.esc(l.name)}" ${!mixed&&l.name===e.layer?'selected':''}>${G.esc(l.name)}</option>`).join('')}</select></label></div><button class="cad-panel-button" type="submit">Apply properties ↗</button></form><div class="cad-mini-stats"><div><small>Width</small>${fmt(b.width)} ${unitLabel()}</div><div><small>Height</small>${fmt(b.height)} ${unitLabel()}</div><div><small>Path length</small>${fmt(list.reduce((s,e)=>s+G.perimeter(e),0))}</div><div><small>Closed-loop area ∑</small>${(list.reduce((s,e)=>s+G.area(e),0)/f/f).toFixed(2)}</div></div><button class="cad-panel-button secondary" data-tool="erase">Erase selection</button>`;
}
function renderReview(){
 const cut=doc.entities.filter(e=>visible(e)&&layer(e)?.role==='cut'&&!['dimension','radial','text','point'].includes(e.type)),b=G.bounds(cut),endpoints=[],zero=[],seen=new Set();let duplicates=0;
 for(const e of cut){if(G.perimeter(e)<.001)zero.push(e);const key=JSON.stringify({type:e.type,geometry:entitySvg(e)}),reverseKey=JSON.stringify({type:e.type,geometry:entitySvg(G.reverse(e))});if(seen.has(key)||seen.has(reverseKey))duplicates++;seen.add(key);if(!G.isClosed(e)){if(e.type==='line')endpoints.push(e.a,e.b);else if(e.type==='arc')endpoints.push(G.arcPoint(e,0),G.arcPoint(e,1));else if(e.type==='polyline')endpoints.push(e.points[0],e.points.at(-1));else if(e.type==='bezier')endpoints.push(e.segments[0].p,e.segments.at(-1).p);}}
 const cells=new Map(),key=p=>`${Math.floor(p[0]/.01)},${Math.floor(p[1]/.01)}`;endpoints.forEach((p,i)=>{const k=key(p);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i);});
 const open=endpoints.filter((p,i)=>{const x=Math.floor(p[0]/.01),y=Math.floor(p[1]/.01);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of cells.get(`${x+dx},${y+dy}`)||[])if(i!==j&&G.distance(p,endpoints[j])<=.01)return false;return true;}).length;
 const oversize=cut.length&&(b.width>8000+.01||b.height>2500+.01),stockOver=cut.length&&(b.width>doc.stock.width+.01||b.height>doc.stock.height+.01);
 panel.innerHTML=`<h3>Before the first cut.</h3><p class="cad-panel-caption">2D GEOMETRY REVIEW / NOT CAM</p><ul class="cad-review-list"><li><strong>${cut.length} visible cut objects</strong>${cut.length?`${fmt(b.width)} × ${fmt(b.height)} ${unitLabel()} overall cut extents.`:'Add cut geometry to begin.'}</li><li><strong class="${open?'warn':'ok'}">${open} unmatched endpoints</strong>Checked within 0.01 mm. Connected line/arc loops are accepted; this does not detect every self-intersection.</li><li><strong class="${zero.length||duplicates?'warn':'ok'}">${zero.length} zero-length · ${duplicates} duplicate objects</strong>Duplicate detection compares whole objects, not partially overlapping segments.</li><li><strong class="${oversize?'warn':'ok'}">${oversize?'Exceeds the stated laser bed':'Within the stated laser bed dimensions'}</strong>8,000 × 2,500 mm. Rotation, material, thickness and job suitability need factory review.</li><li><strong class="${stockOver?'warn':'ok'}">${stockOver?'Larger than your selected sheet':'Selected sheet size'}</strong>${fmt(doc.stock.width)} × ${fmt(doc.stock.height)} ${unitLabel()}. This is a bounding-size check, not a nesting solution.</li></ul><button class="cad-panel-button" data-tool="stock">Edit sheet boundary</button><button class="cad-panel-button secondary" data-act="export">Export drawing ↓</button><p>Dimensions are non-associative. No kerf, lead-ins, toolpaths, bend compensation approval or machine instructions are generated. Check the exported file and confirm manufacturing requirements.</p>`;
}
panel.addEventListener('submit',e=>{
 if(e.target.id!=='cad-properties-form')return;e.preventDefault();const list=selected(),data=new FormData(e.target),f=factor();
 const n=name=>{const x=Number(data.get(name));if(!Number.isFinite(x))throw new Error('Enter finite numeric properties.');return x;},p=name=>[n(name+'x')*f,n(name+'y')*f];
 try{const out=list.map(raw=>{let e=G.clone(raw);if(data.has('dx')){if(n('scale')<=0)throw new Error('Scale must be positive.');e=G.transform(e,G.scaling(n('scale'),G.bounds(list).center));e=G.transform(e,G.rotation(n('angle'),G.bounds(list).center));e=G.transform(e,G.translation([n('dx')*f,n('dy')*f]));}
  else if(e.type==='line'){e.a=p('a');e.b=p('b');}else if(['circle','arc','ellipse'].includes(e.type)){e.center=p('center');if(e.type==='ellipse'){e.rx=n('rx')*f;e.ry=n('ry')*f;e.angle=n('angle');}else{e.r=n('r')*f;if(e.type==='arc'){e.start=G.rad(n('start'));e.end=G.rad(n('end'));}}}else if(['text','point'].includes(e.type)){e.at=p('at');if(e.type==='text'){e.height=n('height')*f;e.rotation=n('rotation');e.text=String(data.get('text'));}}
  const name=String(data.get('layer'));if(name!=='__mixed')e.layer=name;G.validateEntity(e);return e;});replaceEntities(list,out,'Properties updated.');
 }catch(error){log(error.message);}
});

function polygonEntity(center,edge,sides=6){const r=G.distance(center,edge)/(settings.polygonMode==='circumscribed'?Math.cos(Math.PI/sides):1),a=Math.atan2(edge[1]-center[1],edge[0]-center[0]);return G.entity('polyline',{points:Array.from({length:sides},(_,i)=>G.polar(center,r,a+i*G.TAU/sides)),closed:true},doc.currentLayer);}
function finishDrawing(close=false){
 if(!['line','polyline','spline'].includes(tool)){if(points.length)cancel(false);else if(lastTool!=='select')runAction(lastTool);return;}
 if(points.length<2){log('Pick at least two points before finishing.');return;}
 const current=doc.currentLayer;let list;
 if(tool==='line')list=points.slice(1).map((b,i)=>G.entity('line',{a:points[i],b},current));
 else if(tool==='spline'){const p=close?[...points,points[0]]:points;list=[G.spline(p,current)];if(close){const path=G.toPaper(list[0]);path.closed=true;list=G.fromPaper(path,current);}}
 else list=[G.entity('polyline',{points:G.clone(points),closed:close},current)];
 if(close&&tool==='line'&&G.distance(points[0],points.at(-1))>G.EPS)list.push(G.entity('line',{a:points.at(-1),b:points[0]},current));
 if(addEntities(list,`${close?'Closed ':''}${tool} created.`))setTool('select');
}
function feedPoint(p,raw=p){
 try{
 const layer=doc.currentLayer,n=points.length,hit=()=>hitTest(raw);
 if(['line','polyline','spline'].includes(tool)){if(n&&G.distance(points.at(-1),p)<G.EPS)return;points.push(p);}
 else if(tool==='rectangle'){if(!n)points.push(p);else if(addEntities([G.rectangle(points[0],p,layer)],'Rectangle created.'))setTool('select');}
 else if(tool==='circle'){if(!n)points.push(p);else if(addEntities([G.entity('circle',{center:points[0],r:G.distance(points[0],p)},layer)],'Circle created.'))setTool('select');}
 else if(tool==='arc'){points.push(p);if(points.length===3){const e=G.arcThrough(...points,layer);if(addEntities([e],'Three-point arc created.'))setTool('select');}}
 else if(tool==='ellipse'){points.push(p);if(points.length===3){const a=points[0],v=G.sub(points[1],a),u=G.unit(v),ry=Math.abs(G.dot(G.sub(p,a),[-u[1],u[0]]));if(addEntities([G.entity('ellipse',{center:a,rx:G.length(v),ry,angle:G.deg(Math.atan2(v[1],v[0]))},layer)],'Ellipse created.'))setTool('select');}}
 else if(tool==='polygon'){if(!n)points.push(p);else if(addEntities([polygonEntity(points[0],p,settings.sides)],`${settings.sides}-sided polygon created.`))setTool('select');}
 else if(tool==='slot'){if(addEntities([G.slot(p,settings.width,settings.height,layer)],'Slotted profile created.'))setTool('select');}
 else if(tool==='point')addEntities([G.entity('point',{at:p},'CONSTRUCTION')],'Construction point created.');
 else if(tool==='text'){if(addEntities([G.entity('text',{at:p,...settings.text},'ANNOTATION')],'Text placed.'))setTool('select');}
 else if(['dimension','dimh','dimv'].includes(tool)){points.push(p);if(points.length===3){if(G.distance(points[0],points[1])<G.EPS)throw new Error('Dimension points must differ.');const mode=tool==='dimh'?'horizontal':tool==='dimv'?'vertical':'aligned';if(addEntities([G.entity('dimension',{a:points[0],b:points[1],p,mode},'ANNOTATION')],'Non-associative dimension created.'))setTool('select');}}
 else if(tool==='radius'||tool==='diameter'){if(!n){const e=hit();if(!e||!['circle','arc'].includes(e.type))throw new Error('Click the edge of a circle or arc.');settings.circle=G.clone(e);points.push(p);}else{const c=settings.circle,angle=Math.atan2(p[1]-c.center[1],p[0]-c.center[0]);if(addEntities([G.entity('radial',{center:c.center,edge:G.polar(c.center,c.r,angle),p,diameter:tool==='diameter'},'ANNOTATION')],'Radial dimension created.'))setTool('select');}}
 else if(tool==='leader'){points.push(p);if(points.length===3){const a=points[0],b=points[1],v=G.unit(G.sub(b,a)),normal=[-v[1],v[0]],group=G.uid(),parts=[G.entity('line',{a,b},'ANNOTATION'),G.entity('line',{a:b,b:p},'ANNOTATION'),G.entity('line',{a,b:G.add(a,G.add(G.mul(v,4),G.mul(normal,1.5)))},'ANNOTATION'),G.entity('line',{a,b:G.add(a,G.sub(G.mul(v,4),G.mul(normal,1.5)))},'ANNOTATION'),G.entity('text',{at:G.add(p,[2,2]),...settings.text},'ANNOTATION')];parts.forEach(e=>e.group=group);if(addEntities(parts,'Leader and text created.'))setTool('select');}}
 else if(tool==='measure'){if(!n)points.push(p);else{const v=G.sub(p,points[0]);log(`Distance ${fmt(G.length(v))} ${unitLabel()} · ΔX ${fmt(v[0])} · ΔY ${fmt(v[1])} · angle ${G.deg(Math.atan2(v[1],v[0])).toFixed(3)}°`);setTool('select');}}
 else if(tool==='move'||tool==='copy'){if(!n)points.push(p);else{applyMatrix(G.translation(G.sub(p,points[0])),tool==='copy');setTool('select');}}
 else if(tool==='offset'){if(!n){const e=hit();if(!e)throw new Error('Click geometry to offset.');settings.target=e;points.push(p);}else{const list=G.offset(settings.target,settings.distance,p);addEntities(list,'Offset created.');points=[];settings.target=null;}}
 else if(tool==='trim'){const e=hit();if(!e)throw new Error('Click a line, circle or arc segment.');replaceEntities([e],G.trim(e,visibleGeometry().filter(x=>!['text','dimension','radial','point'].includes(x.type)),raw),'Segment trimmed.');}
 else if(tool==='extend'){const e=hit();if(!e)throw new Error('Click near a line endpoint.');replaceEntities([e],[G.extend(e,visibleGeometry().filter(x=>!['text','dimension','radial','point'].includes(x.type)),raw)],'Line extended.');}
 else if(tool==='fillet'||tool==='chamfer'){const e=hit();if(!e||e.type!=='line')throw new Error('Select a straight line. Explode a polyline if needed.');if(!n){settings.first=e;points.push(p);}else{if(e.id===settings.first.id)throw new Error('Select a different second line.');replaceEntities([settings.first,e],G.corner(settings.first,e,settings.radius,tool),`${tool} created.`);points=[];settings.first=null;}}
 else if(tool==='break'){const e=hit();if(!e)throw new Error('Click a line or arc.');let split;
  if(e.type==='line'){const q=G.nearest(e,raw).point;if(Math.min(G.distance(q,e.a),G.distance(q,e.b))<G.EPS)throw new Error('Choose a point inside the line.');split=[G.entity('line',{a:e.a,b:q},e.layer),G.entity('line',{a:q,b:e.b},e.layer)];}
  else if(e.type==='arc'){const q=G.nearest(e,raw).point;if(Math.min(G.distance(q,G.arcPoint(e,0)),G.distance(q,G.arcPoint(e,1)))<G.EPS)throw new Error('Choose a point inside the arc.');const a=Math.atan2(q[1]-e.center[1],q[0]-e.center[0]);split=[{...G.clone(e),id:G.uid(),end:a},{...G.clone(e),id:G.uid(),start:a}];}
  else throw new Error('Break supports lines and arcs. Explode a polyline first.');replaceEntities([e],split,'Object split at the selected point.');
 }
 $('#cad-prompt').textContent=toolPrompt();renderPreview();
 }catch(error){log(error.message);if(tool==='arc'&&points.length===3)points.pop();if(tool==='ellipse'&&points.length===3)points.pop();$('#cad-prompt').textContent=toolPrompt();}
}
function centerFields(center=G.bounds(selected()).center){return [field('cx','Centre X',G.clean(center[0]/factor())),field('cy','Centre Y',G.clean(center[1]/factor()))];}
function download(text,name,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function filename(extension){return (doc.name.replace(/[^a-z0-9 _-]/gi,'').trim().slice(0,80)||'drawing')+extension;}
function workerCall(action,payload){
 if(!worker){worker=new Worker(new URL('./io-worker.js',import.meta.url),{type:'module'});worker.onmessage=e=>{const r=requests.get(e.data.id);if(!r)return;requests.delete(e.data.id);e.data.error?r.reject(new Error(e.data.error)):r.resolve(e.data.value);};worker.onerror=()=>{for(const r of requests.values())r.reject(new Error('The file worker could not complete this operation. Try a smaller file or reload the page.'));requests.clear();worker.terminate();worker=null;};}
 return new Promise((resolve,reject)=>{const id=++workerId;requests.set(id,{resolve,reject});worker.postMessage({id,action,payload});});
}
function exportDialog(){showForm('Take your drawing.',[field('format','File format','dxf','select',{choices:[['dxf','DXF — editable CAD geometry'],['svg','SVG — vector drawing'],['json','Sachin CAD — complete project']]}),field('units','DXF units',doc.units,'select',{choices:[['mm','Millimetres'],['in','Inches']]}),checkbox('Cut and bend geometry only','profiles',false),checkbox('Selected objects only','selection',false)],async v=>{
 const subset=v.selection?new Set(selected().map(e=>e.id)):null;if(v.selection&&!subset.size)throw new Error('Select objects before exporting a selection.');
 if(v.format==='json'){download(JSON.stringify(doc,null,2),filename('.sachincad.json'),'application/json');}
 else if(v.format==='svg'){const copy=G.clone(doc);if(subset)copy.entities=copy.entities.filter(e=>subset.has(e.id));download(exportSvg(copy,{profileOnly:v.profiles}),filename('.svg'),'image/svg+xml');}
 else{const button=options.querySelector('button[type=submit]');button.disabled=true;button.textContent='Preparing DXF…';try{const result=await workerCall('export',{doc,options:{units:v.units,profileOnly:v.profiles,selectedIds:subset}});download(result.text,filename('.dxf'),'application/dxf');log(`DXF download requested: ${result.count} entities in ${v.units}. ${result.warnings.join(' ')}`);}finally{button.disabled=false;button.textContent='Download';}}
 analytics.track('cad_export',{file_type:v.format,export_scope:v.selection?'selection':v.profiles?'profiles':'all'});if(v.format!=='dxf')log(`${v.format.toUpperCase()} download requested.`);
 },{description:'DXF/SVG exports use visible layers. Profile mode includes cut/bend geometry. Dimensions in a full DXF become editable lines and text. Project files preserve the complete document, including hidden layers.',submit:'Download ↓'});
 const formatField=options.elements.format;
 const sync=()=>{const project=formatField.value==='json';options.elements.units.disabled=formatField.value!=='dxf';for(const name of ['profiles','selection']){options.elements[name].disabled=project;if(project)options.elements[name].checked=false;}};
 formatField.addEventListener('change',sync);sync();
}
function openDialog(){showForm('Open a drawing.',[field('units','DXF import units','auto','select',{choices:[['auto','Use DXF header; missing units → mm'],['mm','Override: millimetres'],['in','Override: inches']]}),checkbox('Merge into the current drawing','merge',false)],v=>{settings.importOptions=v;$('#cad-file').value='';$('#cad-file').click();},{description:'ASCII DXF up to 20 MB or a Sachin CAD project. Native DWG and binary DXF are not supported. Your file is read on this device.',submit:'Choose file ↗'});}
$('#cad-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;const opts=settings.importOptions||{units:'auto',merge:false};$('#cad-busy').hidden=false;
 try{if(file.size>20*1024*1024)throw new Error('Choose a file smaller than 20 MB.');const text=await file.text();let imported,warnings=[],skipped={};
  if(/\.dxf$/i.test(file.name)){const result=await workerCall('import',{text,options:{units:opts.units}});imported=result.doc;warnings=result.warnings;skipped=result.skipped;}
  else imported=validateDocument(JSON.parse(text));
  imported.name=file.name.replace(/\.(sachincad\.)?(json|dxf|sachincad)$/i,'').slice(0,100);
  let ids=[];const importedOk=commit(`${imported.entities.length} entities ${opts.merge?'merged':'opened'}.`,next=>{if(opts.merge){for(const l of imported.layers)if(!next.layers.some(x=>x.name===l.name))next.layers.push(l);const list=imported.entities.map(e=>({...e,id:G.uid(),group:undefined}));ids=list.map(e=>e.id);next.entities.push(...list);}else{Object.assign(next,imported);ids=next.entities.map(e=>e.id);}});if(!importedOk)throw new Error('The file could not be added to this drawing; see the command log.');selection.clear();cancel(false);renderAll();fit();
  analytics.track('cad_import',{file_type:/\.dxf$/i.test(file.name)?'dxf':'json'});
  const skippedText=Object.entries(skipped).map(([type,n])=>`${n} ${type}`).join(', ');
  if(warnings.length||skippedText)showForm('Import report.',[],()=>{},{description:`${imported.entities.length} entities read. ${warnings.join(' ')} ${skippedText?'Skipped: '+skippedText+'.':''} Review the geometry before exporting or manufacturing.`,submit:'Continue'});
 }catch(error){log(`Import failed: ${error.message}`);}finally{$('#cad-busy').hidden=true;}
});
function help(){options.innerHTML=`<h2>A command for your idea.</h2><p>Click a toolbar tool or enter its command. Type exact coordinates into the command field. Enter finishes line/polyline/spline chains; Escape cancels. <a href="/cad-guide.html">Read the full guide ↗</a></p><label class="cad-field"><span>Find a tool</span><input id="cad-help-search" type="search" placeholder="Try OFFSET, DXF or dimensions"></label><div class="cad-help-list">${TOOLS.map(t=>`<div data-search="${G.esc((t.command+' '+t.label+' '+t.help).toLowerCase())}"><b>${G.esc(t.command)}</b><span>${G.esc(t.help)}<small>${G.esc(t.label)}</small></span></div>`).join('')}<div data-search="save export open dxf svg json"><b>OPEN / EXPORT / SAVE</b><span>Open DXF or a project. Export DXF/SVG or save a complete project.</span></div><div data-search="undo redo zoom fit"><b>UNDO / REDO / ZE</b><span>Undo, redo or fit the drawing to the viewport.</span></div><div data-search="coordinates polar relative absolute"><b>x,y / @dx,dy / @r&lt;a</b><span>Absolute, relative and polar coordinate entry. Plain numbers specify a circle/polygon radius or ellipse minor radius when prompted.</span></div></div><div class="cad-dialog-actions"><button type="button" data-close-cad>Close</button></div>`;options.onsubmit=e=>e.preventDefault();$('#cad-help-search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();options.querySelectorAll('[data-search]').forEach(row=>row.hidden=!row.dataset.search.includes(q));});if(!dialog.open)dialog.showModal();}
function runAction(id,args=[]){
 try{
 const f=factor(),list=selected();
 if(['select','pan','line','polyline','rectangle','circle','arc','ellipse','spline','point','dimension','dimh','dimv','radius','diameter','measure','trim','extend','break'].includes(id)){setTool(id);return;}
 if(id==='move'||id==='copy'){needSelection();setTool(id);return;}
 if(id==='polygon'){showForm('A profile with a point of view.',[field('sides','Number of sides',6,'number',{min:3,max:360}),field('mode','Radius convention','inscribed','select',{choices:[['inscribed','Vertices on the radius circle'],['circumscribed','Sides tangent to the radius circle']]})],v=>{if(!Number.isInteger(v.sides))throw new Error('Sides must be an integer.');setTool('polygon',{sides:v.sides,polygonMode:v.mode});},{submit:'Place polygon ↗'});return;}
 if(id==='slot'){showForm('A slot, precisely.',[field('width',`Overall length (${unitLabel()})`,100/f,'number',{min:.0001}),field('height',`Width (${unitLabel()})`,20/f,'number',{min:.0001})],v=>{if(v.width<v.height)throw new Error('Overall length must be at least the width.');setTool('slot',{width:v.width*f,height:v.height*f});},{submit:'Place slot ↗'});return;}
 if(['text','leader'].includes(id)){showForm(id==='text'?'Put a note to it.':'Lead with the detail.',[field('text','Label','PART 01','textarea',{wide:true}),field('height',`Text height (${unitLabel()})`,3.5/f,'number',{min:.0001}),field('rotation','Rotation °',0)],v=>setTool(id,{text:{text:v.text,height:v.height*f,rotation:v.rotation}}),{submit:'Place annotation ↗'});return;}
 if(['rotate','scale','mirror'].includes(id)){needSelection();const fieldName=id==='scale'?'amount':'angle';showForm(id==='rotate'?'A different angle.':id==='scale'?'Change the scale.':'Another side of the idea.',[...centerFields(),field(fieldName,id==='scale'?'Uniform scale factor':id==='mirror'?'Mirror-axis angle °':'Rotation angle °',id==='scale'?1:id==='mirror'?90:45),checkbox('Create a copy','copy',false)],v=>{if(id==='scale'&&v.amount<=0)throw new Error('Scale must be greater than zero.');const c=[v.cx*f,v.cy*f],matrix=id==='rotate'?G.rotation(v.angle,c):id==='scale'?G.scaling(v.amount,c):G.reflection(v.angle,c);applyMatrix(matrix,v.copy);},{description:id==='mirror'?'0° is a horizontal mirror axis; 90° is vertical. Angles are counterclockwise.':'Centre coordinates use the current drawing units.'});return;}
 if(id==='offset'){showForm('A parallel possibility.',[field('distance',`Offset distance (${unitLabel()})`,5/f,'number',{min:.000001})],v=>setTool('offset',{distance:v.distance*f}),{description:'After setting the distance, click an object and then the side of its offset. Closed-profile offsets use miter joins.',submit:'Choose geometry ↗'});return;}
 if(id==='fillet'||id==='chamfer'){showForm(id==='fillet'?'Round the corner.':'Give the corner an edge.',[field('radius',`${id==='fillet'?'Radius':'Equal chamfer distance'} (${unitLabel()})`,10/f,'number',{min:.000001})],v=>{const chosen=selected();if(chosen.length===2)replaceEntities(chosen,G.corner(chosen[0],chosen[1],v.radius*f,id),`${id} created.`);else setTool(id,{radius:v.radius*f});},{description:'Select two straight line entities first, or choose the lines after setting the value.'});return;}
 if(id==='align'){needSelection();const b=G.bounds(list);showForm('Bring the points together.',[field('ax','Source 1 X',b.x/f),field('ay','Source 1 Y',b.y/f),field('bx','Source 2 X',(b.x+Math.max(1,b.width))/f),field('by','Source 2 Y',b.y/f),field('cx','Target 1 X',b.x/f),field('cy','Target 1 Y',b.y/f),field('dx','Target 2 X',(b.x+Math.max(1,b.width))/f),field('dy','Target 2 Y',b.y/f),checkbox('Scale to match target distance','scale',false)],v=>{const a=[v.ax*f,v.ay*f],b=[v.bx*f,v.by*f],c=[v.cx*f,v.cy*f],d=[v.dx*f,v.dy*f],u=G.sub(b,a),w=G.sub(d,c);if(Math.min(G.length(u),G.length(w))<G.EPS)throw new Error('Each reference pair needs two different points.');const angle=G.deg(Math.atan2(w[1],w[0])-Math.atan2(u[1],u[0])),scale=v.scale?G.length(w)/G.length(u):1;const out=list.map(e=>{let n=G.transform(e,G.translation(G.mul(a,-1)));n=G.transform(n,G.scaling(scale));n=G.transform(n,G.rotation(angle));return G.transform(n,G.translation(c));});replaceEntities(list,out,'Selection aligned.');},{description:'Two-point alignment rotates and moves the selection. Scaling is optional.'});return;}
 if(id==='array'){needSelection();showForm('Repeat with purpose.',[field('columns','Columns',3,'number',{min:1,max:1000}),field('rows','Rows',2,'number',{min:1,max:1000}),field('dx',`Column spacing (${unitLabel()})`,50/f),field('dy',`Row spacing (${unitLabel()})`,50/f)],v=>{if(!Number.isInteger(v.columns)||!Number.isInteger(v.rows)||v.columns*v.rows*list.length>MAX_ENTITIES)throw new Error('Choose whole rows/columns within the drawing entity limit.');const copies=[];for(let row=0;row<v.rows;row++)for(let col=0;col<v.columns;col++)if(row||col)for(const e of list){const n=G.transform(e,G.translation([col*v.dx*f,row*v.dy*f]));n.id=G.uid();delete n.group;copies.push(n);}addEntities(copies,`${copies.length} array copies created.`);});return;}
 if(id==='polararray'){needSelection();showForm('Around one good idea.',[...centerFields([0,0]),field('count','Total instances (including original)',6,'number',{min:2,max:1000}),field('sweep','Sweep angle °',360,'number',{min:.0001,max:360}),checkbox('Rotate each copy with the array','rotate',true)],v=>{if(!Number.isInteger(v.count)||v.count*list.length>MAX_ENTITIES)throw new Error('Choose a whole instance count within the entity limit.');const c=[v.cx*f,v.cy*f],b=G.bounds(list).center,copies=[];for(let i=1;i<v.count;i++){const angle=v.sweep/(Math.abs(v.sweep-360)<G.EPS?v.count:v.count-1)*i,matrix=G.rotation(angle,c),rotated=G.transform(G.entity('point',{at:b}),matrix).at;for(const e of list){const n=G.transform(e,v.rotate?matrix:G.translation(G.sub(rotated,b)));n.id=G.uid();delete n.group;copies.push(n);}}addEntities(copies,`${copies.length} polar-array copies created.`);});return;}
 if(id==='join'){const chosen=needSelection(2);replaceEntities(chosen,[G.join(chosen)],'Connected objects joined.');return;}
 if(id==='explode'){const chosen=needSelection(),parts=chosen.flatMap(G.explode).map(e=>({...e,id:G.uid(),group:undefined}));replaceEntities(chosen,parts,'Geometry exploded. Bezier curves, if present, were flattened to 0.02 mm.');return;}
 if(id==='reverse'){const chosen=needSelection();replaceEntities(chosen,chosen.map(G.reverse),'Path directions reversed.');return;}
 if(['union','subtract','intersect'].includes(id)){const chosen=needSelection(2);replaceEntities(chosen,G.boolean(chosen,id==='union'?'unite':id),`${id} completed with editable vector geometry.`);return;}
 if(id==='group'||id==='ungroup'){const chosen=needSelection(id==='group'?2:1),ids=new Set(chosen.map(e=>e.id)),group=G.uid();commit(id==='group'?'Selection grouped.':'Selection ungrouped.',next=>next.entities.forEach(e=>{if(ids.has(e.id)){if(id==='group')e.group=group;else delete e.group;}}));return;}
 if(id==='erase'){const chosen=needSelection(),ids=new Set(chosen.map(e=>e.id));commit(`${ids.size} objects erased.`,next=>{next.entities=next.entities.filter(e=>!ids.has(e.id));},{select:[]});return;}
 if(id==='hatch'){const chosen=needSelection();if(chosen.length!==1||!G.isClosed(chosen[0]))throw new Error('Select one closed profile to hatch.');showForm('Give the section its language.',[field('spacing',`Line spacing (${unitLabel()})`,5/f,'number',{min:.00001}),field('angle','Line angle °',45)],v=>{const parts=G.hatch(chosen[0],v.spacing*f,v.angle),group=G.uid();parts.forEach(e=>e.group=group);addEntities(parts,'Hatch lines created on ANNOTATION.');},{description:'Creates real editable line entities clipped to the profile. Profile-only DXF export excludes this annotation layer.'});return;}
 if(id==='area'){const chosen=needSelection(),area=chosen.reduce((n,e)=>n+G.area(e),0),length=chosen.reduce((n,e)=>n+G.perimeter(e),0);log(`Sum of closed-loop areas: ${(area/f/f).toFixed(4)} ${unitLabel()}². Total path length: ${fmt(length)} ${unitLabel()}. Holes are not subtracted automatically.`);return;}
 if(id==='new'){showForm('An open sheet of possibility.',[field('name','Drawing name','Untitled drawing','text',{wide:true}),field('units','Display units','mm','select',{choices:[['mm','Millimetres'],['in','Inches']]})],v=>{const fresh=newDocument();fresh.name=v.name.slice(0,100);fresh.units=v.units;commit('New drawing created. Undo restores the previous drawing.',next=>Object.assign(next,fresh),{select:[]});cancel(false);fit();},{description:'Download your current project to keep a permanent copy. This action can be undone in the current session.',submit:'Create drawing ↗'});return;}
 if(id==='sample'){showForm('Start with a working example.',[],()=>{commit('Example drawing loaded. Undo restores the previous drawing.',next=>Object.assign(next,sampleDocument()),{select:[]});cancel(false);fit();},{description:'Replace the current drawing with an editable demonstration plate. Download your project first if you want to keep it.',submit:'Load example ↗'});return;}
 if(id==='open'){openDialog();return;}if(id==='export'){exportDialog();return;}if(id==='save'){download(JSON.stringify(doc,null,2),filename('.sachincad.json'),'application/json');analytics.track('cad_export',{file_type:'json',export_scope:'all'});log('Editable project download requested.');return;}
 if(id==='undo'){undo();return;}if(id==='redo'){redoAction();return;}if(id==='fit'){fit();return;}if(id==='zoom-in'){zoomAt([W/2,H/2],1.25);return;}if(id==='zoom-out'){zoomAt([W/2,H/2],.8);return;}
 if(id==='selectall'){selection=new Set(selectable().map(e=>e.id));renderAll();return;}
 if(id==='help'){help();return;}if(id==='review'){activePanel='job';$('#cad-inspector').classList.add('is-open');renderPanel();return;}
 if(id==='inspector'){$('#cad-inspector').classList.toggle('is-open');return;}
 if(id==='fullscreen'){app.classList.toggle('is-expanded');document.body.style.overflow=app.classList.contains('is-expanded')?'hidden':'';const b=$('[data-act=fullscreen]');b.setAttribute('aria-label',app.classList.contains('is-expanded')?'Exit expanded workspace':'Expand workspace');return;}
 if(id==='stock'||id==='plate'||id==='bracket'||id==='blank'){fabricationDialog(id);return;}
 if(id==='print'){const sheet=document.createElement('div');sheet.className='cad-print-sheet';sheet.innerHTML=`<h1>${G.esc(doc.name)}</h1><p>Sachin CAD · drawing units ${unitLabel()} · printed to fit, not a verified 1:1 plot</p>${exportSvg(doc)}<small>Independent browser-based drafting by Sachin Industries, Bhosari, Pune. Verify dimensions and manufacturing requirements.</small>`;document.body.append(sheet);document.body.classList.add('cad-printing');const clean=()=>{sheet.remove();document.body.classList.remove('cad-printing');window.removeEventListener('afterprint',clean);};window.addEventListener('afterprint',clean);window.print();return;}
 if(id==='purge'){let removed=0;const seen=new Set();commit('Duplicate and zero-length cleanup completed.',next=>{next.entities=next.entities.filter(e=>{if(!editable(e)||['text','dimension','radial','point'].includes(e.type))return true;const key=e.layer+'|'+entitySvg(e),rev=e.layer+'|'+entitySvg(G.reverse(e));if(G.perimeter(e)<.001||seen.has(key)||seen.has(rev)){removed++;return false;}seen.add(key);return true;});});log(`${removed} whole duplicate or zero-length objects removed.`);return;}
 throw new Error('Type HELP to see supported commands.');
 }catch(error){log(error.message);}
}
function fabricationDialog(id){
 const f=factor(),u=unitLabel();
 if(id==='stock'){showForm('A boundary for the idea.',[field('width',`Sheet width (${u})`,doc.stock.width/f,'number',{min:.001}),field('height',`Sheet height (${u})`,doc.stock.height/f,'number',{min:.001}),checkbox('Show sheet boundary in model space','show',true)],v=>{commit('Sheet boundary updated.',next=>next.stock={width:v.width*f,height:v.height*f,show:v.show});fit();},{description:'This is a visual sheet boundary and bounding-size check. It does not perform nesting or generate toolpaths.'});return;}
 if(id==='plate'){showForm('Make a mounting plate.',[field('width',`Width (${u})`,360/f,'number',{min:.001}),field('height',`Height (${u})`,220/f,'number',{min:.001}),field('radius',`Corner radius (${u})`,12/f,'number',{min:0}),field('hole',`Hole diameter (${u})`,14/f,'number',{min:.001}),field('inset',`Hole centre inset (${u})`,25/f,'number',{min:.001}),field('slotWidth',`Slot length, 0 = none (${u})`,100/f,'number',{min:0}),field('slotHeight',`Slot width (${u})`,28/f,'number',{min:.001}),field('x',`Origin X (${u})`,0),field('y',`Origin Y (${u})`,0)],v=>{
  const w=v.width*f,h=v.height*f,r=v.radius*f,hole=v.hole*f,inset=v.inset*f,sw=v.slotWidth*f,sh=v.slotHeight*f;
  if(r>Math.min(w,h)/2||inset<=hole/2||inset>=Math.min(w,h)/2||hole>=Math.min(w,h)-2*inset)throw new Error('Adjust radius, hole size and inset so the four holes fit inside the plate.');
  if(sw&&(sw<sh||sw>=w-2*inset-hole||sh>=h-2*inset-hole))throw new Error('The central slot must fit between the mounting holes, and its length must be at least its width.');
  const a=[v.x*f,v.y*f],outline=G.rectangle(a,G.add(a,[w,h]),'CUT',r),centers=[inset,w-inset].flatMap(x=>[inset,h-inset].map(y=>G.add(a,[x,y])));
  if(centers.some(center=>!G.toPaper(outline).contains(G.pt(center))||G.nearest(outline,center).distance<hole/2))throw new Error('A mounting hole intersects a rounded corner. Increase its inset or reduce the radius/hole size.');
  const parts=[outline,...centers.map(center=>G.entity('circle',{center,r:hole/2}))];
  if(sw)parts.push(G.slot(G.add(a,[w/2,h/2]),sw,sh));addEntities(parts,'Parametric mounting-plate geometry created.');fit();
 },{description:'Creates a rounded outline, four circular holes and an optional central slot as editable native geometry.',submit:'Create plate ↗'});return;}
 if(id==='blank'){showForm('Start with a straight cut.',[field('width',`Blank width (${u})`,500/f,'number',{min:.001}),field('height',`Blank height (${u})`,300/f,'number',{min:.001}),field('x',`Origin X (${u})`,0),field('y',`Origin Y (${u})`,0),checkbox('Add overall dimensions','dims',true)],v=>{const a=[v.x*f,v.y*f],b=G.add(a,[v.width*f,v.height*f]),parts=[G.rectangle(a,b)];if(v.dims)parts.push(G.entity('dimension',{a,b:[b[0],a[1]],p:G.add(a,[0,-20]),mode:'horizontal'},'ANNOTATION'),G.entity('dimension',{a:[b[0],a[1]],b,p:G.add(b,[20,0]),mode:'vertical'},'ANNOTATION'));addEntities(parts,'Editable straight-cut blank created.');fit();},{description:'Creates a rectangular outline for a shearing or laser-cutting enquiry. The team must confirm material, capacity and lead time.',submit:'Create blank ↗'});return;}
 if(id==='bracket'){showForm('From outside legs to a flat layout.',[field('a',`Outside leg A (${u})`,100/f,'number',{min:.001}),field('b',`Outside leg B (${u})`,60/f,'number',{min:.001}),field('length',`Length along bend (${u})`,250/f,'number',{min:.001}),field('t',`Material thickness (${u})`,3/f,'number',{min:.001}),field('r',`Inside bend radius (${u})`,3/f,'number',{min:0}),field('k','K-factor',.42,'number',{min:0,max:1}),field('angle','Bend angle ° (0 = flat)',90,'number',{min:.001,max:179.999}),field('x',`Origin X (${u})`,0),field('y',`Origin Y (${u})`,0)],v=>{
  const input={a:v.a*f,b:v.b*f,t:v.t*f,r:v.r*f,k:v.k,angle:v.angle},calc=G.bendAllowance(input),origin=[v.x*f,v.y*f],end=G.add(origin,[calc.flat,v.length*f]),bendX=origin[0]+calc.bendLine;
  addEntities([G.rectangle(origin,end),G.entity('line',{a:[bendX,origin[1]],b:[bendX,end[1]]},'BEND'),G.entity('dimension',{a:origin,b:[end[0],origin[1]],p:G.add(origin,[0,-20]),mode:'horizontal'},'ANNOTATION'),G.entity('text',{at:G.add(origin,[0,v.length*f+10]),height:4,rotation:0,text:`BEND ${v.angle}deg | t=${G.num(input.t)}mm R=${G.num(input.r)}mm K=${v.k}`},'ANNOTATION')],`Bend estimate: allowance ${fmt(calc.allowance)} ${u}; deduction ${fmt(calc.deduction)} ${u}; flat length ${fmt(calc.flat)} ${u}. Verify with tooling and material.`);fit();
 },{description:'One bend only. Outside legs are measured to their theoretical sharp outside intersection. Flat length = A + B − [2(R + t)tan(angle/2) − angleRadians(R + Kt)]. No springback, grain direction or tooling approval is included.',submit:'Create estimated layout ↗'});}
}
function layerAction(id){
 if(id==='layer-add'){showForm('Give each line a purpose.',[field('name','Layer name','DETAIL','text',{wide:true}),field('role','Purpose','cut','select',{choices:['cut','bend','annotation','construction']})],v=>{const name=v.name.trim().slice(0,60);if(!name||doc.layers.some(l=>l.name===name))throw new Error('Choose a unique layer name.');commit(`Layer ${name} created.`,next=>{next.layers.push({name,color:'#dafa70',role:v.role,visible:true,locked:false,dash:'solid'});next.currentLayer=name;});});return;}
 if(id==='layer-purge'){commit('Empty custom layers removed.',next=>{const defaults=new Set(defaultLayers().map(l=>l.name)),used=new Set(next.entities.map(e=>e.layer));next.layers=next.layers.filter(l=>defaults.has(l.name)||used.has(l.name)||l.name===next.currentLayer);});return;}
 runAction(id);
}
app.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.ribbon){ribbon=button.dataset.ribbon;renderRibbon();return;}
 if(button.dataset.panel){activePanel=button.dataset.panel;renderPanel();return;}
 if(button.dataset.tool){runAction(button.dataset.tool);return;}
 if(button.dataset.act){runAction(button.dataset.act);return;}
 if(button.dataset.inspectAct){layerAction(button.dataset.inspectAct);return;}
 if(button.dataset.toggle){const key=button.dataset.toggle;flags[key]=!flags[key];if(key==='ortho'&&flags.ortho)flags.polar=false;if(key==='polar'&&flags.polar)flags.ortho=false;renderToggles();setView();return;}
 if(button.dataset.layerCurrent){commit(`Current layer: ${button.dataset.layerCurrent}`,next=>next.currentLayer=button.dataset.layerCurrent);return;}
 if(button.dataset.layerAct){const name=button.dataset.layer,key=button.dataset.layerAct;commit(`Layer ${name} ${key} changed.`,next=>{const l=next.layers.find(l=>l.name===name);l[key]=!l[key];});return;}
});
function renderToggles(){$$('[data-toggle]').forEach(b=>b.setAttribute('aria-pressed',String(flags[b.dataset.toggle])));}
panel.addEventListener('change',e=>{const t=e.target;let name,key,value;if(t.dataset.layerColor){name=t.dataset.layerColor;key='color';value=t.value;}if(t.dataset.layerRole){name=t.dataset.layerRole;key='role';value=t.value;}if(t.dataset.layerDash){name=t.dataset.layerDash;key='dash';value=t.value;}if(name)commit(`Layer ${name} updated.`,next=>next.layers.find(l=>l.name===name)[key]=value);});
$('#cad-name').addEventListener('change',e=>{const name=e.target.value.trim();if(!name){e.target.value=doc.name;return;}commit('Drawing renamed.',next=>next.name=name.slice(0,100));});
$('#cad-units').addEventListener('change',e=>{const units=e.target.value;commit(`Display units changed to ${units}; physical geometry stays the same.`,next=>next.units=units);});
$('#cad-grid-step').addEventListener('change',e=>{const step=Number(e.target.value)*factor();if(!Number.isFinite(step)||step<=0){e.target.value=gridStep/factor();log('Grid spacing must be positive.');return;}gridStep=step;setView();});
$('[data-toggle=snap]').addEventListener('contextmenu',e=>{e.preventDefault();showForm('Snap to what matters.',Object.keys(snapModes).map(k=>checkbox(k,k,snapModes[k])),v=>Object.assign(snapModes,v),{description:'Right-click SNAP to return to these settings. Object snaps take priority over grid and direction constraints.'});});
const touches=new Map();let pinch=null;
canvas.addEventListener('pointerdown',e=>{
 if(e.button===2)return;e.preventDefault();canvas.focus();canvas.setPointerCapture(e.pointerId);const s=eventPoint(e),raw=fromScreen(s);
 if(e.pointerType==='touch'){touches.set(e.pointerId,s);if(touches.size===2){const [a,b]=[...touches.values()];pinch={distance:G.distance(a,b),center:G.mul(G.add(a,b),.5)};interaction={kind:'pinch'};return;}}
 if(e.button===1||spacePan||tool==='pan'){interaction={kind:'pan',screen:s,center:[...view.center]};stage.classList.add('is-panning');return;}
 cursor=snapped(raw);
 const grip=e.target.closest('[data-grip]');
 if(tool==='select'&&grip){const original=doc.entities.find(x=>x.id===grip.dataset.e);if(!original||!editable(original))return;interaction={kind:'grip',original:G.clone(original),grip:grip.dataset.grip,index:Number(grip.dataset.gripIndex),screen:s};objects.style.opacity='.35';grips.style.opacity='.2';return;}
 if(tool==='select'){
  const hit=hitTest(raw);
  if(hit){const members=hit.group?selectable().filter(e=>e.group===hit.group).map(e=>e.id):[hit.id];if(e.shiftKey){if(members.every(id=>selection.has(id)))members.forEach(id=>selection.delete(id));else members.forEach(id=>selection.add(id));renderAll();return;}
   const already=selection.has(hit.id);if(!already)selection=new Set(members);interaction={kind:'move',start:raw,screen:s,originals:selected().map(G.clone),moved:false};renderAll();
  }else{interaction={kind:'box',start:raw,screen:s,add:e.shiftKey,originalSelection:new Set(selection)};if(!e.shiftKey){selection.clear();renderAll();}}
 }else interaction={kind:'click',screen:s,raw};
});
canvas.addEventListener('pointermove',e=>{
 const s=eventPoint(e);if(e.pointerType==='touch'&&touches.has(e.pointerId)){touches.set(e.pointerId,s);if(touches.size>=2){const [a,b]=[...touches.values()],center=G.mul(G.add(a,b),.5),dist=G.distance(a,b);if(pinch&&pinch.distance){zoomAt(center,dist/pinch.distance);view.center=G.add(view.center,[-(center[0]-pinch.center[0])/view.zoom,(center[1]-pinch.center[1])/view.zoom]);setView();}pinch={distance:dist,center};return;}}
 if(interaction?.kind==='pan'){view.center=[interaction.center[0]-(s[0]-interaction.screen[0])/view.zoom,interaction.center[1]+(s[1]-interaction.screen[1])/view.zoom];setView();return;}
 const raw=fromScreen(s);cursor=snapped(raw);$('#cad-coordinates').textContent=`X ${fmt(cursor[0])} · Y ${fmt(cursor[1])}`;
 if(interaction?.kind==='move'){interaction.moved=G.distance(s,interaction.screen)>3;if(interaction.moved)objects.style.opacity='.35';}
 renderPreview();
});
canvas.addEventListener('pointerup',e=>{
 const s=eventPoint(e),raw=fromScreen(s),active=interaction;touches.delete(e.pointerId);if(active?.kind==='pinch'){if(touches.size<2)pinch=null;if(!touches.size)interaction=null;return;}
 if(!active)return;cursor=snapped(raw);interaction=null;stage.classList.remove('is-panning');objects.style.opacity='';grips.style.opacity='';
 if(active.kind==='pan'){renderPreview();return;}
 if(active.kind==='grip'){if(G.distance(s,active.screen)>2){const changed=gripEntity(active.original,active.grip,active.index,cursor);replaceEntities([active.original],[changed],'Grip geometry updated.');}}
 else if(active.kind==='move'&&active.moved){const out=active.originals.map(e=>G.transform(e,G.translation(G.sub(raw,active.start))));replaceEntities(active.originals,out,'Selection moved.');}
 else if(active.kind==='box'){
  if(G.distance(s,active.screen)>4){const a=active.start,b=raw,x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]),x2=Math.max(a[0],b[0]),y2=Math.max(a[1],b[1]),crossing=s[0]<active.screen[0],box=G.toPaper(G.rectangle([x,y],[x2,y2]));selection=active.add?active.originalSelection:new Set();
   for(const e of selectable()){const bb=sceneBounds.get(e.id);if(!bb)continue;const inside=bb.x>=x&&bb.y>=y&&bb.x+bb.width<=x2&&bb.y+bb.height<=y2;let touches=inside;if(crossing&&!inside&&bb.x<=x2&&bb.x+bb.width>=x&&bb.y<=y2&&bb.y+bb.height>=y){try{touches=G.toPaper(e).getIntersections(box).length>0;}catch{}}
    if(crossing?touches:inside){if(e.group)selectable().filter(x=>x.group===e.group).forEach(e=>selection.add(e.id));else selection.add(e.id);}
   }
  }renderAll();
 }else if(active.kind==='click'&&G.distance(s,active.screen)<8)feedPoint(cursor,raw);
 renderPreview();
});
canvas.addEventListener('pointercancel',()=>{interaction=null;touches.clear();pinch=null;objects.style.opacity='';grips.style.opacity='';stage.classList.remove('is-panning');renderPreview();});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomAt(eventPoint(e),Math.exp(-Math.max(-150,Math.min(150,e.deltaY))*.0025));},{passive:false});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(['line','polyline','spline'].includes(tool)&&points.length>=2)finishDrawing(false);else cancel();});
const aliases={l:'line',line:'line',pl:'polyline',pline:'polyline',polyline:'polyline',rec:'rectangle',rectangle:'rectangle',c:'circle',circle:'circle',a:'arc',arc:'arc',el:'ellipse',ellipse:'ellipse',pol:'polygon',polygon:'polygon',spl:'spline',spline:'spline',slot:'slot',po:'point',point:'point',m:'move',move:'move',co:'copy',copy:'copy',ro:'rotate',rotate:'rotate',sc:'scale',scale:'scale',mi:'mirror',mirror:'mirror',al:'align',align:'align',o:'offset',offset:'offset',tr:'trim',trim:'trim',ex:'extend',extend:'extend',f:'fillet',fillet:'fillet',cha:'chamfer',chamfer:'chamfer',ar:'array',array:'array',arraypolar:'polararray',j:'join',join:'join',x:'explode',explode:'explode',br:'break',break:'break',reverse:'reverse',g:'group',group:'group',ungroup:'ungroup',union:'union',subtract:'subtract',intersect:'intersect',e:'erase',erase:'erase',delete:'erase',t:'text',text:'text',mtext:'text',dim:'dimension',dimaligned:'dimension',dimh:'dimh',dimlinear:'dimh',dimv:'dimv',dimradius:'radius',dimdiameter:'diameter',mleader:'leader',h:'hatch',hatch:'hatch',di:'measure',dist:'measure',aa:'area',area:'area',plate:'plate',bend:'bracket',blank:'blank',stock:'stock',check:'review',example:'sample',new:'new',open:'open',save:'save',qsave:'save',export:'export',undo:'undo',u:'undo',redo:'redo',re:'redo',help:'help',selectall:'selectall',ze:'fit',print:'print',plot:'print',purge:'purge'};
function parseCoordinate(text){
 const str=text.trim(),number='[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[-+]?\\d+)?',cart=new RegExp(`^(@?)(${number})\\s*,\\s*(${number})$`,'i'),polar=new RegExp(`^@(${number})<(${number})$`,'i'),f=factor();let m;
 if((m=str.match(cart))){const p=[Number(m[2])*f,Number(m[3])*f];return m[1]?G.add(points.at(-1)||[0,0],p):p;}
 if((m=str.match(polar)))return G.polar(points.at(-1)||[0,0],Number(m[1])*f,G.rad(Number(m[2])));
 if(new RegExp(`^${number}$`,'i').test(str)){
  const n=Number(str)*f;if(n<=0)throw new Error('Enter a positive distance.');
  if(['circle','polygon'].includes(tool)&&points.length===1)return G.add(points[0],[n,0]);
  if(tool==='ellipse'&&points.length===2){const u=G.unit(G.sub(points[1],points[0]));return G.add(points[0],G.mul([-u[1],u[0]],n));}
  if(['line','polyline','move','copy','measure'].includes(tool)&&points.length)return G.polar(points.at(-1),n,Math.atan2(cursor[1]-points.at(-1)[1],cursor[0]-points.at(-1)[0]));
 }
 return null;
}
function execute(text){
 try{const input=text.trim();if(!input){finishDrawing(false);return;}
  if(points.length&&/^(c|close)$/i.test(input)&&['line','polyline','spline'].includes(tool)){finishDrawing(true);return;}
  if(points.length&&/^(u|undo)$/i.test(input)&&['line','polyline','spline'].includes(tool)){points.pop();$('#cad-prompt').textContent=toolPrompt();renderPreview();return;}
  const p=parseCoordinate(input);if(p&&tool!=='select'&&tool!=='pan'){cursor=p;feedPoint(p);return;}
  if(p){log(`Coordinate ${fmt(p[0])}, ${fmt(p[1])}. Choose a drawing tool first.`);return;}
  const tokens=input.split(/\s+/),name=tokens.shift().toLowerCase();if(name==='zoom'||name==='z'){if(!tokens.length||/^(e|extents)$/i.test(tokens[0]))fit();else{const n=Number(tokens[0]);if(n>0)zoomAt([W/2,H/2],n);else throw new Error('Use ZOOM E or ZOOM followed by a positive factor.');}return;}
  if(name==='grid'||name==='osnap'||name==='ortho'||name==='polar'){const key=name==='osnap'?'snap':name;flags[key]=!flags[key];if(key==='ortho'&&flags.ortho)flags.polar=false;if(key==='polar'&&flags.polar)flags.ortho=false;renderToggles();setView();return;}
  const action=aliases[name];if(!action)throw new Error(`Unknown command: ${name.toUpperCase()}. Type HELP for the supported command list.`);
  lastCommand=input;runAction(action,tokens);
  if(['line','polyline','rectangle','circle','arc','ellipse','spline','point','dimension','dimh','dimv','measure','move','copy'].includes(action))for(const token of tokens){const q=parseCoordinate(token);if(q){cursor=q;feedPoint(q);}else if(/^close$/i.test(token)||/^c$/i.test(token))finishDrawing(true);else throw new Error(`Cannot read coordinate: ${token}`);}
 }catch(error){log(error.message);}
}
command.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const value=command.value;command.value='';execute(value);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();command.value='';cancel();canvas.focus();}else if(e.key==='ArrowUp'&&!command.value){e.preventDefault();command.value=lastCommand;}});
document.addEventListener('keydown',e=>{
 const target=e.target,isField=target.matches('input,textarea,select')||target.isContentEditable;
 if(dialog.open)return;
 if(e.key==='Escape'){if(app.classList.contains('is-expanded')&&tool==='select'&&!interaction&&!selection.size)runAction('fullscreen');cancel(false);return;}
 const inWorkspace=app.contains(target)||app.classList.contains('is-expanded');if(!inWorkspace)return;
 if((e.ctrlKey||e.metaKey)&&!e.altKey){const key=e.key.toLowerCase();if(key==='s'){e.preventDefault();runAction('save');return;}if(key==='o'){e.preventDefault();runAction('open');return;}if(key==='z'&&!isField){e.preventDefault();e.shiftKey?redoAction():undo();return;}if(key==='y'&&!isField){e.preventDefault();redoAction();return;}if(key==='a'&&!isField){e.preventDefault();runAction('selectall');return;}if(key==='p'&&!isField){e.preventDefault();runAction('print');return;}if(key==='c'&&!isField&&selected().length){e.preventDefault();clipboard=selected().map(G.clone);log('Selection copied to this workspace clipboard. Ctrl+V pastes an offset copy.');return;}if(key==='v'&&!isField&&clipboard.length){e.preventDefault();const list=clipboard.map(e=>({...G.transform(e,G.translation([10*factor(),10*factor()])),id:G.uid(),group:undefined}));addEntities(list,'Workspace clipboard pasted.');return;}}
 const key={F3:'snap',F7:'grid',F8:'ortho',F10:'polar'}[e.key];if(key){e.preventDefault();flags[key]=!flags[key];if(key==='ortho'&&flags.ortho)flags.polar=false;if(key==='polar'&&flags.polar)flags.ortho=false;renderToggles();setView();return;}
 if(isField)return;

 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();runAction('erase');return;}
 if(e.key==='Enter'){e.preventDefault();finishDrawing(false);return;}
 if(e.code==='Space'){e.preventDefault();spacePan=true;return;}
 if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();command.focus();command.value=e.key;}
});
document.addEventListener('keyup',e=>{if(e.code==='Space')spacePan=false;});
window.addEventListener('blur',()=>{spacePan=false;});
const resize=new ResizeObserver(entries=>{const b=entries[0].contentRect;W=Math.max(1,b.width);H=Math.max(1,b.height);canvas.setAttribute('viewBox',`0 0 ${W} ${H}`);setView();});resize.observe(stage);
renderRibbon();renderAll();requestAnimationFrame(()=>{const r=stage.getBoundingClientRect();W=r.width;H=r.height;fit();});
$('#cad-save-status').textContent='Local recovery available';analytics.track('cad_start');log('All geometry stays on this device. Type HELP for commands; right-click SNAP to choose snap modes.');
}
