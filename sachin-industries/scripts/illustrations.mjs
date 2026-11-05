import * as THREE from 'three';
import {mkdir,writeFile} from 'node:fs/promises';
import {createMachineModels} from '../src/models.js';
const models=createMachineModels();
const camera=new THREE.PerspectiveCamera(34,1.5,.1,100);camera.position.set(11,8,13);camera.lookAt(0,1.4,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
const light=new THREE.Vector3(-.3,.85,.5).normalize();
function geometry(model){
 model.update(.6);model.root.updateMatrixWorld(true);const faces=[];
 model.root.traverse(mesh=>{
  if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,idx=mesh.geometry.index,mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
  const base=mat.color.clone().convertLinearToSRGB();
  for(let i=0;i<(idx?.count||p.count);i+=3){
   const points=[0,1,2].map(n=>new THREE.Vector3().fromBufferAttribute(p,idx?idx.getX(i+n):i+n).applyMatrix4(mesh.matrixWorld));
   const centre=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3),normal=new THREE.Vector3().crossVectors(points[1].clone().sub(points[0]),points[2].clone().sub(points[0])).normalize();
   if(normal.dot(camera.position.clone().sub(centre))<0)continue;
   const shade=mat.isMeshBasicMaterial?1.2:.43+.64*Math.max(0,normal.dot(light));
   const rgb=[base.r,base.g,base.b].map(v=>Math.round(Math.min(255,v*255*shade)));
   const xy=points.map(p=>p.project(camera)).map(p=>`${((p.x+1)*600).toFixed(1)},${((1-p.y)*400).toFixed(1)}`).join(' ');
   faces.push({depth:centre.applyMatrix4(camera.matrixWorldInverse).z,svg:`<polygon points="${xy}" fill="rgb(${rgb.join(',')})"/>`});
  }
 });
 faces.sort((a,b)=>a.depth-b.depth);return faces.map(f=>f.svg).join('');
}
const shapes=Object.fromEntries(Object.entries(models).map(([k,m])=>[k,geometry(m)]));
const defs=`<defs><radialGradient id="glow"><stop stop-color="#314b2e"/><stop offset="1" stop-color="#101a14"/></radialGradient><pattern id="grid" width="70" height="70" patternUnits="userSpaceOnUse" patternTransform="translate(600 290) matrix(1 .45 -1 .45 0 0)"><path d="M70 0H0V70" fill="none" stroke="#597447" stroke-width=".7"/></pattern><filter id="shadow"><feGaussianBlur stdDeviation="18"/></filter></defs>`;
function frame(body,label,width=1200,height=800){return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${defs}<rect width="100%" height="100%" fill="#101a14"/><ellipse cx="${width*.6}" cy="${height*.5}" rx="${width*.6}" ry="${height*.6}" fill="url(#glow)" opacity=".75"/><rect width="100%" height="100%" fill="url(#grid)" opacity=".32"/>${body}</svg>`;}
await mkdir('public/illustrations',{recursive:true});
for(const name of Object.keys(models)){
 const body=`<ellipse cx="610" cy="580" rx="405" ry="55" fill="#060d08" opacity=".7" filter="url(#shadow)"/>${shapes[name]}<path d="M80 690H1120M80 677V703M1120 677V703" stroke="#a7c77a" opacity=".38" fill="none"/><text x="82" y="745" font-family="monospace" font-size="13" letter-spacing="2" fill="#9db18f">SACHIN INDUSTRIES / ${name.toUpperCase()} / 3D STUDY</text>`;
 await writeFile(`public/illustrations/${name}.svg`,frame(body,`Stylized three-dimensional ${name} machine illustration`));
}
const overview=`<g transform="translate(680,-70) scale(.68)">${shapes.bending}</g><g transform="translate(-90,0) scale(.65)">${shapes.shearing}</g><g transform="translate(240,360) scale(.9)">${shapes.laser}</g><g font-family="monospace" font-size="17" fill="#b7d08b" letter-spacing="2"><text x="160" y="470">03 / SHEAR</text><text x="1180" y="110">02 / BEND</text><text x="420" y="980">01 / CUT</text></g>`;
await writeFile('public/illustrations/hero-study.svg',frame(overview,'Three stylized sheet metal machines: laser cutting, bending and shearing',1600,1100));
await writeFile('public/illustrations/workshop-study.svg',frame(overview,'Conceptual arrangement of the three metalworking processes',1600,1100));
console.log('Generated five original SVG machine illustrations from the shared 3D geometry.');
