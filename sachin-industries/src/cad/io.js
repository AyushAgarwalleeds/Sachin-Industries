import DxfParser from 'dxf-parser';
import {DxfWriter,Units,point2d,point3d,LWPolylineFlags} from '@tarikjabiri/dxf';
import {entity,uid,clone,validateEntity,transform,scaling,translation,rotation,explode,dimensionParts,add,sub,mul,rad,deg,TAU,arcSweep,spline,bounds,esc,num} from './geometry.js';
export const MAX_ENTITIES=12000;
export const defaultLayers=()=>[
 {name:'CUT',color:'#dafa70',role:'cut',visible:true,locked:false,dash:'solid'},
 {name:'BEND',color:'#74bcff',role:'bend',visible:true,locked:false,dash:'dashed'},
 {name:'ANNOTATION',color:'#c4cbc6',role:'annotation',visible:true,locked:false,dash:'solid'},
 {name:'CONSTRUCTION',color:'#c18af9',role:'construction',visible:true,locked:false,dash:'dotted'}
];
export const newDocument=()=>({format:'sachin-cad',version:1,name:'Untitled drawing',units:'mm',currentLayer:'CUT',layers:defaultLayers(),entities:[],stock:{width:8000,height:2500,show:false}});
export function validateDocument(value){
 if(!value||value.format!=='sachin-cad'||value.version!==1||!Array.isArray(value.entities)||!Array.isArray(value.layers))throw new Error('This is not a supported Sachin CAD project.');
 if(value.entities.length>MAX_ENTITIES||value.layers.length>100||!value.layers.length)throw new Error(`Projects support up to ${MAX_ENTITIES.toLocaleString()} entities and 100 layers.`);
 const doc=newDocument();doc.name=String(value.name||'Untitled drawing').slice(0,100);doc.units=value.units==='in'?'in':'mm';
 const seen=new Set();doc.layers=value.layers.map(l=>{
  if(typeof l.name!=='string'||!l.name.trim()||l.name.length>60||seen.has(l.name)||!/^#[0-9a-f]{6}$/i.test(l.color))throw new Error('Invalid or duplicate layer.');seen.add(l.name);
  return {name:l.name,color:l.color,visible:l.visible!==false,locked:!!l.locked,role:['cut','bend','annotation','construction'].includes(l.role)?l.role:'cut',dash:['solid','dashed','dotted'].includes(l.dash)?l.dash:'solid'};
 });
 const ids=new Set();let points=0;
 doc.entities=value.entities.map(raw=>{
  const e=clone(raw);e.id=typeof e.id==='string'&&/^[a-z0-9_-]{1,80}$/i.test(e.id)&&!ids.has(e.id)?e.id:uid();ids.add(e.id);validateEntity(e);
  if(!seen.has(e.layer))throw new Error(`Missing layer: ${e.layer}`);points+=(e.points?.length||e.segments?.length||2);if(points>250000)throw new Error('This project exceeds 250,000 control points.');
  if(e.group!==undefined)e.group=String(e.group).replace(/[^a-z0-9_-]/gi,'').slice(0,80);
  return e;
 });
 doc.currentLayer=seen.has(value.currentLayer)?value.currentLayer:doc.layers[0].name;
 if(value.stock&&Number.isFinite(value.stock.width)&&Number.isFinite(value.stock.height)&&value.stock.width>0&&value.stock.height>0&&Math.max(value.stock.width,value.stock.height)<1e7)doc.stock={width:value.stock.width,height:value.stock.height,show:!!value.stock.show};
 return doc;
}
const v=p=>point3d(p[0],p[1],0);
const safeLayer=s=>s.replace(/[<>/\\":;?*|=,\x00-\x1f]/g,'_').slice(0,60)||'0';
export function exportDxf(doc,{units=doc.units,profileOnly=false,selectedIds=null}={}){
 const factor=units==='in'?25.4:1,writer=new DxfWriter(),warnings=[];
 writer.setUnits(units==='in'?Units.Inches:Units.Millimeters);
 writer.addLType('SI_DASHED','Sachin CAD dashed',[6/factor,-3/factor]);
 writer.addLType('SI_DOTTED','Sachin CAD dotted',[0,-2.5/factor]);
 const layerNames=new Map(),used=new Set(['0']);
 for(const l of doc.layers){let name=safeLayer(l.name);while(used.has(name))name+='_';used.add(name);layerNames.set(l.name,name);const layer=writer.addLayer(name,7,l.dash==='dashed'?'SI_DASHED':l.dash==='dotted'?'SI_DOTTED':'CONTINUOUS');layer.trueColor=parseInt(l.color.slice(1),16);}
 let count=0;
 const addEntity=(original)=>{
  const e=transform(original,scaling(1/factor)),options={layerName:layerNames.get(original.layer)||'0'};
  if(e.type==='line')writer.addLine(v(e.a),v(e.b),options);
  else if(e.type==='circle')writer.addCircle(v(e.center),e.r,options);
  else if(e.type==='arc'){if(arcSweep(e)>=TAU-1e-7)writer.addCircle(v(e.center),e.r,options);else writer.addArc(v(e.center),e.r,deg(e.ccw===false?e.end:e.start),deg(e.ccw===false?e.start:e.end),options);}
  else if(e.type==='polyline')writer.addLWPolyline(e.points.map((p,i)=>({point:point2d(...p),bulge:e.bulges?.[i]||0})),{...options,flags:e.closed?LWPolylineFlags.Closed:LWPolylineFlags.None});
  else if(e.type==='ellipse'){
   let rx=e.rx,ry=e.ry,angle=rad(e.angle||0);if(ry>rx){[rx,ry]=[ry,rx];angle+=Math.PI/2;}
   writer.addEllipse(v(e.center),point3d(rx*Math.cos(angle),rx*Math.sin(angle),0),ry/rx,0,TAU,options);
  }else if(e.type==='bezier'){
   for(let i=0;i<(e.closed?e.segments.length:e.segments.length-1);i++){
    const a=e.segments[i],b=e.segments[(i+1)%e.segments.length],p1=add(a.p,a.out||[0,0]),p2=add(b.p,b.in||[0,0]);
    writer.addSpline({controlPoints:[a.p,p1,p2,b.p].map(v),degreeCurve:3,knots:[0,0,0,0,1,1,1,1]},options);count++;
   }return;
  }else if(e.type==='text')writer.addText(v(e.at),e.height,e.text,{...options,rotation:e.rotation||0});
  else if(e.type==='point')writer.addPoint(...e.at,0,options);
  else if(['dimension','radial'].includes(e.type)){dimensionParts(original,factor).forEach(p=>addEntity({...p,layer:original.layer}));return;}
  count++;
 };
 for(const e of doc.entities){const layer=doc.layers.find(l=>l.name===e.layer);if(!layer?.visible||selectedIds&&!selectedIds.has(e.id))continue;if(profileOnly&&(!['cut','bend'].includes(layer.role)||['text','dimension','radial','point'].includes(e.type)))continue;addEntity(e);}
 if(!count)throw new Error('There are no exportable entities in this scope.');
 if(doc.entities.some(e=>['dimension','radial'].includes(e.type))&&!profileOnly)warnings.push('Dimensions are exported as editable lines and text, not associative DIMENSION objects.');
 return {text:writer.stringify(),count,warnings};
}
function splineImport(e,warnings){
 const p=e.controlPoints?.map(p=>[p.x,p.y])||[];
 if(e.rational)throw new Error('rational SPLINE (weights are not supported by this DXF parser)');
 const clamped=e.knotValues?.length===8&&e.knotValues.slice(0,4).every(k=>Math.abs(k-e.knotValues[0])<1e-9)&&e.knotValues.slice(4).every(k=>Math.abs(k-e.knotValues[7])<1e-9);
 if(e.degreeOfSplineCurve===3&&p.length===4&&clamped&&!e.periodic)return entity('bezier',{segments:[{p:p[0],in:[0,0],out:sub(p[1],p[0])},{p:p[3],in:sub(p[2],p[3]),out:[0,0]}],closed:false});
 if(!p.length&&e.fitPoints?.length)return spline(e.fitPoints.map(p=>[p.x,p.y]));
 const degree=e.degreeOfSplineCurve,knots=e.knotValues;
 if(!p.length||!knots||degree<1||degree>10||knots.length<p.length+degree+1)throw new Error('invalid SPLINE definition');
 const start=knots[degree],end=knots[p.length];
 const evaluate=t=>{
  let k=degree;while(k<p.length-1&&t>=knots[k+1])k++;const d=Array.from({length:degree+1},(_,j)=>[...p[k-degree+j]]);
  for(let r=1;r<=degree;r++)for(let j=degree;j>=r;j--){const i=k-degree+j,den=knots[i+degree-r+1]-knots[i],a=den?(t-knots[i])/den:0;d[j]=add(mul(d[j-1],1-a),mul(d[j],a));}
  return d[degree];
 };
 const points=[],sample=(a,b,A,B,depth=0)=>{
  const t=(a+b)/2,P=evaluate(t),line=entity('line',{a:A,b:B}),v=sub(B,A),len=v[0]*v[0]+v[1]*v[1],u=len?Math.max(0,Math.min(1,((P[0]-A[0])*v[0]+(P[1]-A[1])*v[1])/len)):0,near=add(A,mul(v,u));
  if(depth<14&&Math.hypot(...sub(P,near))>.01&&points.length<10000){sample(a,t,A,P,depth+1);sample(t,b,P,B,depth+1);}else points.push(B);
 };
 points.push(evaluate(start));
 for(let i=degree;i<p.length;i++)if(knots[i+1]>knots[i])sample(knots[i],knots[i+1],evaluate(knots[i]),evaluate(knots[i+1]));
 warnings.add('General non-rational splines are sampled to approximately 0.01 mm before unit/block scaling; cubic Bezier segments stay editable curves.');
 return entity('polyline',{points,closed:!!e.closed});
}
export function importDxf(text,{units='auto'}={}){
 if(text.length>20*1024*1024)throw new Error('DXF imports are limited to 20 MB.');
 if(text.startsWith('AutoCAD Binary DXF'))throw new Error('Choose an ASCII DXF file; binary DXF and DWG are not supported.');
 const dxf=new DxfParser().parseSync(text);if(!dxf?.entities)throw new Error('No DXF ENTITIES section found.');
 const warnings=new Set(),skipped=new Map(),doc=newDocument(),sourceUnits=dxf.header?.$INSUNITS;
 const scales={1:25.4,2:304.8,4:1,5:10,6:1000,8:.0000254,9:.0254,10:914.4,11:1e-7,12:1e-6,13:.001,14:100,15:10000,16:100000};
 let scale=units==='mm'?1:units==='in'?25.4:scales[sourceUnits];
 if(!scale){scale=1;warnings.add('DXF units were missing or unsupported; interpreted as millimetres. Reimport with a unit override if needed.');}
 const sourceLayers=dxf.tables?.layer?.layers||{},layerMeta=new Map(),appliedLayers=new Set();
 // dxf-parser omits LAYER true colour, linetype and lock fields. Preserve those tags.
 const tags=text.split(/\r\n|\r|\n/);let record=null;
 for(let i=0;i+1<tags.length;i+=2){const code=Number(tags[i].trim()),value=tags[i+1].trim();
  if(code===0){if(record?.name)layerMeta.set(record.name,record);record=value==='LAYER'?{}:null;}
  else if(record){if(code===2)record.name=value;if(code===6)record.lineType=value;if(code===420)record.color=Number(value);if(code===70)record.flags=Number(value);if(code===62)record.index=Number(value);}
 }
 if(record?.name)layerMeta.set(record.name,record);
 const ensureLayer=name=>{name=String(name||'0').slice(0,60);let layer=doc.layers.find(l=>l.name===name);if(!layer){layer={name,color:'#dafa70',role:/bend|fold/i.test(name)?'bend':/dim|text|anno/i.test(name)?'annotation':'cut',visible:true,locked:false,dash:'solid'};doc.layers.push(layer);}
  if(!appliedLayers.has(name)){const raw=sourceLayers[name],meta=layerMeta.get(name),rgb=meta?.color??raw?.color;if(Number.isInteger(rgb))layer.color='#'+(rgb&0xffffff).toString(16).padStart(6,'0');if(raw||meta){layer.visible=raw?.visible!==false&&!(meta?.flags&3);layer.locked=!!(meta?.flags&4);if(meta?.lineType)layer.dash=/DOT/i.test(meta.lineType)?'dotted':/DASH/i.test(meta.lineType)?'dashed':'solid';}appliedLayers.add(name);}return name;
 };
 const convert=(raw,stack=[],inherited='0')=>{
  if(doc.entities.length>=MAX_ENTITIES)throw new Error(`This editor supports up to ${MAX_ENTITIES.toLocaleString()} entities. Split the file into smaller drawings.`);
  const layer=ensureLayer(raw.layer==='0'?inherited:raw.layer||inherited);let made=[];
  const p=q=>[q.x,q.y];
  try{
   if(Math.abs(raw.extrusionDirection?.x||0)>1e-7||Math.abs(raw.extrusionDirection?.y||0)>1e-7)throw new Error('non-XY object coordinate system');
   const positions=[raw.center,raw.position,...(raw.vertices||[])].filter(Boolean);if(positions.some(p=>Math.abs(p.z||0)>1e-7))warnings.add('Nonzero Z coordinates are projected onto the XY plane.');
   if(raw.type==='LINE')made=[entity('line',{a:p(raw.vertices[0]),b:p(raw.vertices[1])},layer)];
   else if(raw.type==='CIRCLE')made=[entity('circle',{center:p(raw.center),r:raw.radius},layer)];
   else if(raw.type==='ARC')made=[entity('arc',{center:p(raw.center),r:raw.radius,start:raw.startAngle,end:raw.endAngle,ccw:true},layer)];
   else if(['LWPOLYLINE','POLYLINE'].includes(raw.type)){
    if(raw.is3dPolygonMesh||raw.is3dPolyline)warnings.add('3D coordinates are projected onto the XY plane.');
    made=[entity('polyline',{points:raw.vertices.map(p),bulges:raw.vertices.map(p=>p.bulge||0),closed:!!raw.shape},layer)];
   }else if(raw.type==='ELLIPSE'){
    const major=p(raw.majorAxisEndPoint),r=Math.hypot(...major),a=Math.atan2(major[1],major[0]);
    if(Math.abs((raw.endAngle??TAU)-(raw.startAngle||0))>=TAU-1e-7)made=[entity('ellipse',{center:p(raw.center),rx:r,ry:r*raw.axisRatio,angle:deg(a)},layer)];
    else{const span=(raw.endAngle-raw.startAngle+TAU)%TAU,n=Math.max(12,Math.ceil(span*100)),points=Array.from({length:n+1},(_,i)=>{const t=raw.startAngle+span*i/n,x=r*Math.cos(t),y=r*raw.axisRatio*Math.sin(t);return [raw.center.x+x*Math.cos(a)-y*Math.sin(a),raw.center.y+x*Math.sin(a)+y*Math.cos(a)];});made=[entity('polyline',{points,closed:false},layer)];warnings.add('Partial ellipses are sampled to polylines.');}
   }else if(raw.type==='SPLINE'){const e=splineImport(raw,warnings);e.layer=layer;made=[e];}
   else if(['TEXT','MTEXT','ATTDEF','ATTRIB'].includes(raw.type))made=[entity('text',{at:p(raw.startPoint||raw.position),text:String(raw.text||'').replace(/\\P/g,' ').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'').slice(0,2000),height:raw.textHeight||raw.height||3.5,rotation:raw.rotation||0},layer)];
   else if(raw.type==='POINT')made=[entity('point',{at:p(raw.position)},layer)];
   else if(['SOLID','3DFACE'].includes(raw.type))made=[entity('polyline',{points:raw.points.map(p),closed:true},layer)];
   else if(['INSERT','DIMENSION'].includes(raw.type)){
    const name=raw.name||raw.block,block=dxf.blocks?.[name];if(!block||stack.includes(name)||stack.length>=12)throw new Error('missing or recursive BLOCK');
    const start=doc.entities.length,position=raw.position||{x:0,y:0},base=block.position||{x:0,y:0};
    for(const child of block.entities||[])convert(child,[...stack,name],layer);
    const rows=raw.rowCount||1,cols=raw.columnCount||1;if(rows*cols>1000)throw new Error('block array exceeds 1,000 instances');
    const originals=doc.entities.splice(start);
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)for(const child of originals){
     if(doc.entities.length>=MAX_ENTITIES)throw new Error(`This editor supports up to ${MAX_ENTITIES.toLocaleString()} expanded entities.`);
     let e=transform(child,translation([-base.x,-base.y]));e=transform(e,[raw.xScale??1,0,0,raw.yScale??1,0,0]);e=transform(e,translation([col*(raw.columnSpacing||0),row*(raw.rowSpacing||0)]));e=transform(e,rotation(raw.rotation||0));e=transform(e,translation([position.x,position.y]));e.id=uid();validateEntity(e);doc.entities.push(e);
    }return;
   }else throw new Error(raw.type);
   for(let e of made){if(raw.extrusionDirection?.z<0){e=transform(e,[-1,0,0,1,0,0]);warnings.add('Negative-Z OCS entities are reflected into the XY plane.');}validateEntity(e);doc.entities.push(e);}
  }catch(error){if(/supports up to|exceeds 1,000/.test(error.message))throw error;skipped.set(raw.type,(skipped.get(raw.type)||0)+1);}
 };
 dxf.entities.forEach(e=>convert(e));
 // Some types are intentionally skipped inside the third-party parser.
 for(const type of ['HATCH','REGION','3DSOLID','BODY','IMAGE','OLEFRAME','OLE2FRAME','LEADER','MULTILEADER','ACAD_TABLE','XLINE','RAY']){const hits=text.match(new RegExp(`(?:^|\\r?\\n)\\s*0\\r?\\n${type}\\s*(?=\\r?\\n)`,'g'));if(hits&&!skipped.has(type))skipped.set(type,hits.length);}
 if(!doc.entities.length)throw new Error('No supported 2D entities could be imported.');
 if(doc.entities.length>MAX_ENTITIES)throw new Error('The expanded drawing exceeds the entity limit.');
 doc.entities=doc.entities.map(e=>transform(e,scaling(scale)));doc.name='Imported DXF';doc.units=units==='in'||sourceUnits===1?'in':'mm';
 validateDocument(doc);return {doc,warnings:[...warnings],skipped:Object.fromEntries(skipped),sourceUnits,scale};
}

export function entitySvg(e,factor=1){
 if(e.type==='circle')return `<circle cx="${num(e.center[0])}" cy="${num(e.center[1])}" r="${num(e.r)}"/>`;
 if(e.type==='ellipse')return `<ellipse cx="${num(e.center[0])}" cy="${num(e.center[1])}" rx="${num(e.rx)}" ry="${num(e.ry)}" transform="rotate(${num(e.angle||0)} ${e.center.map(num).join(' ')})"/>`;
 if(e.type==='point')return `<path d="M${num(e.at[0]-1)},${num(e.at[1])}h2 M${num(e.at[0])},${num(e.at[1]-1)}v2"/>`;
 if(e.type==='text')return `<text x="0" y="0" font-size="${num(e.height)}" font-family="Arial,sans-serif" fill="currentColor" stroke="none" transform="translate(${e.at.map(num).join(' ')}) rotate(${num(e.rotation||0)}) scale(1 -1)">${esc(e.text)}</text>`;
 if(['dimension','radial'].includes(e.type))return dimensionParts(e,factor).map(x=>entitySvg(x,factor)).join('');
 return `<path d="${pathDataLocal(e)}"/>`;
}
// Kept as a named import alias to make export/renderer share one geometry path.
import {pathData as pathDataLocal} from './geometry.js';
export function exportSvg(doc,{profileOnly=false}={}){
 const list=doc.entities.filter(e=>{const l=doc.layers.find(l=>l.name===e.layer);return l?.visible&&(!profileOnly||['cut','bend'].includes(l.role)&&!['text','dimension','radial','point'].includes(e.type));});
 if(!list.length)throw new Error('No visible geometry to export.');
 const b=bounds(list),margin=Math.max(2,Math.max(b.width,b.height)*.025),w=b.width+margin*2,h=b.height+margin*2;
 return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${num(w)}mm" height="${num(h)}mm" viewBox="0 0 ${num(w)} ${num(h)}"><title>${esc(doc.name)} — Sachin CAD</title><g fill="none" stroke-width="0.25" transform="translate(${num(-b.x+margin)} ${num(b.y+b.height+margin)}) scale(1 -1)">${list.map(e=>{const l=doc.layers.find(l=>l.name===e.layer);return `<g color="${l.role==='cut'?'#18251b':esc(l.color)}" stroke="currentColor"${l.dash!=='solid'?' stroke-dasharray="3 2"':''}>${entitySvg(e,doc.units==='in'?25.4:1)}</g>`;}).join('')}</g></svg>`;
}
