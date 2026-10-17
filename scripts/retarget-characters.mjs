// Offline rest-pose calibration: Quaternius mannequin clips -> Quaternius body proportions.
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const folder='public/assets/characters/';
function parse(buffer,strip=false){const n=buffer.readUInt32LE(12),json=JSON.parse(buffer.subarray(20,20+n));if(strip){delete json.images;delete json.textures;delete json.materials;for(const m of json.meshes??[])for(const p of m.primitives)delete p.material;}return {json,bin:buffer.subarray(28+n)};}
function pack(json,bin){json.buffers=[{byteLength:bin.length}];let js=Buffer.from(JSON.stringify(json));js=Buffer.concat([js,Buffer.alloc((4-js.length%4)%4,32)]);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);const h=Buffer.alloc(20),b=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+js.length+bin.length,8);h.writeUInt32LE(js.length,12);h.writeUInt32LE(0x4e4f534a,16);b.writeUInt32LE(bin.length);b.writeUInt32LE(0x004e4942,4);return Buffer.concat([h,js,b,bin]);}
const loader=new GLTFLoader(),b=parse(fs.readFileSync(folder+'crew-base.glb'),true),s=parse(fs.readFileSync(folder+'crew-motion.glb'));
const load=async obj=>{const bytes=pack(obj.json,obj.bin);return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'');};
const base=await load(b),source=await load(s),mixer=new T.AnimationMixer(source.scene),tp=source.animations.find(c=>c.name==='A_TPose');mixer.clipAction(tp).play();mixer.update(0);base.scene.updateMatrixWorld(true);source.scene.updateMatrixWorld(true);
const bones=[];base.scene.traverse(o=>{if(o instanceof T.Bone)bones.push(o);});const rest=new Map(bones.map(bone=>[bone.name,{q:bone.getWorldQuaternion(new T.Quaternion()),p:bone.position.clone(),world:bone.getWorldPosition(new T.Vector3()),source:source.scene.getObjectByName(bone.name).getWorldQuaternion(new T.Quaternion()),sourceP:source.scene.getObjectByName(bone.name).getWorldPosition(new T.Vector3())}]));
const chunks=[],views=[],accessors=[],animations=[];let offset=0;
function accessor(values,type){const f=Float32Array.from(values),buf=Buffer.from(f.buffer);views.push({buffer:0,byteOffset:offset,byteLength:buf.length});chunks.push(buf);offset+=buf.length;const count=f.length/(type==='VEC4'?4:type==='VEC3'?3:1),a={bufferView:views.length-1,componentType:5126,count,type};if(type==='SCALAR'){a.min=[values[0]];a.max=[values.at(-1)];}accessors.push(a);return accessors.length-1;}
const nodeIndex=new Map(b.json.nodes.map((n,i)=>[n.name,i]));
for(const clip of source.animations){mixer.stopAllAction();const action=mixer.clipAction(clip).play();action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;const times=[],values=new Map(bones.map(bone=>[bone.name,[]])),hips=[];const frames=Math.max(2,Math.ceil(clip.duration*30)+1);
 for(let frame=0;frame<frames;frame++){const t=frame/(frames-1)*clip.duration;times.push(t);mixer.setTime(t);source.scene.updateMatrixWorld(true);
  for(const bone of bones){const r=rest.get(bone.name),src=source.scene.getObjectByName(bone.name),desired=src.getWorldQuaternion(new T.Quaternion()).multiply(r.source.clone().invert()).multiply(r.q),parent=bone.parent.getWorldQuaternion(new T.Quaternion());bone.quaternion.copy(parent.invert().multiply(desired));bone.position.copy(r.p);
   if(bone.name==='pelvis'){const delta=src.getWorldPosition(new T.Vector3()).sub(r.sourceP);delta.x=T.MathUtils.clamp(delta.x,-.12,.12);delta.z=T.MathUtils.clamp(delta.z,-.12,.12);bone.parent.getWorldQuaternion(parent).invert();bone.position.add(delta.applyQuaternion(parent));hips.push(...bone.position.toArray());}
   bone.updateWorldMatrix(false,true);const list=values.get(bone.name);if(list.length){const last=new T.Quaternion().fromArray(list,list.length-4);if(last.dot(bone.quaternion)<0)bone.quaternion.set(-bone.quaternion.x,-bone.quaternion.y,-bone.quaternion.z,-bone.quaternion.w);}list.push(...bone.quaternion.toArray());
  }
 }
 const anim={name:clip.name,samplers:[],channels:[]},time=accessor(times,'SCALAR');
 for(const [name,array] of values){const constant=array.every((x,i)=>Math.abs(x-array[i%4])<1e-5),input=constant?accessor([0,clip.duration],'SCALAR'):time,output=accessor(constant?[...array.slice(0,4),...array.slice(0,4)]:array,'VEC4');anim.channels.push({sampler:anim.samplers.length,target:{node:nodeIndex.get(name),path:'rotation'}});anim.samplers.push({input,output,interpolation:'LINEAR'});}
 anim.channels.push({sampler:anim.samplers.length,target:{node:nodeIndex.get('pelvis'),path:'translation'}});anim.samplers.push({input:time,output:accessor(hips,'VEC3'),interpolation:'LINEAR'});animations.push(anim);
}
const nodes=b.json.nodes.map(n=>Object.fromEntries(Object.entries(n).filter(([k])=>!['mesh','skin'].includes(k))));fs.writeFileSync(folder+'crew-motion.glb',pack({asset:{version:'2.0',copyright:'Quaternius CC0; rest-pose retargeting and in-place root constraint by BLACKOUT'},scene:b.json.scene,scenes:b.json.scenes,nodes,animations,bufferViews:views,accessors},Buffer.concat(chunks)));console.log('Retargeted',animations.length,'clips',offset,'binary bytes');
