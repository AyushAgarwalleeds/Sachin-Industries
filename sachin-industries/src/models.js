import * as THREE from 'three';
const cream=new THREE.MeshStandardMaterial({color:0xc5d1cb,metalness:.45,roughness:.4});
const teal=new THREE.MeshStandardMaterial({color:0xc4f76b,metalness:.6,roughness:.38});
const red=new THREE.MeshStandardMaterial({color:0xa5cc59,metalness:.5,roughness:.32});
const steel=new THREE.MeshStandardMaterial({color:0x91a69b,metalness:.9,roughness:.23});
const dark=new THREE.MeshStandardMaterial({color:0x1b2c24,metalness:.6,roughness:.42});
const black=new THREE.MeshStandardMaterial({color:0x08120d,metalness:.7,roughness:.17});
const screen=new THREE.MeshStandardMaterial({color:0xd7fa72,emissive:0x153d2e,metalness:.3,roughness:.2});
function box(group,w,h,d,x,y,z,material=cream){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);group.add(m);return m;}
function cylinder(group,r,h,x,y,z,material=steel){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),material);m.position.set(x,y,z);group.add(m);return m;}
function label(group,text,w,h,x,y,z,color='#e2e4d2',bg='#282f26'){
 if(typeof document==='undefined')return new THREE.Group();
 const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,512,128);g.fillStyle=color;g.font='bold 55px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,67);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,y,z);group.add(m);return m;
}
function feet(group,length){for(const x of [-length/2+.5,length/2-.5])for(const z of [-.72,.72])box(group,.38,.2,.4,x,.16,z,dark);}
function laser(){
 const root=new THREE.Group(),head=new THREE.Group();
 feet(root,8.8);box(root,8.8,.5,2.7,0,.5,0,dark);
 for(const z of [-1.2,1.2]){box(root,8.8,.7,.18,0,.93,z,cream);box(root,8.75,.23,.19,0,1.31,z,red);box(root,8.8,.4,.18,0,1.63,z,dark);box(root,8.8,.35,.18,0,2,z,cream);}
 box(root,.24,1.7,2.5,-4.3,1.45,0,cream);box(root,.24,1.7,2.5,4.3,1.45,0,cream);
 // An open roof exposes the working bed and moving cutting head.
 box(root,8.3,.09,2.2,0,.9,0,steel);
 for(let i=0;i<35;i++)box(root,.045,.12,2.1,-4+i*.235,1,0,dark);
 box(root,5.4,.035,1.7,-.9,1.07,0,steel);
 box(head,.2,.2,2.45,0,1.82,0,steel);for(const z of [-1.13,1.13])box(head,.42,.2,.28,0,1.65,z,dark);
 const nozzle=new THREE.Group();box(nozzle,.35,.47,.38,0,1.59,0,dark);cylinder(nozzle,.08,.17,0,1.28,0,red);head.add(nozzle);root.add(head);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.11,8),new THREE.MeshBasicMaterial({color:0xff7626}));beam.position.y=1.14;nozzle.add(beam);
 const sparks=new THREE.Group();const sparkMat=new THREE.MeshBasicMaterial({color:0xffa74a});for(let i=0;i<18;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.012,.012,.16),sparkMat);sparks.add(s);}nozzle.add(sparks);sparks.position.y=1.09;
 const glow=new THREE.PointLight(0xff7b2d,2,1.7);glow.position.y=1.15;nozzle.add(glow);
 for(let i=0;i<6;i++){box(root,1.3,.6,.03,-3.45+i*1.38,.83,1.31,cream);box(root,.2,.025,.03,-3.45+i*1.38,1.05,1.34,steel);}
 box(root,1.1,.6,.035,-2.8,1.7,1.32,black);label(root,'DF8255PRO',1.6,.22,-2.75,2.04,1.3,'#ac382d','#d7d5bc');
 const control=new THREE.Group();box(control,.6,1.25,.5,4.8,.9,1.3,dark);box(control,.45,.42,.02,4.8,1.2,1.56,screen);root.add(control);
 label(root,'SACHIN INDUSTRIES',1.5,.18,1.9,1.58,1.31);
 return{root,update(t){head.position.x=Math.sin(t*.55)*2.9;nozzle.position.z=Math.sin(t*1.7)*.68;for(let i=0;i<sparks.children.length;i++){const a=i*2.4+t*2,s=sparks.children[i];s.position.set(Math.cos(a)*(.04+(Math.sin(t*8+i)+1)*.1),.02+Math.abs(Math.sin(t*6+i))*.12,Math.sin(a)*.18);s.rotation.set(i,0,a);s.scale.z=.5+Math.abs(Math.sin(t*9+i));}glow.intensity=1.4+Math.sin(t*19)*.7;}};
}
function press(){
 const root=new THREE.Group(),ram=new THREE.Group();feet(root,8.8);box(root,8.8,.6,1.8,0,.5,0,cream);
 for(const x of [-4.15,4.15]){box(root,.65,3.7,1.5,x,2.1,-.1,teal);box(root,.35,3.6,1.7,x,2.1,-.65,cream);cylinder(root,.23,1.05,x,3.5,.25,steel);box(root,.9,.95,1,x,3.45,.2,teal);}
 box(root,8.3,.35,1.1,0,3.85,-.25,cream);
 box(ram,7.7,1.65,.55,0,2.7,.25,cream);box(ram,7.7,.2,.6,0,1.82,.3,dark);box(ram,7.65,.21,.14,0,1.62,.52,steel);
 for(let x=-3.6;x<=3.6;x+=.4){box(ram,.29,.1,.06,x,1.82,.62,steel);}root.add(ram);
 box(root,8,.16,.65,0,1.06,.4,dark);box(root,7.7,.09,.2,0,1.18,.52,steel);
 for(const x of [-2.7,0,2.7]){box(root,.13,.78,.2,x,.8,1.1,teal);box(root,.2,.09,1.4,x,1.21,1.13,steel);}
 const sheet=new THREE.Group();box(sheet,5.6,.025,.7,0,1.23,.4,steel);const leaf=new THREE.Group();leaf.position.set(0,1.23,.75);box(leaf,5.6,.025,.62,0,0,.31,steel);sheet.add(leaf);root.add(sheet);
 box(root,.13,1.3,.13,4.8,.9,1,steel);box(root,.48,.5,.15,4.8,1.55,1,dark);box(root,.36,.32,.02,4.8,1.58,1.09,screen);
 label(root,'EHP 650',1.7,.23,0,3.29,.55,'#222a24','#d7d5bc');label(root,'SACHIN INDUSTRIES',1.65,.18,0,.54,.92);
 return{root,update(t){const cycle=(1-Math.cos(t*.85))/2;ram.position.y=-cycle*.35;leaf.rotation.x=-cycle*1.05;}};
}
function shear(){
 const root=new THREE.Group(),blade=new THREE.Group();feet(root,8.8);box(root,8.8,.55,1.7,0,.48,-.1,teal);box(root,8.6,2,.5,0,2.55,-.35,cream);box(root,8.8,.15,.62,0,3.6,-.35,teal);
 for(const x of [-4.25,4.25])box(root,.38,3.2,1.5,x,1.92,-.2,teal);
 box(root,8.4,.12,.52,0,2.17,-.05,red);box(root,8.4,.07,.53,0,2.3,-.05,new THREE.MeshStandardMaterial({color:0xe9b72f,metalness:.4,roughness:.5}));
 box(blade,8.15,.32,.16,0,1.38,.08,steel);for(let x=-3.8;x<=3.8;x+=.38){cylinder(blade,.045,.32,x,1.25,.28,dark);box(blade,.14,.1,.15,x,1.05,.28,steel);}root.add(blade);
 box(root,8.5,.13,2.5,0,.91,.9,dark);box(root,7.5,.03,1.5,0,1,1,steel);
 for(let x=-3.8;x<=3.8;x+=1.25){box(root,.12,.12,2.6,x,1.08,1,teal);box(root,.12,.7,.15,x,.5,2.1,teal);}
 box(root,6.4,.03,.8,0,1.13,.63,steel);const offcut=box(root,6.4,.035,.4,0,1.13,1.24,steel);
 box(root,.65,.48,.05,-3.3,2.55,-.06,dark);box(root,.45,.2,.02,-3.3,2.65,-.02,screen);for(const x of [-3.47,-3.28,-3.09])cylinder(root,.035,.05,x,2.45,.03,red);
 label(root,'JAYSON',1.7,.32,0,3.1,-.08);label(root,'SACHIN INDUSTRIES',1.8,.18,0,.5,.77);
 return{root,update(t){const cycle=(1-Math.cos(t*.85))/2;blade.position.y=-cycle*.18;offcut.rotation.x=-Math.max(0,cycle-.6)*1.3;offcut.position.y=1.13-Math.max(0,cycle-.6)*.85;}};
}

export function createMachineModels(){return {laser:laser(),bending:press(),shearing:shear()};}
