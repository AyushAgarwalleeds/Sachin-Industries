import paper from 'paper';

// A headless vector project: the editor renders its own accessible SVG scene.
new paper.Project();
paper.settings.insertItems=false;
export const EPS=1e-7, TAU=Math.PI*2;
export const clone=x=>structuredClone(x);
let serial=0;
export const uid=()=>`e${Date.now().toString(36)}${(++serial).toString(36)}`;
export const entity=(type,data={},layer='CUT')=>({id:uid(),type,layer,...data});
export const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
export const mul=(a,s)=>[a[0]*s,a[1]*s];
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
export const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
export const length=a=>Math.hypot(...a);
export const distance=(a,b)=>length(sub(a,b));
export const unit=a=>mul(a,1/(length(a)||1));
export const rad=a=>a*Math.PI/180, deg=a=>a*180/Math.PI;
export const norm=a=>((a%TAU)+TAU)%TAU;
export const polar=(c,r,a)=>[c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)];
export const pt=p=>new paper.Point(p[0],p[1]);
export const xy=p=>[p.x,p.y];
export const clean=n=>Math.abs(n)<1e-10?0:+n.toFixed(6);
export const num=n=>String(clean(n));
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

export function arcSweep(e){const d=e.ccw===false?e.start-e.end:e.end-e.start;return Math.abs(d)>=TAU-EPS?TAU:norm(d);}
export function arcPoint(e,t){return polar(e.center,e.r,e.start+(e.ccw===false?-1:1)*arcSweep(e)*t);}
export function bulgeArc(a,b,bulge){
 const v=sub(b,a),l=length(v),mid=mul(add(a,b),.5),normal=[-v[1]/l,v[0]/l];
 const center=add(mid,mul(normal,l*(1-bulge*bulge)/(4*bulge)));
 return {type:'arc',center,r:l*(1+bulge*bulge)/(4*Math.abs(bulge)),start:Math.atan2(a[1]-center[1],a[0]-center[0]),end:Math.atan2(b[1]-center[1],b[0]-center[0]),ccw:bulge>0};
}
export function arcThrough(a,b,c,layer='CUT'){
 const ba=sub(b,a),ca=sub(c,a),d=2*cross(ba,ca);
 if(Math.abs(d)<EPS)throw new Error('An arc needs three non-collinear points.');
 const center=add(a,[(dot(ba,ba)*ca[1]-dot(ca,ca)*ba[1])/d,(ba[0]*dot(ca,ca)-ca[0]*dot(ba,ba))/d]);
 const start=Math.atan2(a[1]-center[1],a[0]-center[0]),end=Math.atan2(c[1]-center[1],c[0]-center[0]);
 return entity('arc',{center,r:distance(a,center),start,end,ccw:cross(ba,ca)>0},layer);
}
export function explode(e){
 if(e.type==='polyline')return e.points.slice(0,e.closed?e.points.length:e.points.length-1).map((a,i)=>{
  const b=e.points[(i+1)%e.points.length],bulge=e.bulges?.[i]||0;
  return entity(bulge?'arc':'line',bulge?bulgeArc(a,b,bulge):{a:clone(a),b:clone(b)},e.layer);
 });
 if(e.type==='dimension'||e.type==='radial')return dimensionParts(e).map(p=>entity(p.type,p,e.layer));
 if(e.type==='bezier'){
  const path=toPaper(e);path.flatten(.02);return explode(fromPaper(path,e.layer)[0]);
 }
 return [clone(e)];
}
export function toPaper(e){
 let p;
 if(e.type==='line')p=new paper.Path({segments:[pt(e.a),pt(e.b)],insert:false});
 else if(e.type==='circle')p=new paper.Path.Circle({center:pt(e.center),radius:e.r,insert:false});
 else if(e.type==='arc'){
  if(arcSweep(e)>TAU-EPS){p=new paper.Path.Circle({center:pt(e.center),radius:e.r,insert:false});if(e.ccw===false)p.reverse();}
  else p=new paper.Path.Arc({from:pt(arcPoint(e,0)),through:pt(arcPoint(e,.5)),to:pt(arcPoint(e,1)),insert:false});
 }else if(e.type==='ellipse'){
  p=new paper.Path.Ellipse({center:pt(e.center),radius:[e.rx,e.ry],insert:false});p.rotate(e.angle||0,pt(e.center));
 }else if(e.type==='polyline'){
  p=new paper.Path({insert:false});p.moveTo(pt(e.points[0]));
  for(const edge of explode(e)){if(edge.type==='arc')p.arcTo(pt(arcPoint(edge,.5)),pt(arcPoint(edge,1)));else p.lineTo(pt(edge.b));}
  p.closed=!!e.closed;
 }else if(e.type==='bezier')p=new paper.Path({segments:e.segments.map(s=>new paper.Segment(pt(s.p),pt(s.in||[0,0]),pt(s.out||[0,0]))),closed:!!e.closed,insert:false});
 else if(e.type==='point')p=new paper.Path({segments:[pt(e.at)],insert:false});
 else if(e.type==='text')p=new paper.Path.Rectangle({point:pt(e.at),size:[e.height*Math.max(1,e.text.length)*.62,e.height],insert:false});
 else if(e.type==='dimension'||e.type==='radial'){
  p=new paper.CompoundPath({insert:false});dimensionParts(e).filter(x=>x.type==='line').forEach(x=>p.addChild(toPaper(x)));
 }else throw new Error(`Unsupported geometry: ${e.type}`);
 return p;
}
export function fromPaper(p,layer='CUT'){
 if(p.children)return p.children.flatMap(c=>fromPaper(c,layer));
 if(!p.segments?.length)return [];
 if(p.curves.every(c=>c.isStraight()))return [entity('polyline',{points:p.segments.map(s=>xy(s.point)),closed:p.closed},layer)];
 return [entity('bezier',{segments:p.segments.map(s=>({p:xy(s.point),in:xy(s.handleIn),out:xy(s.handleOut)})),closed:p.closed},layer)];
}
export function spline(points,layer='CUT'){
 const p=new paper.Path({segments:points.map(pt),insert:false});p.smooth({type:'catmull-rom',factor:.5});return fromPaper(p,layer)[0];
}
export function pathData(e){
 if(e.type==='line')return `M${e.a.map(num)}L${e.b.map(num)}`;
 if(e.type==='arc'){
  const a=arcPoint(e,0),b=arcPoint(e,1),sweep=arcSweep(e),flag=e.ccw===false?0:1;
  if(sweep>=TAU-EPS){const m=arcPoint(e,.5);return `M${a.map(num)}A${num(e.r)},${num(e.r)} 0 1 ${flag} ${m.map(num)}A${num(e.r)},${num(e.r)} 0 1 ${flag} ${b.map(num)}`;}
  return `M${a.map(num)}A${num(e.r)},${num(e.r)} 0 ${sweep>Math.PI?1:0} ${flag} ${b.map(num)}`;
 }
 if(e.type==='polyline')return `M${e.points[0].map(num)}`+explode(e).map(x=>x.type==='line'?`L${x.b.map(num)}`:pathData(x).replace(/^M[^A]+/,'')).join('')+(e.closed?'Z':'');
 return toPaper(e).pathData;
}
export function bounds(list){
 if(!Array.isArray(list))list=[list];
 if(!list.length)return {x:0,y:0,width:300,height:200,center:[150,100]};
 let x=Infinity,y=Infinity,x2=-Infinity,y2=-Infinity;
 for(const e of list){
  let b;
  if(e.type==='arc'){
   const p=[arcPoint(e,0),arcPoint(e,1)];for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])if(norm((e.ccw===false?-1:1)*(a-e.start))<=arcSweep(e)+EPS)p.push(polar(e.center,e.r,a));
   const xs=p.map(p=>p[0]),ys=p.map(p=>p[1]);b={left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};
  }else if(e.type==='polyline'){const box=bounds(explode(e));b={left:box.x,top:box.y,right:box.x+box.width,bottom:box.y+box.height};}
  else if(e.type==='ellipse'){const a=rad(e.angle||0),dx=Math.hypot(e.rx*Math.cos(a),e.ry*Math.sin(a)),dy=Math.hypot(e.rx*Math.sin(a),e.ry*Math.cos(a));b={left:e.center[0]-dx,top:e.center[1]-dy,right:e.center[0]+dx,bottom:e.center[1]+dy};}
  else b=toPaper(e).bounds;
  x=Math.min(x,b.left);y=Math.min(y,b.top);x2=Math.max(x2,b.right);y2=Math.max(y2,b.bottom);
 }
 return {x,y,width:x2-x,height:y2-y,center:[(x+x2)/2,(y+y2)/2]};
}
export function isClosed(e){return ['circle','ellipse'].includes(e.type)||!!e.closed;}
export function perimeter(e){if(e.type==='line')return distance(e.a,e.b);if(e.type==='circle')return TAU*e.r;if(e.type==='arc')return arcSweep(e)*e.r;if(e.type==='polyline')return explode(e).reduce((n,x)=>n+perimeter(x),0);return toPaper(e).length||0;}
export function area(e){
 if(e.type==='circle')return Math.PI*e.r*e.r;if(e.type==='ellipse')return Math.PI*e.rx*e.ry;
 if(e.type==='polyline'&&e.closed){let total=0;for(const edge of explode(e)){if(edge.type==='line')total+=cross(edge.a,edge.b)/2;else{const a=arcPoint(edge,0),b=arcPoint(edge,1),s=arcSweep(edge);total+=cross(a,b)/2+(edge.ccw===false?-1:1)*edge.r*edge.r*(s-Math.sin(s))/2;}}return Math.abs(total);}
 return isClosed(e)?Math.abs(toPaper(e).area):0;
}
export function nearest(e,p){
 if(e.type==='point')return {point:e.at,distance:distance(e.at,p)};
 const q=toPaper(e).getNearestPoint(pt(p));return q?{point:xy(q),distance:distance(xy(q),p)}:{point:p,distance:Infinity};
}
export function snapPoints(e){
 if(e.type==='line')return [{p:e.a,kind:'Endpoint'},{p:e.b,kind:'Endpoint'},{p:mul(add(e.a,e.b),.5),kind:'Midpoint'}];
 if(e.type==='circle'||e.type==='ellipse'){
  const rx=e.r||e.rx,ry=e.r||e.ry,a=rad(e.angle||0);
  return [{p:e.center,kind:'Center'},...[0,Math.PI/2,Math.PI,Math.PI*1.5].map(t=>({p:add(e.center,[rx*Math.cos(t)*Math.cos(a)-ry*Math.sin(t)*Math.sin(a),rx*Math.cos(t)*Math.sin(a)+ry*Math.sin(t)*Math.cos(a)]),kind:'Quadrant'}))];
 }
 if(e.type==='arc')return [{p:e.center,kind:'Center'},{p:arcPoint(e,0),kind:'Endpoint'},{p:arcPoint(e,1),kind:'Endpoint'},{p:arcPoint(e,.5),kind:'Midpoint'}];
 if(e.type==='polyline')return explode(e).flatMap(snapPoints);
 if(e.type==='bezier')return e.segments.map(s=>({p:s.p,kind:'Endpoint'}));
 if(e.type==='dimension')return [{p:e.a,kind:'Endpoint'},{p:e.b,kind:'Endpoint'}];
 return [{p:e.at||e.center,kind:'Insertion'}].filter(x=>x.p);
}
export function transform(e,m){
 const [a,b,c,d,tx,ty]=m,apply=p=>[a*p[0]+c*p[1]+tx,b*p[0]+d*p[1]+ty],out=clone(e);
 const sx=Math.hypot(a,b),sy=Math.hypot(c,d),uniform=Math.abs(sx-sy)<EPS&&Math.abs(a*c+b*d)<EPS,rot=deg(Math.atan2(b,a)),det=a*d-b*c;
 if(e.type==='line'){out.a=apply(e.a);out.b=apply(e.b);}
 else if(e.type==='polyline'&&(uniform||!e.bulges?.some(x=>x))){out.points=e.points.map(apply);if(out.bulges&&det<0)out.bulges=out.bulges.map(x=>-x);}
 else if(e.type==='point')out.at=apply(e.at);
 else if(e.type==='circle'&&uniform){out.center=apply(e.center);out.r=e.r*sx;}
 else if(e.type==='arc'&&uniform){out.center=apply(e.center);out.r=e.r*sx;const p0=apply(arcPoint(e,0)),p1=apply(arcPoint(e,1));out.start=Math.atan2(p0[1]-out.center[1],p0[0]-out.center[0]);out.end=Math.atan2(p1[1]-out.center[1],p1[0]-out.center[0]);out.ccw=det<0?e.ccw===false:e.ccw!==false;if(arcSweep(e)>=TAU-EPS)out.end=out.start+(out.ccw===false?-TAU:TAU);}
 else if(e.type==='ellipse'&&uniform){out.center=apply(e.center);out.rx=e.rx*sx;out.ry=e.ry*sx;out.angle=rot+(det<0?-(e.angle||0):(e.angle||0));}
 else if(e.type==='text'){out.at=apply(e.at);out.height=e.height*sy;out.rotation=rot+(e.rotation||0);}
 else if(e.type==='dimension'){out.a=apply(e.a);out.b=apply(e.b);out.p=apply(e.p);if(rot%180)out.mode='aligned';}
 else if(e.type==='radial'){out.center=apply(e.center);out.edge=apply(e.edge);out.p=apply(e.p);}
 else{const p=toPaper(e);p.transform(new paper.Matrix(a,b,c,d,tx,ty));const changed=fromPaper(p,e.layer)[0];return {...out,...changed,id:e.id};}
 return out;
}
export function translation(v){return [1,0,0,1,...v];}
export function rotation(angle,center=[0,0]){const c=Math.cos(rad(angle)),s=Math.sin(rad(angle));return [c,s,-s,c,center[0]-c*center[0]+s*center[1],center[1]-s*center[0]-c*center[1]];}
export function scaling(f,center=[0,0]){return [f,0,0,f,center[0]*(1-f),center[1]*(1-f)];}
export function reflection(angle,center=[0,0]){const c=Math.cos(rad(2*angle)),s=Math.sin(rad(2*angle));return [c,s,s,-c,center[0]-c*center[0]-s*center[1],center[1]-s*center[0]+c*center[1]];}
export function boolean(list,operation){
 if(list.length<2||list.some(e=>!isClosed(e)))throw new Error('Select at least two closed profiles.');
 let p=toPaper(list[0]);
 for(const e of list.slice(1))p=p[operation](toPaper(e),{insert:false});
 const result=fromPaper(p,list[0].layer);if(!result.length)throw new Error('This operation produces no remaining profile.');return result;
}
export function offset(e,d,side){
 if(!Number.isFinite(d)||d<=0)throw new Error('Offset distance must be positive.');
 if(e.type==='line'){const v=unit(sub(e.b,e.a)),n=[-v[1],v[0]],sign=dot(sub(side,e.a),n)>=0?1:-1;return [entity('line',{a:add(e.a,mul(n,d*sign)),b:add(e.b,mul(n,d*sign))},e.layer)];}
 if(e.type==='circle'||e.type==='arc'){const r=e.r+(distance(side,e.center)>=e.r?d:-d);if(r<EPS)throw new Error('The inside offset exceeds the radius.');return [{...clone(e),id:uid(),r}];}
 if(!isClosed(e))throw new Error('Offset supports lines, arcs, circles and closed profiles.');
 const p=toPaper(e);if(!p.clockwise)p.reverse();const result=p.offset(p.contains(pt(side))?-d:d,{join:'miter',insert:false});
 const out=fromPaper(result,e.layer);if(!out.length)throw new Error('The offset collapses the profile.');return out;
}
export function intersections(a,b){return toPaper(a).getIntersections(toPaper(b)).map(x=>xy(x.point));}
export function lineIntersection(a,b,c,d,finiteA=true,finiteB=true){
 const u=sub(b,a),v=sub(d,c),den=cross(u,v);if(Math.abs(den)<EPS)return null;
 const t=cross(sub(c,a),v)/den,q=cross(sub(c,a),u)/den;
 return (!finiteA||t>=-EPS&&t<=1+EPS)&&(!finiteB||q>=-EPS&&q<=1+EPS)?{p:add(a,mul(u,t)),t,q}:null;
}
export function trim(e,others,pick){
 const points=others.filter(x=>x.id!==e.id).flatMap(x=>intersections(e,x));
 if(e.type==='line'){
  const v=sub(e.b,e.a),n=dot(v,v),t=dot(sub(pick,e.a),v)/n;
  const cuts=[0,1,...points.map(p=>dot(sub(p,e.a),v)/n)].filter(x=>x>=-EPS&&x<=1+EPS).sort((a,b)=>a-b).filter((x,i,a)=>!i||x-a[i-1]>EPS);
  if(cuts.length<3)throw new Error('No cutting intersection found on this line.');
  const i=Math.max(0,cuts.findIndex((x,i)=>i<cuts.length-1&&t>=x-EPS&&t<=cuts[i+1]+EPS));
  const intervals=[[0,cuts[i]],[cuts[i+1],1]].filter(([a,b])=>b-a>EPS);
  return intervals.map(([a,b])=>entity('line',{a:add(e.a,mul(v,a)),b:add(e.a,mul(v,b))},e.layer));
 }
 if(e.type==='circle'||e.type==='arc'){
  const start=e.type==='circle'?0:e.start,span=e.type==='circle'?TAU:arcSweep(e),sign=e.ccw===false?-1:1;
  const param=p=>norm(sign*(Math.atan2(p[1]-e.center[1],p[0]-e.center[0])-start));
  let cuts=points.map(param).filter(t=>t<=span+EPS).sort((a,b)=>a-b).filter((t,i,a)=>!i||t-a[i-1]>EPS),clicked=param(pick);
  if(e.type==='circle'){
   if(cuts.length<2)throw new Error('A circle needs at least two cutting intersections.');
   let keep=[];for(let i=0;i<cuts.length;i++){const a=cuts[i],b=i===cuts.length-1?cuts[0]+TAU:cuts[i+1],t=clicked<a?clicked+TAU:clicked;if(t>=a-EPS&&t<=b+EPS)continue;keep.push([a,b]);}cuts=keep;
  }else{
   cuts=[0,...cuts.filter(t=>t>EPS&&t<span-EPS),span];if(cuts.length<3)throw new Error('No cutting intersection found on this arc.');
   const i=cuts.findIndex((a,i)=>i<cuts.length-1&&clicked>=a-EPS&&clicked<=cuts[i+1]+EPS);cuts=[[0,cuts[i]],[cuts[i+1],span]].filter(([a,b])=>b-a>EPS);
  }
  return cuts.map(([a,b])=>entity('arc',{center:clone(e.center),r:e.r,start:start+sign*a,end:start+sign*b,ccw:sign>0},e.layer));
 }
 throw new Error('Trim works on lines, circles and arcs. Explode a polyline first.');
}
export function extend(e,others,pick){
 if(e.type!=='line')throw new Error('Extend supports straight line entities.');
 const v=sub(e.b,e.a),nearA=distance(pick,e.a)<distance(pick,e.b),far=entity('line',{a:add(e.a,mul(v,-1e6)),b:add(e.a,mul(v,1e6))});
 const n=dot(v,v),hits=others.filter(x=>x.id!==e.id).flatMap(x=>intersections(far,x)).map(p=>({p,t:dot(sub(p,e.a),v)/n})).filter(x=>nearA?x.t<-EPS:x.t>1+EPS).sort((a,b)=>nearA?b.t-a.t:a.t-b.t);
 if(!hits.length)throw new Error('No boundary found beyond this endpoint.');
 return {...clone(e),[nearA?'a':'b']:hits[0].p};
}
export function corner(first,second,r,kind='fillet'){
 if(first.type!=='line'||second.type!=='line')throw new Error('Select two straight line entities.');
 if(r<=0)throw new Error('Radius or chamfer distance must be positive.');
 const hit=lineIntersection(first.a,first.b,second.a,second.b,false,false);if(!hit)throw new Error('Parallel lines cannot form this corner.');
 const p=hit.p,far=e=>distance(e.a,p)>distance(e.b,p)?e.a:e.b,A=far(first),B=far(second),u=unit(sub(A,p)),v=unit(sub(B,p));
 const angle=Math.acos(Math.max(-1,Math.min(1,dot(u,v))));if(angle<EPS||Math.PI-angle<EPS)throw new Error('Choose two intersecting directions.');
 const t=kind==='fillet'?r/Math.tan(angle/2):r;
 if(t>=distance(A,p)||t>=distance(B,p))throw new Error('This radius or distance is larger than the available lines.');
 const a=add(p,mul(u,t)),b=add(p,mul(v,t));
 const f={...clone(first),a:A,b:a},s={...clone(second),a:b,b:B};
 if(kind==='chamfer')return [f,s,entity('line',{a,b},first.layer)];
 const center=add(p,mul(unit(add(u,v)),r/Math.sin(angle/2))),start=Math.atan2(a[1]-center[1],a[0]-center[0]),end=Math.atan2(b[1]-center[1],b[0]-center[0]);
 return [f,s,entity('arc',{center,r,start,end,ccw:norm(end-start)<Math.PI},first.layer)];
}
export function reverse(e){
 const out=clone(e);
 if(e.type==='line')[out.a,out.b]=[out.b,out.a];
 else if(e.type==='arc'){[out.start,out.end]=[out.end,out.start];out.ccw=e.ccw===false;}
 else if(e.type==='polyline'){out.points.reverse();out.bulges=out.points.map((_,i)=>-(e.bulges?.[(e.points.length-2-i+e.points.length)%e.points.length]||0));if(!out.closed)out.bulges[out.points.length-1]=0;}
 else if(e.type==='bezier'){out.segments.reverse();out.segments.forEach(s=>{[s.in,s.out]=[s.out,s.in];});}
 return out;
}
export function join(list,tolerance=.01){
 let edges=list.flatMap(explode);if(edges.some(e=>!['line','arc'].includes(e.type)))throw new Error('Join supports connected lines, arcs and polylines.');
 const end=e=>e.type==='line'?[e.a,e.b]:[arcPoint(e,0),arcPoint(e,1)];
 const chain=[edges.shift()];
 while(edges.length){let tail=end(chain.at(-1))[1],i=edges.findIndex(e=>end(e).some(p=>distance(p,tail)<tolerance));if(i<0){chain.reverse();for(let j=0;j<chain.length;j++)chain[j]=reverse(chain[j]);tail=end(chain.at(-1))[1];i=edges.findIndex(e=>end(e).some(p=>distance(p,tail)<tolerance));}
  if(i<0)throw new Error('Select one connected chain; endpoints must meet within 0.01 mm.');let e=edges.splice(i,1)[0];if(distance(end(e)[0],tail)>tolerance)e=reverse(e);chain.push(e);
 }
 const points=chain.map(e=>end(e)[0]),bulges=chain.map(e=>e.type==='arc'?Math.tan(arcSweep(e)/4)*(e.ccw===false?-1:1):0),last=end(chain.at(-1))[1],closed=distance(points[0],last)<tolerance;
 if(!closed){points.push(last);bulges.push(0);}return entity('polyline',{points,bulges,closed},list[0].layer);
}
export function hatch(e,spacing=5,angle=45){
 if(!isClosed(e))throw new Error('Hatch needs a closed profile.');
 if(spacing<=0)throw new Error('Hatch spacing must be positive.');
 const b=bounds(e),diag=Math.hypot(b.width,b.height)*1.5,dir=[Math.cos(rad(angle)),Math.sin(rad(angle))],n=[-dir[1],dir[0]],p=toPaper(e),result=[];
 if(diag/spacing>1500)throw new Error('Increase spacing: a hatch is limited to 1,500 scan lines.');
 for(let t=-diag;t<=diag;t+=spacing){const c=add(b.center,mul(n,t)),a=sub(c,mul(dir,diag)),z=add(c,mul(dir,diag)),line=entity('line',{a,b:z});const hits=intersections(line,e).sort((a,b)=>dot(a,dir)-dot(b,dir));
  for(let i=0;i<hits.length-1;i++){const a=hits[i],b=hits[i+1];if(distance(a,b)>EPS&&p.contains(pt(mul(add(a,b),.5))))result.push(entity('line',{a,b},'ANNOTATION'));}
 }
 return result;
}
export function dimensionParts(e,factor=1){
 const parts=[],line=(a,b)=>parts.push({type:'line',a,b}),text=(at,value,height=3.5,rotation=0)=>parts.push({type:'text',at,text:value,height,rotation});
 if(e.type==='radial'){
  const r=distance(e.center,e.edge),u=unit(sub(e.edge,e.center)),start=e.diameter?sub(e.center,mul(u,r)):e.center;
  line(start,e.edge);line(e.edge,e.p);text(add(e.p,[2,2]),`${e.diameter?'Ø':'R'}${num(r*(e.diameter?2:1)/factor)}`);return parts;
 }
 let u=unit(sub(e.b,e.a));if(e.mode==='horizontal')u=[1,0];if(e.mode==='vertical')u=[0,1];const n=[-u[1],u[0]],h=dot(sub(e.p,e.a),n),a=add(e.a,mul(n,h)),b=add(a,mul(u,dot(sub(e.b,e.a),u))),value=Math.abs(dot(sub(e.b,e.a),u));
 line(e.a,add(a,mul(n,Math.sign(h)*2)));line(e.b,add(b,mul(n,Math.sign(h)*2)));line(a,b);
 for(const p of [a,b])line(add(p,add(mul(u,-1.5),mul(n,-1.5))),add(p,add(mul(u,1.5),mul(n,1.5))));
 text(add(mul(add(a,b),.5),mul(n,2.2)),num(value/factor),3.5,deg(Math.atan2(u[1],u[0])));return parts;
}
export function rectangle(a,b,layer='CUT',radius=0){
 const x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]),w=Math.abs(b[0]-a[0]),h=Math.abs(b[1]-a[1]),r=Math.min(radius,w/2,h/2);
 if(w<EPS||h<EPS)throw new Error('A rectangle needs a non-zero width and height.');
 return r?entity('polyline',{points:[[x+r,y],[x+w-r,y],[x+w,y+r],[x+w,y+h-r],[x+w-r,y+h],[x+r,y+h],[x,y+h-r],[x,y+r]],bulges:[0,Math.tan(Math.PI/8),0,Math.tan(Math.PI/8),0,Math.tan(Math.PI/8),0,Math.tan(Math.PI/8)],closed:true},layer):entity('polyline',{points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],closed:true},layer);
}
export function slot(center,width,height,layer='CUT'){
 if(width<height||height<=0)throw new Error('Slot length must be at least its positive width.');
 const r=height/2,s=(width-height)/2;return entity('polyline',{points:[[-s,-r],[s,-r],[s,r],[-s,r]].map(p=>add(center,p)),bulges:[0,1,0,1],closed:true},layer);
}
export function bendAllowance({a,b,t,r,k,angle}){
 if([a,b,t,r,k,angle].some(x=>!Number.isFinite(x))||a<=0||b<=0||t<=0||r<0||k<0||k>1||angle<=0||angle>=180)throw new Error('Enter positive legs/thickness, radius ≥ 0, K-factor 0–1 and angle between 0° and 180°.');
 const allowance=rad(angle)*(r+k*t),setback=(r+t)*Math.tan(rad(angle)/2),deduction=2*setback-allowance,flat=a+b-deduction;
 if(a<=setback||b<=setback)throw new Error('Both outside legs must exceed the calculated setback.');
 return {allowance,setback,deduction,flat,bendLine:a-setback+allowance/2};
}
export function validateEntity(e){
 const types=['line','polyline','circle','arc','ellipse','bezier','text','point','dimension','radial'];
 if(!e||!types.includes(e.type)||typeof e.layer!=='string'||e.layer.length>60)throw new Error('Invalid entity type or layer.');
 const point=p=>{if(!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>1e9))throw new Error('Drawing coordinates must be finite and within ±1 billion mm.');};
 const positive=n=>{if(!Number.isFinite(n)||n<=0||n>1e9)throw new Error('Invalid radius, axis or text height.');};
 if(e.type==='line'){point(e.a);point(e.b);}
 if(e.type==='polyline'){if(!Array.isArray(e.points)||e.points.length<2||e.points.length>200000)throw new Error('Invalid polyline.');e.points.forEach(point);if(e.bulges?.some(x=>!Number.isFinite(x)||Math.abs(x)>1e6))throw new Error('Invalid polyline arc.');}
 if(['circle','arc','ellipse','radial'].includes(e.type))point(e.center);
 if(['circle','arc'].includes(e.type))positive(e.r);
 if(e.type==='arc'&&(!Number.isFinite(e.start)||!Number.isFinite(e.end)||arcSweep(e)<=EPS))throw new Error('Invalid arc angles.');
 if(e.type==='ellipse'){positive(e.rx);positive(e.ry);if(!Number.isFinite(e.angle||0))throw new Error('Invalid ellipse rotation.');}
 if(e.type==='bezier'){if(!Array.isArray(e.segments)||e.segments.length<2||e.segments.length>200000)throw new Error('Invalid spline.');e.segments.forEach(s=>{point(s.p);point(s.in||[0,0]);point(s.out||[0,0]);});}
 if(['text','point'].includes(e.type))point(e.at);
 if(e.type==='text'){positive(e.height);if(typeof e.text!=='string'||e.text.length>2000||!Number.isFinite(e.rotation||0))throw new Error('Invalid text.');}
 if(e.type==='dimension'){point(e.a);point(e.b);point(e.p);if(!['aligned','horizontal','vertical'].includes(e.mode))throw new Error('Invalid dimension mode.');}
 if(e.type==='radial'){point(e.edge);point(e.p);}
 return e;
}
