import * as THREE from 'three';
import {createMachineModels} from './models.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function setup(host,background){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{return null;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 renderer.domElement.setAttribute('aria-hidden','true');host.prepend(renderer.domElement);host.classList.add('has-webgl');
 const scene=new THREE.Scene();scene.background=new THREE.Color(background);
 const camera=new THREE.PerspectiveCamera(35,host.clientWidth/host.clientHeight,.1,100);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xf7f5df,0x182014,2));
 const key=new THREE.DirectionalLight(0xfff6dc,4);key.position.set(-4,8,6);scene.add(key);
 const rim=new THREE.DirectionalLight(0xd9e6c3,3);rim.position.set(5,2,-5);scene.add(rim);
 let dirty=true;
 const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;});resize.observe(host);
 let visible=true;new IntersectionObserver(e=>visible=e[0].isIntersecting,{rootMargin:'100px'}).observe(host);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();host.classList.remove('has-webgl');renderer.setAnimationLoop(null);});
 return {scene,camera,renderer,isVisible:()=>visible&&!document.hidden&&host.dataset.view!=='diagram',invalidate:()=>{dirty=true;},needsFrame:()=>{const result=dirty;dirty=false;return result;}};
}
export function initMachines(host,moving){
 const ctx=setup(host,0x171f1c);if(!ctx)return;
 const {scene,camera,renderer}=ctx;camera.position.set(9,6.1,10.5);camera.lookAt(0,1.2,0);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.4,0);controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=true;controls.dampingFactor=.07;controls.minPolarAngle=.35;controls.maxPolarAngle=Math.PI*.49;controls.autoRotate=false;
 const models=createMachineModels();Object.entries(models).forEach(([name,m])=>{m.root.visible=name==='laser';scene.add(m.root);});
 const grid=new THREE.GridHelper(24,32,0x5c6650,0x394331);grid.position.y=.01;scene.add(grid);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(10,4.8),new THREE.MeshBasicMaterial({color:0x121a12,transparent:true,opacity:.25,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.005;scene.add(shadow);
 let selected='laser',t=0,last=0;
 controls.addEventListener('change',()=>ctx.invalidate());
 function reset(){controls.enableDamping=false;controls.update();const fit=Math.max(1,1.2/camera.aspect);camera.position.set(9*fit,1.4+4.7*fit,10.5*fit);controls.target.set(0,1.4,0);camera.lookAt(controls.target);controls.update();controls.enableDamping=true;ctx.invalidate();}
 new ResizeObserver(reset).observe(host);
 renderer.setAnimationLoop(now=>{if(!ctx.isVisible()){last=now;return;}const dt=Math.min((now-last)/1000,.05);last=now;controls.update();if(!moving&&!ctx.needsFrame())return;if(moving)t+=dt;models[selected].update(t);renderer.render(scene,camera);});
 return{select(name){if(!models[name])return;selected=name;Object.entries(models).forEach(([n,m])=>m.root.visible=n===name);reset();},reset,setMotion(v){moving=v;ctx.invalidate();}};
}
