import {Vector3,Box3} from 'three';
import {CONFIG,type WeaponId} from '../config';
import {Physics,Navigation} from '../physics';
import {Stance,turnBody,eyePosition,postureHit,STANCES} from '../stance';
import {WeaponState,FallState,damage,endProtection,tickLife,type Team} from '../rules';
import {NET,neutral,type Input,type ActorWire,type NetEvent} from './protocol';
import map from './world-data.json';
export {map};
let mapHash=2166136261;for(const char of JSON.stringify(map))mapHash=Math.imul(mapHash^char.charCodeAt(0),16777619)>>>0;
export const MAP_VERSION=`village-${mapHash.toString(16)}-protocol1`;
export function mapPhysics(){const p=new Physics();p.boxes=map.boxes.map(b=>new Box3(new Vector3(...b.slice(0,3) as [number,number,number]),new Vector3(...b.slice(3) as [number,number,number])));p.ramps=map.ramps;p.surfaces=map.surfaces;return p;}
export function mapNavigation(p:Physics){const n=Object.create(Navigation.prototype) as Navigation;Object.assign(n,{physics:p,nodes:map.nodes.map(v=>new Vector3().fromArray(v)),edges:map.edges,anchorIds:new Int32Array(8),anchorCosts:new Float64Array(8)});return n;}
export class NetActor {
  pos=new Vector3();vel=new Vector3();yaw=0;pitch=0;grounded=true;stance=new Stance();fall=new FallState();lastSafe=new Vector3();invalidTime=0;
  health=100;dead=0;protection=2;kills=0;deaths=0;sinceDamage=0;shots=0;hits=0;lastKiller='';generation=0;
  weapons={rifle:new WeaponState('rifle'),pistol:new WeaponState('pistol'),knife:new WeaponState('knife')};active:WeaponId='rifle';switchLeft=0;ads=0;sprint=false;ack=-1;input=neutral();queue:Input[]=[];lastInput=0;lastSeq=-1;
  bot=false;connected=true;repath=0;path:Vector3[]=[];think=0;memory?:Vector3;memoryUntil=0;target='';reaction=0;route=0;routeIndex=0;stuck=0;previous=new Vector3();
  constructor(public id:string,public slot:number,public name:string,public team:Team){}
  get height(){return this.stance.height;}get weapon(){return this.weapons[this.active];}
  reset(pos:Vector3){this.pos.copy(pos);this.vel.set(0,0,0);this.previous.copy(pos);this.stance.reset();this.fall.reset(pos.y);this.lastSafe.copy(pos);this.invalidTime=0;this.health=100;this.dead=0;this.protection=2;this.sinceDamage=0;this.switchLeft=0;this.ads=0;this.sprint=false;this.weapons={rifle:new WeaponState('rifle'),pistol:new WeaponState('pistol'),knife:new WeaponState('knife')};this.active='rifle';this.lastKiller='';this.grounded=true;this.yaw=this.team==='blue'?0:Math.PI;this.pitch=0;this.input=neutral(this.ack);this.input.yaw=this.yaw;this.queue=[];this.generation++;this.path=[];this.memory=undefined;this.target='';}
}
const origin=new Vector3(),direction=new Vector3(),muzzle=new Vector3(),end=new Vector3(),otherEye=new Vector3();
export function moveInput(a:NetActor,i:Input,p:Physics,dt:number){
  if(a.health<=0)return false;a.stance.tick(dt);turnBody(a,i.yaw,p);a.pitch=i.pitch;
  if(i.stance)a.stance.request(i.stance,a,p);
  if(i.weapon&&i.weapon!==a.active){a.weapon.cancelReload();a.active=i.weapon;a.switchLeft=CONFIG.view.switchSeconds;a.ads=0;}
  if(i.reload&&a.switchLeft<=0)a.weapon.reload();
  const length=Math.hypot(i.x,i.z),x=i.x/Math.max(1,length),z=i.z/Math.max(1,length);
  if(i.sprint&&length&&a.stance.kind!=='standing'&&!a.stance.changing)a.stance.request('standing',a,p);
  a.sprint=i.sprint&&length>0&&a.stance.kind==='standing'&&!a.stance.changing&&!a.weapon.reloadLeft&&a.grounded;
  if(a.weapon.automaticReload(dt,i.autoReload,a.switchLeft<=0&&!a.stance.changing,a.sprint))a.sprint=false;
  eyePosition(a,origin);direction.set(-Math.sin(a.yaw)*Math.cos(a.pitch),Math.sin(a.pitch),-Math.cos(a.yaw)*Math.cos(a.pitch));
  const range=a.active==='rifle'?1.1:.6,wall=p.ray(origin,direction,range)<range-.02;
  const aim=i.ads&&!a.sprint&&!a.weapon.reloadLeft&&!a.stance.changing&&a.active!=='knife'&&a.switchLeft<=0&&!wall;
  a.ads+=(Number(aim)-a.ads)*(1-Math.exp(-CONFIG.view.transition*dt));
  const speed=(a.sprint?CONFIG.player.sprint:CONFIG.player.speed)*(1+(CONFIG.view.adsSpeed-1)*a.ads)*a.stance.speed;
  const blend=1-Math.exp(-(length?CONFIG.player.acceleration:CONFIG.player.braking)*dt);
  a.vel.x+=((x*Math.cos(a.yaw)+z*Math.sin(a.yaw))*speed-a.vel.x)*blend;a.vel.z+=((-x*Math.sin(a.yaw)+z*Math.cos(a.yaw))*speed-a.vel.z)*blend;
  if(a.stance.changing)a.vel.x=a.vel.z=0;
  if(i.jump){if(a.stance.kind!=='standing')a.stance.request('standing',a,p);else if(a.grounded&&!a.stance.changing){a.vel.y=CONFIG.player.jump;a.grounded=false;}}
  p.move(a,dt);
  return !a.sprint&&!a.stance.changing&&a.switchLeft<=0&&(i.fire||i.press)&&(a.active==='rifle'||i.press);
}
export function tickWeapons(a:NetActor,dt:number,emit?:(event:NetEvent)=>void){a.switchLeft=Math.max(0,a.switchLeft-dt);for(const w of Object.values(a.weapons)){const part=w.tick(dt);if(part&&a.health>0)emit?.({id:0,kind:'reload',actor:a.id,part});}}
export function serialize(a:NetActor):ActorWire {const s=a.stance;return {id:a.id,slot:a.slot,name:a.name,team:a.team,bot:a.bot,connected:a.connected,pos:a.pos.toArray(),vel:a.vel.toArray(),yaw:a.yaw,pitch:a.pitch,grounded:a.grounded,health:a.health,dead:a.dead,protection:a.protection,kills:a.kills,deaths:a.deaths,shots:a.shots,hits:a.hits,sinceDamage:a.sinceDamage,active:a.active,weapons:structuredClone(a.weapons),stance:{...s},switchLeft:a.switchLeft,ads:a.ads,sprint:a.sprint,ack:a.ack,generation:a.generation,lastKiller:a.lastKiller};}
export function restore(a:NetActor,w:ActorWire){a.pos.fromArray(w.pos);a.vel.fromArray(w.vel);for(const k of ['yaw','pitch','grounded','health','dead','protection','kills','deaths','shots','hits','sinceDamage','active','switchLeft','ads','sprint','ack','generation','lastKiller'] as const)(a as any)[k]=w[k];Object.assign(a.stance,w.stance);for(const id of ['rifle','pistol','knife'] as const)Object.assign(a.weapons[id],w.weapons[id]);}
export function canSee(a:NetActor,b:NetActor,p:Physics,range=40){eyePosition(a,origin);eyePosition(b,otherEye);direction.copy(otherEye).sub(origin);const distance=direction.length();return distance<range&&p.ray(origin,direction.normalize(),distance)>=distance-.05;}
export function fire(a:NetActor,actors:NetActor[],p:Physics,emit:(e:NetEvent)=>void,random=Math.random){
  if(a.health<=0||a.switchLeft>0||a.stance.changing||a.sprint||!a.weapon.fire())return false;
  endProtection(a);const c=CONFIG.weapons[a.active],knife=a.active==='knife';if(!knife)a.shots++;
  eyePosition(a,origin);direction.set(-Math.sin(a.yaw)*Math.cos(a.pitch),Math.sin(a.pitch),-Math.cos(a.yaw)*Math.cos(a.pitch));
  const spread=(c.spread+(Math.hypot(a.vel.x,a.vel.z)>.5?.009:0))*(1-.76*a.ads)*STANCES[a.stance.kind].spread;
  direction.x+=(random()-.5)*spread*2;direction.y+=(random()-.5)*spread*2;direction.z+=(random()-.5)*spread*2;direction.normalize();
  muzzle.copy(origin).addScaledVector(direction,knife?.1:a.active==='rifle'?.7:.4);muzzle.y-=.15;
  const barrel=muzzle.clone().sub(origin),barrelLength=barrel.length(),blocked=p.ray(origin,barrel.normalize(),barrelLength+.02)<barrelLength;
  let distance=p.ray(origin,direction,c.range),victim:NetActor|undefined,head=false;
  for(const b of actors){if(b===a||b.health<=0)continue;const hit=postureHit(b,origin,direction,distance);if(hit){distance=hit.distance;victim=b;head=hit.head;}}
  end.copy(origin).addScaledVector(direction,distance);const toward=end.clone().sub(muzzle),length=toward.length();toward.normalize();
  if(blocked||p.ray(muzzle,toward,length)<length-.12){victim=undefined;end.copy(muzzle).addScaledVector(toward,blocked?.05:p.ray(muzzle,toward,length));}
  emit({id:0,kind:'shot',actor:a.id,origin:muzzle.toArray(),point:end.toArray(),weapon:a.active,world:!victim&&(blocked||distance<c.range-.02),direction:direction.toArray()});
  if(victim){const before=victim.health,killed=damage(victim,head?c.head:c.damage,a);if(victim.health<before){if(!knife)a.hits++;emit({id:0,kind:'hit',actor:a.id,target:victim.id,point:end.toArray(),direction:direction.toArray(),head,weapon:a.active});if(killed){victim.lastKiller=a.name;victim.weapon.cancelReload();victim.stance.cancel();victim.vel.set(0,0,0);victim.queue=[];victim.input=neutral(victim.ack);victim.input.yaw=victim.yaw;emit({id:0,kind:'kill',actor:a.id,target:victim.id,head});}}}
  return true;
}
export function environment(a:NetActor,p:Physics,dt:number,emit:(e:NetEvent)=>void){if(a.health<=0)return;const clear=p.clearance(a.pos,a.height);if(a.grounded&&clear){a.lastSafe.copy(a.pos);a.invalidTime=0;}else a.invalidTime=a.grounded&&!clear?a.invalidTime+dt:0;
 const b=map.bounds,invalid=a.pos.y<CONFIG.falls.killY||a.invalidTime>CONFIG.falls.penetrationGrace||a.pos.x<b.minX-1||a.pos.x>b.maxX+1||a.pos.z<b.minZ-1||a.pos.z>b.maxZ+1;
 const amount=invalid?100:a.fall.consume();if(amount>0){endProtection(a);if(damage(a,amount)){a.lastKiller='';a.vel.set(0,0,0);a.weapon.cancelReload();a.stance.cancel();emit({id:0,kind:'environment',actor:a.id});}}}
export function chooseSpawn(a:NetActor,actors:NetActor[],p:Physics){let best:Vector3|undefined,score=-Infinity;for(const v of map.spawns[a.team]){const pos=p.spawnPosition(new Vector3().fromArray(v));if(!pos||actors.some(b=>b!==a&&b.health>0&&b.pos.distanceTo(pos)<1.15))continue;let cost=100;for(const b of actors)if(b!==a&&b.health>0&&b.team!==a.team){const d=pos.distanceTo(b.pos);eyePosition(b,origin);direction.copy(pos).y+=1.57;direction.sub(origin).normalize();cost=Math.min(cost,d)-(p.ray(origin,direction,d)>d-.3?12:0);}if(cost>score){best=pos;score=cost;}}return best;}
export {tickLife,NET};
