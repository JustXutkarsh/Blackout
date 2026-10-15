import { Box3, Vector3 } from 'three';
import { CONFIG } from './config';
export type Ramp = { x1: number; x2: number; z1: number; z2: number; low: number; high: number; reverse?: boolean };
export type Surface = { x1: number; x2: number; z1: number; z2: number; y: number };
export type Body = { pos: Vector3; vel: Vector3; grounded: boolean };
export class Physics {
  boxes: Box3[] = []; ramps: Ramp[] = []; surfaces: Surface[] = [];
  addBox(x: number, y: number, z: number, w: number, h: number, d: number) { this.boxes.push(new Box3(new Vector3(x-w/2,y-h/2,z-d/2),new Vector3(x+w/2,y+h/2,z+d/2))); }
  rampY(r: Ramp, z: number) { const t = Math.max(0, Math.min(1, (z-r.z1)/(r.z2-r.z1))); return r.low + (r.high-r.low) * (r.reverse ? t : 1-t); }
  inRect(x: number,z: number,r: {x1:number;x2:number;z1:number;z2:number}, pad=0) { return x >= r.x1-pad && x <= r.x2+pad && z >= r.z1-pad && z <= r.z2+pad; }
  floor(x:number,z:number, maxY:number, radius=0) { let y=-100; for (const b of this.boxes) if (x+radius >= b.min.x && x-radius <= b.max.x && z+radius >= b.min.z && z-radius <= b.max.z && b.max.y <= maxY+.38) y=Math.max(y,b.max.y); for(const r of this.ramps) if(this.inRect(x,z,r) && this.rampY(r,z)<=maxY+.4) y=Math.max(y,this.rampY(r,z)); return y; }
  blocked(x:number,y:number,z:number,radius=CONFIG.player.radius,height=CONFIG.player.height) { for (const b of this.boxes) if(y+height>b.min.y+.015 && y<b.max.y-.32 && x+radius>b.min.x && x-radius<b.max.x && z+radius>b.min.z && z-radius<b.max.z) return true; for(const r of this.ramps) if(this.inRect(x,z,r,-.01) && y+height>r.low+.05 && this.rampY(r,z)>y+.4) return true; return false; }
  move(body:Body, dt:number) {
    const {pos,vel}=body; const radius=CONFIG.player.radius, height=CONFIG.player.height;
    // Small fixed simulation steps bound travel and make axis sliding stable.
    const oldY=pos.y;
    for (const axis of ['x','z'] as const) { const before=pos[axis]; pos[axis]+=vel[axis]*dt; if(this.blocked(pos.x,pos.y,pos.z)) { pos[axis]=before; vel[axis]=0; } }
    let floor=this.floor(pos.x,pos.z,pos.y,radius);
    if(body.grounded && floor > -90 && floor >= pos.y-.55 && vel.y<=0) { pos.y=floor; vel.y=0; }
    else { vel.y-=CONFIG.player.gravity*dt; pos.y+=vel.y*dt; }
    if(vel.y>0) for(const b of this.boxes) if(pos.x+radius>b.min.x && pos.x-radius<b.max.x && pos.z+radius>b.min.z && pos.z-radius<b.max.z && oldY+height<=b.min.y+.01 && pos.y+height>=b.min.y) {pos.y=b.min.y-height;vel.y=0;}
    floor=this.floor(pos.x,pos.z,Math.max(oldY,pos.y),radius);
    body.grounded=vel.y<=0 && pos.y<=floor+.015;
    if(body.grounded) {pos.y=floor;vel.y=0;}
  }
  traversable(a:Vector3,b:Vector3) {
    const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15)),dt=1/60;
    const body:Body={pos:a.clone(),vel:new Vector3(),grounded:true};
    for(let i=1;i<=n;i++){
      body.vel.x=(b.x-a.x)/(n*dt);body.vel.z=(b.z-a.z)/(n*dt);
      this.move(body,dt);
      if(Math.hypot(body.pos.x-(a.x+(b.x-a.x)*i/n),body.pos.z-(a.z+(b.z-a.z)*i/n))>.025||!body.grounded)return false;
    }
    return Math.abs(body.pos.y-b.y)<.2;
  }

  ray(origin:Vector3, direction:Vector3, max=100) { let nearest=max; for(const b of this.boxes) {const d=rayBox(origin,direction,b); if(d!==null && d<nearest) nearest=d;} for(const r of this.ramps) { // Sample the solid ramp wedge, including its sloping visible top.
      const bounds=new Box3(new Vector3(r.x1,r.low-.2,r.z1),new Vector3(r.x2,r.high,r.z2)); const start=rayBox(origin,direction,bounds); if(start===null || start>nearest) continue;
      const end=Math.min(nearest,start+Math.hypot(r.x2-r.x1,r.z2-r.z1,r.high-r.low)+1); for(let d=Math.max(0,start);d<end;d+=.07){const x=origin.x+direction.x*d,y=origin.y+direction.y*d,z=origin.z+direction.z*d;if(this.inRect(x,z,r)&&y>=r.low-.2&&y<=this.rampY(r,z)){nearest=d;break;}}
    } return nearest; }
}
export function rayBox(o:Vector3,d:Vector3,b:Box3):number|null { let near=-Infinity,far=Infinity; for(const a of ['x','y','z'] as const) {if(Math.abs(d[a])<1e-9){if(o[a]<b.min[a]||o[a]>b.max[a])return null;}else {let t1=(b.min[a]-o[a])/d[a],t2=(b.max[a]-o[a])/d[a];if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return null;}} return far<0?null:Math.max(0,near); }
export class Navigation {
  nodes:Vector3[]=[]; edges:number[][]=[];
  constructor(public physics:Physics) {
    const step=1.5, lookup=new Map<string,number[]>();
    for(let x=-27;x<=27;x+=step)for(let z=-24;z<=24;z+=step){ const heights=new Set<number>(); for(const s of physics.surfaces)if(physics.inRect(x,z,s))heights.add(s.y);for(const r of physics.ramps)if(physics.inRect(x,z,r))heights.add(physics.rampY(r,z));for(const y of heights){if(physics.blocked(x,y,z))continue;const i=this.nodes.length;this.nodes.push(new Vector3(x,y,z));this.edges.push([]);const key=`${x},${z}`;lookup.set(key,[...(lookup.get(key)||[]),i]);}}
    this.nodes.forEach((p,i)=>{for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step],[step,step],[-step,step],[step,-step],[-step,-step]])for(const j of lookup.get(`${p.x+dx},${p.z+dz}`)||[]){const q=this.nodes[j];if(Math.abs(p.y-q.y)<=.9&&physics.traversable(p,q))this.edges[i].push(j);}});
  }
  nearest(p:Vector3) { let best=0,d=Infinity;this.nodes.forEach((n,i)=>{const v=n.distanceToSquared(p)+(Math.abs(n.y-p.y)>1?200:0);if(v<d){d=v;best=i;}});return best; }
  path(from:Vector3,to:Vector3):Vector3[] {const start=this.nearest(from),goal=this.nearest(to),open=new Set([start]),came=new Map<number,number>(),g=new Map([[start,0]]),f=new Map([[start,0]]);let closest=start;
    while(open.size){let current=-1,best=Infinity;for(const i of open)if((f.get(i)??Infinity)<best){best=f.get(i)!;current=i;}if(current<0)break;if(this.nodes[current].distanceToSquared(to)<this.nodes[closest].distanceToSquared(to))closest=current;if(current===goal){closest=goal;break;}open.delete(current);for(const next of this.edges[current]){const cost=g.get(current)!+this.nodes[current].distanceTo(this.nodes[next]);if(cost<(g.get(next)??Infinity)){came.set(next,current);g.set(next,cost);f.set(next,cost+this.nodes[next].distanceTo(this.nodes[goal]));open.add(next);}}}
    const result:Vector3[]=[];let node=closest;while(node!==start&&came.has(node)){result.unshift(this.nodes[node]);node=came.get(node)!;}if(from.distanceTo(this.nodes[start])>.12)result.unshift(this.nodes[start]);return result;
  }
}
