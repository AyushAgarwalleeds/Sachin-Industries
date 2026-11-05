import * as THREE from 'three';
import {writeFile,mkdir} from 'node:fs/promises';
import {createMachineModels} from '../src/models.js';
const models=createMachineModels(),data={fps:24,duration:24,models:{}};
for(const [name,model] of Object.entries(models)){
 model.update(0);model.root.updateMatrixWorld(true);const meshes=[];
 model.root.traverse(m=>{if(!m.isMesh)return;const geometry=m.geometry,index=geometry.index,position=geometry.attributes.position,vertices=[];for(let i=0;i<position.count;i++)vertices.push([position.getX(i),-position.getZ(i),position.getY(i)]);const faces=[];for(let i=0;i<(index?.count||position.count);i+=3)faces.push([0,1,2].map(n=>index?index.getX(i+n):i+n));const mat=Array.isArray(m.material)?m.material[0]:m.material;meshes.push({object:m,vertices,faces,color:mat.color.toArray(),hex:mat.color.getHexString(),metalness:mat.metalness||0,roughness:mat.roughness??.3,emission:mat.isMeshBasicMaterial?mat.color.toArray():mat.emissive?.toArray()||[0,0,0],matrix:m.matrixWorld.toArray(),keys:[]});});
 for(let frame=1;frame<=192;frame+=4){model.update((frame-1)/24);model.root.updateMatrixWorld(true);for(const part of meshes){const mat=part.object.matrixWorld.toArray();if(mat.some((n,i)=>Math.abs(n-part.matrix[i])>1e-5))part.keys.push({frame,matrix:mat});}}
 data.models[name]=meshes.map(({object,...part})=>part);
}
await mkdir('artwork',{recursive:true});await writeFile('artwork/machines.json',JSON.stringify(data));
console.log('Exported 3 machine models and process animation for the 24-second film.');
