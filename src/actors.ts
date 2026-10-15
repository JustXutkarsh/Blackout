import * as T from 'three';
import { WeaponState, type Team } from './rules';
import { CONFIG, type WeaponId } from './config';
export class Actor {
  pos=new T.Vector3();vel=new T.Vector3();grounded=false;height:number=CONFIG.player.height;crouched=false;sinceDamage=0;switchLeft=0;lastKiller='';route=0;routeIndex=0;retreatUntil=0;lastRetreat=-30;shotTime=-10;health=100;dead=0;protection=0;kills=0;deaths=0;
  weapons={rifle:new WeaponState('rifle'),pistol:new WeaponState('pistol'),knife:new WeaponState('knife')};active:WeaponId='rifle';
  mesh=new T.Group();legs:T.Mesh[]=[];flash:T.Mesh;shield:T.Mesh;target=-1;memory?:T.Vector3;memoryUntil=0;path:T.Vector3[]=[];repath=0;reaction=0;think=0;step=0;state='PATROL';stuck=0;lastPos=new T.Vector3();yaw=0;shots=0;hits=0;
  constructor(public id:number,public name:string,color:number,scene:T.Scene,public team:Team='blue'){
    const cloth=new T.MeshStandardMaterial({color,roughness:.7}),dark=new T.MeshStandardMaterial({color:0x192a39}),skin=new T.MeshStandardMaterial({color:0xb8b2a6});
    const add=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;this.mesh.add(o);return o;};
    add(new T.BoxGeometry(.63,.66,.35),cloth,0,1.05,0);add(new T.BoxGeometry(.5,.42,.13),dark,0,1.13,-.22);
    add(new T.BoxGeometry(.38,.38,.36),skin,0,1.59,0);add(new T.BoxGeometry(.43,.17,.41),dark,0,1.78,0);
    add(new T.BoxGeometry(.4,.1,.04),new T.MeshBasicMaterial({color:0xffd77d}),0,1.63,-.19);
    for(const side of [-1,1]){this.legs.push(add(new T.BoxGeometry(.23,.65,.27),dark,side*.19,.37,0));add(new T.BoxGeometry(.18,.52,.22),cloth,side*.42,1.01,-.06);}
    add(new T.BoxGeometry(.15,.17,.75),dark,.22,1.23,-.46);
    this.flash=add(new T.ConeGeometry(.15,.4,5),new T.MeshBasicMaterial({color:0xffda85}),.22,1.23,-.96);this.flash.rotation.x=-Math.PI/2;this.flash.visible=false;
    this.shield=add(new T.CylinderGeometry(.65,.65,2,12,1,true),new T.MeshBasicMaterial({color:0x78e5ff,wireframe:true,transparent:true,opacity:.28}),0,1,0);this.shield.visible=false;
    scene.add(this.mesh);this.mesh.visible=id!==0;
  }
  get weapon(){return this.weapons[this.active];}
  reset(pos:T.Vector3){this.pos.copy(pos);this.vel.set(0,0,0);this.grounded=false;this.health=CONFIG.maxHealth;this.sinceDamage=0;this.switchLeft=0;this.crouched=false;this.height=CONFIG.player.height;this.lastKiller='';this.routeIndex=0;this.retreatUntil=0;this.lastRetreat=-30;this.shotTime=-10;this.dead=0;this.protection=CONFIG.protectionSeconds;this.active='rifle';this.weapons={rifle:new WeaponState('rifle'),pistol:new WeaponState('pistol'),knife:new WeaponState('knife')};this.state='PATROL';this.think=0;this.path=[];this.target=-1;this.memory=undefined;this.memoryUntil=0;this.reaction=.7;this.repath=0;this.stuck=0;this.lastPos.copy(pos);this.step=0;this.flash.visible=false;this.mesh.position.copy(pos);}
  animate(t:number,moving:boolean){this.mesh.position.copy(this.pos);this.mesh.rotation.y=this.yaw;this.mesh.visible=this.id!==0&&this.health>0;this.shield.visible=this.protection>0;for(let i=0;i<this.legs.length;i++)this.legs[i].rotation.x=moving?Math.sin(t*9+i*Math.PI)*.45:0;}
}
export function createViewWeapon(id:WeaponId){
  const root=new T.Group();const metal=new T.MeshStandardMaterial({color:0x3d494c,roughness:.4,metalness:.65}),wood=new T.MeshStandardMaterial({color:0x956c49,roughness:.6}),black=new T.MeshStandardMaterial({color:0x253b48}),skin=new T.MeshStandardMaterial({color:0xb88d65}),sight=new T.MeshBasicMaterial({color:0xe0dca1});
  const part=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material=metal,parent:T.Object3D=root)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  const mag=new T.Group(),bolt=new T.Group();root.add(mag,bolt);mag.name='magazine';bolt.name='bolt';
  if(id==='rifle'){
    part(0,0,0,.12,.17,.5);part(0,-.01,-.4,.1,.12,.3,wood);part(0,.02,-.67,.045,.045,.28);part(0,-.04,.32,.13,.18,.22,wood);part(0,-.18,.1,.08,.24,.1,black).rotation.x=-.2;
    mag.position.set(0,-.24,-.08);part(0,0,0,.09,.3,.16,metal,mag).rotation.x=.15;
    bolt.position.set(.08,.015,.09);part(0,0,0,.08,.04,.07,metal,bolt);
    for(const x of [-.032,.032])part(x,.15,.13,.018,.04,.035);part(0,.145,-.75,.018,.045,.018,sight);part(0,.1,-.75,.07,.04,.035);
  }else if(id==='pistol'){
    bolt.position.set(0,0,0);part(0,0,-.05,.13,.15,.36,metal,bolt);part(0,-.17,.055,.11,.26,.14,black).rotation.x=-.2;
    mag.position.set(0,-.27,.06);part(0,0,0,.09,.15,.12,black,mag);
    for(const x of [-.043,.043])part(x,.11,.1,.018,.04,.028,metal,bolt);part(0,.11,-.21,.018,.04,.02,sight,bolt);
  }else{mag.visible=false;part(0,-.13,.12,.09,.11,.3,wood);part(0,-.13,-.08,.21,.04,.06);part(0,-.13,-.31,.07,.025,.45,new T.MeshStandardMaterial({color:0xc3d0cc,metalness:.8,roughness:.25}));}
  const hand=(x:number,y:number,z:number)=>{const g=new T.Group();g.position.set(x,y,z);root.add(g);part(0,0,0,.12,.12,.16,black,g);part(-.07,.015,-.01,.055,.06,.09,skin,g);for(let i=0;i<4;i++)part(-.045+i*.03,-.055,-.07,.023,.06,.055,black,g);return g;};
  hand(.015,-.15,.10);const support=hand(-.075,id==='rifle'?-.07:-.18,id==='rifle'?-.37:.015);
  const arm=part(0,0,0,.12,1,.13,black);part(.055,-.30,.30,.15,.16,.35,black).rotation.x=-.35;part(.055,-.22,.20,.12,.14,.14,skin);
  root.userData={mag,bolt,support,arm,magRest:mag.position.clone(),handRest:support.position.clone(),id};root.scale.setScalar(.82);root.position.set(.28,-.25,-.7);return root;
}
const handOffset=new T.Vector3(-.075,-.035,.04);
const armFrom=new T.Vector3(-.23,-.48,.4),armDelta=new T.Vector3(),armUp=new T.Vector3(0,1,0);
export function animateView(root:T.Group,w:WeaponState,pose:{ads:number;sprint:boolean;switchLeft:number;shotAge:number;bob:number;time:number;reduced:boolean}){
  const {mag,bolt,support,arm,magRest,handRest,id}=root.userData as {mag:T.Group;bolt:T.Group;support:T.Group;arm:T.Mesh;magRest:T.Vector3;handRest:T.Vector3;id:WeaponId};
  const removal=CONFIG.reloadEvents.remove,insertion=CONFIG.reloadEvents.insert,boltAt=CONFIG.reloadEvents.bolt,extracted=removal+(insertion-removal)*.42,swap=removal+(insertion-removal)*.62;const p=w.progress,reloading=w.reloadLeft>0,lower=pose.sprint?.23:0,switchDip=Math.sin(Math.min(1,pose.switchLeft/CONFIG.view.switchSeconds)*Math.PI/2)*.3;
  const inspection=reloading?Math.sin(p*Math.PI):0;
  const bob=pose.reduced?0:Math.sin(pose.bob)*.009,idle=pose.reduced?0:Math.sin(pose.time*1.8)*.002;
  const shot=Math.max(0,1-pose.shotAge/(id==='knife'?.25:.1));const ads=pose.ads;
  root.position.set(T.MathUtils.lerp(.28,0,ads)+bob*(1-ads)-inspection*.12,T.MathUtils.lerp(-.25,(id==='rifle'?-.1675:-.13)*.82,ads)+inspection*.13-lower-switchDip+idle,-.7+ads*.14-inspection*.23+(id==='knife'?0:shot*.045));
  root.rotation.set(-inspection*.18-lower*.8,inspection*.55,inspection*.22+(id==='knife'?Math.sin(shot*Math.PI)*(pose.reduced?.15:.85):0));
  mag.position.copy(magRest);support.position.copy(handRest);bolt.position.z=id==='rifle'?.09:0;
  if(reloading){
    const reach=p<removal?p/removal:p>insertion+.04?Math.max(0,(1-p)/(1-insertion-.04)):1;
    const extraction=p<removal?0:p<extracted?(p-removal)/(extracted-removal):p<swap?1:p<insertion?1-(p-swap)/(insertion-swap):0;
    mag.position.y-=extraction*(id==='pistol'?.18:.24);mag.position.z+=extraction*.13;mag.visible=!(p>extracted&&p<swap);
    support.position.lerp(armDelta.copy(mag.position).add(handOffset),reach);
    if(w.reloadEmpty&&p>boltAt)bolt.position.z+=(Math.sin((p-boltAt)/(1-boltAt)*Math.PI))*.065;
  }else mag.visible=id!=='knife';
  if(id==='knife')support.position.copy(handRest).addScaledVector(armUp,-.2);
  armDelta.copy(support.position).sub(armFrom);arm.position.copy(armFrom).addScaledVector(armDelta,.5);arm.scale.y=armDelta.length();arm.quaternion.setFromUnitVectors(armUp,armDelta.normalize());
}
