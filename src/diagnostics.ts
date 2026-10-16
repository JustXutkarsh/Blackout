import * as T from 'three';
import type { Game } from './game';
// Loaded only by Vite's development entry. F3 toggles; no physics mutation.
export function installDiagnostics(game:Game){
  const group=new T.Group(),boxes:T.Box3Helper[]=[];group.visible=false;game.scene.add(group);
  for(const b of game.world.physics.boxes){const h=new T.Box3Helper(b,0x5ae5a6);group.add(h);}
  for(const r of game.world.physics.ramps){const points=[new T.Vector3(r.x1,game.world.physics.rampY(r,r.z1),r.z1),new T.Vector3(r.x2,game.world.physics.rampY(r,r.z1),r.z1),new T.Vector3(r.x2,game.world.physics.rampY(r,r.z2),r.z2),new T.Vector3(r.x1,game.world.physics.rampY(r,r.z2),r.z2)];group.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xffd060,depthTest:false})));}
  for(const a of game.actors){const h=new T.Box3Helper(new T.Box3(),a.team==='blue'?0x65baff:0xff983f);group.add(h);boxes.push(h);}
  const feet=new T.Mesh(new T.SphereGeometry(.07,8,6),new T.MeshBasicMaterial({color:0xff4c7c,depthTest:false}));const camera=feet.clone();(camera.material as T.Material)=new T.MeshBasicMaterial({color:0xffff40,depthTest:false});group.add(feet,camera);
  const text=document.createElement('pre');text.id='physics-diagnostics';text.style.cssText='position:fixed;left:230px;top:100px;z-index:120;background:#091923dc;padding:12px;color:#c2ffe5;font:11px/1.6 monospace;pointer-events:none';text.hidden=true;document.body.append(text);
  document.addEventListener('keydown',e=>{if(e.code==='F3'){e.preventDefault();group.visible=!group.visible;text.hidden=!group.visible;}},{signal:game.abort.signal});
  const update=()=>{if(!group.visible)return;game.actors.forEach((a,i)=>{boxes[i].box.min.copy(a.pos).add(new T.Vector3(-.32,0,-.32));boxes[i].box.max.copy(a.pos).add(new T.Vector3(.32,a.height,.32));boxes[i].visible=a.health>0;});feet.position.copy(game.player.pos);camera.position.copy(game.camera.position);const p=game.player;text.textContent=`F3 / COLLISION DIAGNOSTICS\nGreen: solid boxes · gold: ramp tops\nPink: feet · yellow: camera · blue/orange: actors\nFeet ${p.pos.toArray().map(n=>n.toFixed(3)).join(' / ')}\nCamera ${game.camera.position.toArray().map(n=>n.toFixed(3)).join(' / ')}\nEye ${(game.camera.position.y-p.pos.y).toFixed(3)} · body ${p.height.toFixed(2)}\nGrounded ${p.grounded} · supported ${game.world.physics.supported(p.pos,p.height)}`;};
  game.diagnosticUpdate=update;game.abort.signal.addEventListener('abort',()=>{text.remove();game.scene.remove(group);group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose();(o.material as T.Material).dispose();}});});
}
