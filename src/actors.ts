import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { surfaceMaterial,contactMaterial } from './materials';
import { WeaponState, type Team } from './rules';
import { CONFIG, type WeaponId } from './config';
export class Actor {
  pos=new T.Vector3();vel=new T.Vector3();grounded=false;height:number=CONFIG.player.height;crouched=false;sinceDamage=0;switchLeft=0;lastKiller='';route=0;routeIndex=0;retreatUntil=0;lastRetreat=-30;shotTime=-10;health=100;dead=0;protection=0;kills=0;deaths=0;
  weapons={rifle:new WeaponState('rifle'),pistol:new WeaponState('pistol'),knife:new WeaponState('knife')};active:WeaponId='rifle';
  contact=new T.Mesh(new T.PlaneGeometry(.9,.7),contactMaterial());mesh=new T.Group();legs:T.Group[]=[];knees:T.Group[]=[];torso=new T.Group();aimRig=new T.Group();gait=0;visualPos=new T.Vector3();flash:T.Mesh;shield:T.Mesh;target=-1;memory?:T.Vector3;memoryUntil=0;path:T.Vector3[]=[];repath=0;reaction=0;think=0;step=0;state='PATROL';stuck=0;lastPos=new T.Vector3();lastSafe=new T.Vector3();invalidTime=0;yaw=0;shots=0;hits=0;
  constructor(public id:number,public name:string,color:number,scene:T.Scene,public team:Team='blue'){
    const cloth=new T.MeshStandardMaterial({color:team==='blue'?0x526d82:0x9c7651,roughness:.95}),dark=new T.MeshStandardMaterial({color:0x343a36,roughness:.9}),skin=new T.MeshStandardMaterial({color:id%2?0xb38563:0x926a4e,roughness:.8}),trim=new T.MeshStandardMaterial({color,roughness:.82});
    const add=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,parent:T.Object3D=this.mesh,shadow=true)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;parent.add(o);return o;};
    const rounded=(w:number,h:number,d:number)=>new RoundedBoxGeometry(w,h,d,1,.035);
    const limb=(r:number,length:number,m:T.Material,parent:T.Object3D,x:number,y:number,z:number)=>add(new T.CapsuleGeometry(r,length,3,7),m,x,y,z,parent);
    this.torso.position.y=.94;this.mesh.add(this.torso);
    add(rounded(.51,.58,.29),cloth,0,.23,0,this.torso);add(rounded(.43,.4,.085),dark,0,.24,-.18,this.torso);add(rounded(.42,.39,.1),dark,0,.24,.18,this.torso);
    for(const x of [-.14,0,.14])add(rounded(.11,.16,.07),dark,x,.12,-.23,this.torso,false);
    add(rounded(.47,.06,.33),dark,0,-.05,0,this.torso);limb(.07,.045,skin,this.torso,0,.59,0);
    const head=add(new T.SphereGeometry(.155,10,8),skin,0,.75,-.015,this.torso);head.scale.set(.9,1.18,.92);
    const helmet=add(new T.SphereGeometry(.165,10,6,0,Math.PI*2,0,Math.PI*.58),dark,0,.78,0,this.torso);helmet.scale.set(1,1.05,1.05);
    add(rounded(.25,.035,.075),dark,0,.8,-.14,this.torso,false);add(new T.SphereGeometry(.035,6,4),skin,0,.735,-.16,this.torso,false);
    for(const x of [-.065,.065])add(new T.SphereGeometry(.016,5,4),dark,x,.773,-.144,this.torso,false);
    for(const side of [-1,1]){
      const hip=new T.Group();hip.position.set(side*.145,.91,0);this.mesh.add(hip);this.legs.push(hip);limb(.105,.24,cloth,hip,0,-.2,0);
      const knee=new T.Group();knee.position.y=-.43;hip.add(knee);this.knees.push(knee);limb(.085,.23,dark,knee,0,-.17,0);add(rounded(.19,.14,.31),dark,0,-.39,-.065,knee);add(rounded(.145,.16,.065),dark,0,-.015,-.09,knee,false);
    }
    this.aimRig.position.set(0,.42,0);this.torso.add(this.aimRig);
    const segment=(from:T.Vector3,to:T.Vector3,r:number,material:T.Material)=>{const delta=to.clone().sub(from),o=add(new T.CylinderGeometry(r,r*.88,delta.length(),7),material,0,0,0,this.aimRig);o.position.copy(from).addScaledVector(delta,.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());};
    for(const side of [-1,1]){const shoulder=new T.Vector3(side*.28,0,0),elbow=new T.Vector3(side*.33,-.23,-.08),hand=new T.Vector3(side===1?.14:.02,-.13,side===1?-.28:-.58);segment(shoulder,elbow,.085,cloth);segment(elbow,hand,.065,cloth);add(rounded(.1,.1,.12),dark,hand.x,hand.y,hand.z,this.aimRig);add(rounded(.18,.105,.19),trim,shoulder.x,shoulder.y-.06,shoulder.z,this.aimRig,false);}
    add(rounded(.09,.12,.45),dark,.13,-.08,-.42,this.aimRig);const barrel=add(new T.CylinderGeometry(.018,.018,.43,8),dark,.13,-.06,-.83,this.aimRig,false);barrel.rotation.x=Math.PI/2;
    add(rounded(.09,.1,.23),surfaceMaterial('timber',0x84674a,false),.13,-.09,-.62,this.aimRig,false);const magazine=add(rounded(.07,.25,.12),dark,.13,-.24,-.4,this.aimRig,false);magazine.rotation.x=.25;add(rounded(.08,.12,.22),dark,.13,-.08,-.1,this.aimRig,false);
    this.flash=add(new T.ConeGeometry(.1,.26,5),new T.MeshBasicMaterial({color:0xffda85}),.13,-.06,-1.08,this.aimRig,false);this.flash.rotation.x=-Math.PI/2;this.flash.visible=false;
    this.shield=add(new T.CylinderGeometry(.6,.6,1.9,12,1,true),new T.MeshBasicMaterial({color:0x78cfff,wireframe:true,transparent:true,opacity:.18}),0,.95,0,this.mesh,false);this.shield.visible=false;
    scene.add(this.mesh,this.contact);this.contact.rotation.x=-Math.PI/2;this.mesh.visible=id!==0;
  }

  get weapon(){return this.weapons[this.active];}
  reset(pos:T.Vector3){this.pos.copy(pos);this.vel.set(0,0,0);this.grounded=false;this.health=CONFIG.maxHealth;this.sinceDamage=0;this.switchLeft=0;this.crouched=false;this.height=CONFIG.player.height;this.lastKiller='';this.routeIndex=0;this.retreatUntil=0;this.lastRetreat=-30;this.shotTime=-10;this.dead=0;this.protection=CONFIG.protectionSeconds;this.active='rifle';this.weapons={rifle:new WeaponState('rifle'),pistol:new WeaponState('pistol'),knife:new WeaponState('knife')};this.state='PATROL';this.think=0;this.path=[];this.target=-1;this.memory=undefined;this.memoryUntil=0;this.reaction=.7;this.repath=0;this.stuck=0;this.lastPos.copy(pos);this.lastSafe.copy(pos);this.invalidTime=0;this.visualPos.copy(pos);this.gait=0;this.step=0;this.flash.visible=false;this.mesh.position.copy(pos);}
  animate(t:number,moving:boolean){
    const distance=this.pos.distanceTo(this.visualPos);if(distance<1&&moving)this.gait+=distance*7;this.visualPos.copy(this.pos);
    this.contact.position.copy(this.pos).y+=.023;this.contact.visible=this.id!==0&&this.health>0&&this.grounded;this.mesh.position.copy(this.pos);this.mesh.rotation.set(0,this.yaw,0);const deadAge=CONFIG.respawnSeconds-this.dead;
    this.mesh.visible=this.id!==0&&(this.health>0||deadAge<.7);this.shield.visible=this.protection>0&&this.health>0;
    const gait=moving?Math.sin(this.gait):0;
    for(let i=0;i<this.legs.length;i++){const phase=i? -gait:gait;this.legs[i].rotation.x=phase*.52;this.knees[i].rotation.x=Math.max(0,-phase)*.8;}
    this.torso.position.y=.94+(moving?Math.abs(Math.cos(this.gait))*.018:Math.sin(t*2+this.id)*.004);this.torso.rotation.z=moving?gait*.025:0;
    this.aimRig.rotation.x=(this.memory?Math.atan2(this.pos.y-this.memory.y,Math.max(1,this.pos.distanceTo(this.memory))):0)-Math.max(0,1-(t-this.shotTime)/.12)*.08;
    if(this.weapon.reloadLeft>0)this.aimRig.rotation.z=-Math.sin(this.weapon.progress*Math.PI)*.18;else this.aimRig.rotation.z=0;
    if(this.health<=0){const fall=Math.min(1,Math.max(0,deadAge)/.5);this.mesh.rotation.z=fall*(this.id%2?1.2:-1.2);this.torso.position.y-=fall*.12;this.flash.visible=false;}
  }

}
export function createViewWeapon(id:WeaponId){
  const root=new T.Group(),metal=surfaceMaterial('metal',0x414749,false),wood=surfaceMaterial('timber',0x976b45,false),black=new T.MeshStandardMaterial({color:0x242a28,roughness:.82}),skin=new T.MeshStandardMaterial({color:0xae7958,roughness:.72}),sight=new T.MeshBasicMaterial({color:0xc8d9a4});
  metal.roughness=.55;metal.metalness=.75;
  const part=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material=metal,parent:T.Object3D=root)=>{const mesh=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.12),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  const tube=(x:number,y:number,z:number,r:number,length:number,m:T.Material=metal,parent:T.Object3D=root)=>{const mesh=new T.Mesh(new T.CylinderGeometry(r,r,length,10),m);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  const profile=(points:number[][],width:number,m:T.Material,parent:T.Object3D=root)=>{const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.004,bevelThickness:.004});geo.translate(0,0,-width/2);geo.rotateY(Math.PI/2);const mesh=new T.Mesh(geo,m);parent.add(mesh);return mesh;};
  const mag=new T.Group(),bolt=new T.Group();root.add(mag,bolt);mag.name='magazine';bolt.name='bolt';
  if(id==='rifle'){
    profile([[-.26,.065],[.22,.065],[.25,-.065],[-.22,-.08]],.105,metal);
    part(0,.08,-.015,.09,.045,.4);tube(0,.075,-.055,.045,.35);
    profile([[.22,.025],[.5,-.065],[.53,-.21],[.34,-.18],[.23,-.065]],.1,wood);part(0,-.14,.525,.115,.155,.025,black);
    part(0,-.008,-.36,.105,.105,.25,wood);for(let i=0;i<5;i++)part(0,-.014,-.45+i*.045,.113,.012,.012,black);
    tube(0,.007,-.63,.022,.38);tube(0,.063,-.4,.018,.3);tube(0,.007,-.845,.03,.07);part(0,.035,-.56,.06,.08,.065);
    profile([[.09,-.07],[.16,-.08],[.2,-.28],[.11,-.27]],.065,black);
    const guard=new T.Mesh(new T.TorusGeometry(.056,.006,5,12,Math.PI*1.6),metal);guard.position.set(0,-.12,.03);guard.rotation.y=Math.PI/2;root.add(guard);
    mag.position.set(0,-.115,-.105);profile([[-.065,.02],[.065,.02],[.095,-.13],[.16,-.29],[.055,-.32],[-.025,-.18]],.074,metal,mag);
    for(const x of [-.041,.041])for(let i=0;i<3;i++)part(x,-.13,.018+i*.027,.005,.16,.007,black,mag);
    bolt.position.set(.065,.025,.09);tube(0,0,0,.012,.075,metal,bolt).rotation.z=Math.PI/2;
    part(0,.123,.13,.09,.014,.06);for(const x of [-.032,.032])part(x,.15,.13,.018,.04,.035);part(0,.145,-.75,.009,.045,.014,sight);part(0,.1,-.75,.065,.045,.03);
    for(const z of [-.17,.05,.18])for(const x of [-.055,.055]){const pin=tube(x,0,z,.008,.006);pin.rotation.z=Math.PI/2;}
  }else if(id==='pistol'){
    part(0,0,-.05,.105,.13,.34,metal,bolt);tube(0,-.003,-.228,.025,.028);part(0,-.083,-.03,.1,.04,.29,black);
    profile([[.01,-.08],[.12,-.07],[.16,-.3],[.04,-.31]],.09,black);
    mag.position.set(0,-.29,.09);part(0,0,0,.1,.03,.14,black,mag);part(0,.06,0,.07,.17,.1,metal,mag);
    for(let i=0;i<7;i++)for(const x of [-.056,.056])part(x,.015,.065+i*.01,.006,.09,.004,black,bolt);
    for(const x of [-.037,.037])part(x,.11,.1,.018,.04,.028,metal,bolt);part(0,.11,-.2,.012,.04,.02,sight,bolt);
    const guard=new T.Mesh(new T.TorusGeometry(.046,.007,5,12),black);guard.rotation.y=Math.PI/2;guard.position.set(0,-.13,-.055);root.add(guard);
  }else{mag.visible=false;part(0,-.13,.12,.07,.085,.26,black);for(let i=0;i<7;i++)part(0,-.13,.02+i*.03,.078,.092,.009,metal);part(0,-.13,-.04,.19,.025,.04);profile([[-.06,-.115],[-.4,-.115],[-.55,-.15],[-.4,-.18],[-.06,-.17]],.018,new T.MeshStandardMaterial({color:0xb5c0bd,metalness:.85,roughness:.3}));}
  const hand=(x:number,y:number,z:number)=>{const g=new T.Group();g.position.set(x,y,z);root.add(g);part(0,0,0,.105,.085,.14,black,g);const thumb=part(-.056,.018,-.015,.042,.045,.09,skin,g);thumb.rotation.y=-.35;for(let i=0;i<4;i++){const finger=part(-.038+i*.025,-.043,-.04,.022,.04,.07,skin,g);finger.rotation.x=-.3;}part(0,0,.085,.11,.09,.07,black,g);return g;};
  hand(.015,-.17,.14);const support=hand(-.065,id==='rifle'?-.075:-.2,id==='rifle'?-.37:.07);
  const arm=new T.Mesh(new T.CylinderGeometry(.052,.072,1,10),black);root.add(arm);
  const right=new T.Mesh(new T.CylinderGeometry(.055,.085,.46,10),black);right.position.set(.105,-.33,.36);right.rotation.x=-.75;right.rotation.z=.2;root.add(right);part(.14,-.46,.51,.17,.16,.22,black).rotation.x=-.7;
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
  root.position.set(T.MathUtils.lerp(.27,0,ads)+bob*(1-ads)-inspection*.12,T.MathUtils.lerp(-.29,(id==='rifle'?-.1675:-.13)*.82,ads)+inspection*.13-lower-switchDip+idle,-.9+ads*.14-inspection*.18+(id==='knife'?0:shot*.045));
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
