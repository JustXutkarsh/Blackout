import { Box3, Vector3 } from 'three';
import { CONFIG } from './config';
export type Ramp = { x1: number; x2: number; z1: number; z2: number; low: number; high: number; reverse?: boolean };
export type Surface = { x1: number; x2: number; z1: number; z2: number; y: number };
export type Body = { pos: Vector3; vel: Vector3; grounded: boolean; height?:number; yaw?:number; stance?:{elongated:boolean} };
const AXES=['x','y','z'] as const;
export function bodyEye(height:number,crouched:boolean,current:number,dt:number) {
  const target=crouched?CONFIG.player.crouchEye:CONFIG.player.eye;
  return Math.max(.2,Math.min(height-.12,current+(target-current)*(1-Math.exp(-14*dt))));
}
export class Physics {
  private rampBounds=new WeakMap<Ramp,Box3>();
  boxes: Box3[] = []; ramps: Ramp[] = []; surfaces: Surface[] = [];
  addBox(x: number, y: number, z: number, w: number, h: number, d: number) { this.boxes.push(new Box3(new Vector3(x-w/2,y-h/2,z-d/2),new Vector3(x+w/2,y+h/2,z+d/2))); }
  rampY(r: Ramp, z: number) { const t = Math.max(0, Math.min(1, (z-r.z1)/(r.z2-r.z1))); return r.low + (r.high-r.low) * (r.reverse ? t : 1-t); }
  inRect(x: number,z: number,r: {x1:number;x2:number;z1:number;z2:number}, pad=0) { return x >= r.x1-pad && x <= r.x2+pad && z >= r.z1-pad && z <= r.z2+pad; }
  floor(x:number,z:number, maxY:number, radius=0) { let y=-100; for (const b of this.boxes) if (x+radius >= b.min.x && x-radius <= b.max.x && z+radius >= b.min.z && z-radius <= b.max.z && b.max.y <= maxY+.38) y=Math.max(y,b.max.y); for(const r of this.ramps) if(this.inRect(x,z,r) && this.rampY(r,z)<=maxY+.4) y=Math.max(y,this.rampY(r,z)); return y; }
  blocked(x:number,y:number,z:number,radius:number=CONFIG.player.radius,height:number=CONFIG.player.height) { for (const b of this.boxes) if(y+height>b.min.y+.015 && y<b.max.y-.32 && x+radius>b.min.x && x-radius<b.max.x && z+radius>b.min.z && z-radius<b.max.z) return true; for(const r of this.ramps) if(this.inRect(x,z,r,radius-.001) && y+height>r.low-.2+.015 && this.rampY(r,Math.max(r.z1,Math.min(r.z2,z)))>y+.4) return true; return false; }
  supported(pos:Vector3,height:number=CONFIG.player.height) {
    if(!Number.isFinite(pos.x+pos.y+pos.z))return false;
    const r=CONFIG.player.radius*.8;
    for(const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]])if(Math.abs(this.floor(pos.x+dx,pos.z+dz,pos.y)-pos.y)>.13)return false;
    return this.clearance(pos,height);
  }
  clearance(pos:Vector3,height:number) {
    const r=CONFIG.player.radius;
    for(const b of this.boxes)if(pos.y+height>b.min.y+.015&&pos.y<b.max.y-.025&&pos.x+r>b.min.x&&pos.x-r<b.max.x&&pos.z+r>b.min.z&&pos.z-r<b.max.z)return false;
    return !this.blocked(pos.x,pos.y,pos.z,r,height);
  }
  proneFits(pos:Vector3,yaw:number,height:number=CONFIG.stance.height) {
    const {front,rear,radius,supportTolerance}=CONFIG.stance;for(const along of [-front-radius*.85,rear+radius*.85])if(Math.abs(this.floor(pos.x+Math.sin(yaw)*along,pos.z+Math.cos(yaw)*along,pos.y)-pos.y)>supportTolerance)return false;
    for(let along=-front;along<=rear+.001;along+=(front+rear)/8){const x=pos.x+Math.sin(yaw)*along,z=pos.z+Math.cos(yaw)*along;
      for(const side of [-radius,0,radius]){const sx=x+Math.cos(yaw)*side,sz=z-Math.sin(yaw)*side;if(Math.abs(this.floor(sx,sz,pos.y)-pos.y)>supportTolerance)return false;}
      for(const b of this.boxes){const dx=Math.max(b.min.x-x,0,x-b.max.x),dz=Math.max(b.min.z-z,0,z-b.max.z);if(dx*dx+dz*dz<radius*radius&&pos.y+height>b.min.y+.01&&pos.y<b.max.y-.025)return false;}
      for(const r of this.ramps)if(this.inRect(x,z,r,radius)&&this.rampY(r,Math.max(r.z1,Math.min(r.z2,z)))>pos.y+.08)return false;
    }return true;
  }
  spawnPosition(candidate:Vector3) {
    const y=this.floor(candidate.x,candidate.z,candidate.y+.1);
    const p=new Vector3(candidate.x,y,candidate.z);
    return Math.abs(y-candidate.y)<.4&&this.supported(p)?p:null;
  }
  move(body:Body, dt:number) {
    if(!Number.isFinite(body.pos.lengthSq()+body.vel.lengthSq())){body.pos.y=-100;body.vel.set(0,0,0);body.grounded=false;return;}
    // Also guard callers outside the main fixed-step loop (stalls / test / tools).
    let remaining=Math.min(.5,Math.max(0,dt));
    while(remaining>1e-8){const speed=Math.max(1,Math.abs(body.vel.x),Math.abs(body.vel.y),Math.abs(body.vel.z));const step=Math.min(remaining,1/120,.12/speed);this.moveStep(body,step);remaining-=step;}
  }
  private moveStep(body:Body, dt:number) {
    const {pos,vel}=body; const radius=CONFIG.player.radius, height=body.height??CONFIG.player.height;
    // Small fixed simulation steps bound travel and make axis sliding stable.
    const oldY=pos.y;
    for (const axis of ['x','z'] as const) { const before=pos[axis]; pos[axis]+=vel[axis]*dt; if(body.stance?.elongated?!this.proneFits(pos,body.yaw??0,height):this.blocked(pos.x,pos.y,pos.z,radius,height)) { pos[axis]=before; vel[axis]=0; } }
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
      let bounds=this.rampBounds.get(r);if(!bounds){bounds=new Box3(new Vector3(r.x1,r.low-.2,r.z1),new Vector3(r.x2,r.high,r.z2));this.rampBounds.set(r,bounds);} const start=rayBox(origin,direction,bounds); if(start===null || start>nearest) continue;
      const end=Math.min(nearest,start+Math.hypot(r.x2-r.x1,r.z2-r.z1,r.high-r.low)+1); for(let d=Math.max(0,start);d<end;d+=.07){const x=origin.x+direction.x*d,y=origin.y+direction.y*d,z=origin.z+direction.z*d;if(this.inRect(x,z,r)&&y>=r.low-.2&&y<=this.rampY(r,z)){nearest=d;break;}}
    } return nearest; }
}
export function rayBox(o:Vector3,d:Vector3,b:Box3):number|null { let near=-Infinity,far=Infinity; for(const a of AXES) {if(Math.abs(d[a])<1e-9){if(o[a]<b.min[a]||o[a]>b.max[a])return null;}else {let t1=(b.min[a]-o[a])/d[a],t2=(b.max[a]-o[a])/d[a];if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return null;}} return far<0?null:Math.max(0,near); }
export class Navigation {
  nodes:Vector3[]=[]; edges:number[][]=[];
  constructor(public physics:Physics,bounds={minX:-30,maxX:30,minZ:-25,maxZ:25}) {
    const step=1.5, lookup=new Map<string,number[]>();
    for(let x=Math.ceil((bounds.minX+1)/step)*step;x<bounds.maxX-1;x+=step)for(let z=Math.ceil((bounds.minZ+1)/step)*step;z<bounds.maxZ-1;z+=step){ const heights=new Set<number>(); for(const s of physics.surfaces)if(physics.inRect(x,z,s))heights.add(s.y);for(const r of physics.ramps)if(physics.inRect(x,z,r))heights.add(physics.rampY(r,z));for(const y of heights){if(physics.blocked(x,y,z))continue;const i=this.nodes.length;this.nodes.push(new Vector3(x,y,z));this.edges.push([]);const key=`${x},${z}`;lookup.set(key,[...(lookup.get(key)||[]),i]);}}
    this.nodes.forEach((p,i)=>{for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step],[step,step],[-step,step],[step,-step],[-step,-step]])for(const j of lookup.get(`${p.x+dx},${p.z+dz}`)||[]){const q=this.nodes[j];if(Math.abs(p.y-q.y)<=.9&&physics.traversable(p,q))this.edges[i].push(j);}});
  }
  nearest(p:Vector3) { let best=0,d=Infinity;this.nodes.forEach((n,i)=>{const v=n.distanceToSquared(p)+(Math.abs(n.y-p.y)>1?200:0);if(v<d){d=v;best=i;}});return best; }
  path(from:Vector3,to:Vector3):Vector3[] {const start=this.nearest(from),goal=this.nearest(to),open=new Set([start]),came=new Map<number,number>(),g=new Map([[start,0]]),f=new Map([[start,0]]);let closest=start;
    while(open.size){let current=-1,best=Infinity;for(const i of open)if((f.get(i)??Infinity)<best){best=f.get(i)!;current=i;}if(current<0)break;if(this.nodes[current].distanceToSquared(to)<this.nodes[closest].distanceToSquared(to))closest=current;if(current===goal){closest=goal;break;}open.delete(current);for(const next of this.edges[current]){const cost=g.get(current)!+this.nodes[current].distanceTo(this.nodes[next]);if(cost<(g.get(next)??Infinity)){came.set(next,current);g.set(next,cost);f.set(next,cost+this.nodes[next].distanceTo(this.nodes[goal]));open.add(next);}}}
    const result:Vector3[]=[];let node=closest;while(node!==start&&came.has(node)){result.unshift(this.nodes[node]);node=came.get(node)!;}if(from.distanceTo(this.nodes[start])>.12)result.unshift(this.nodes[start]);return result;
  }
}
