// Build-time export from the actual rendered world, never a hand-maintained second map.
import * as T from 'three';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
T.TextureLoader.prototype.load=function(){return new T.Texture();};
const ctx=new Proxy({}, {get:()=>()=>({addColorStop(){}}),set:()=>true});
Object.assign(globalThis,{document:{createElement:()=>({width:64,height:64,getContext:()=>ctx})}});
const {World}=await import('../src/world');
const world=new World(new T.Scene());
const data={bounds:world.bounds,boxes:world.physics.boxes.map(b=>[...b.min.toArray(),...b.max.toArray()]),ramps:world.physics.ramps,surfaces:world.physics.surfaces,spawns:{blue:world.teamSpawns.blue.map(v=>v.toArray()),orange:world.teamSpawns.orange.map(v=>v.toArray())},pickups:world.pickups.map(p=>({pos:p.pos.toArray(),kind:p.kind})),nodes:world.nav.nodes.map(v=>v.toArray()),edges:world.nav.edges,routes:world.routes.map(r=>r.map(v=>v.toArray()))};
const output='src/net/world-data.json',json=JSON.stringify(data);if(!existsSync(output)||readFileSync(output,'utf8')!==json)writeFileSync(output,json);
console.log(`Exported ${data.boxes.length} colliders / ${data.nodes.length} navigation nodes`);
