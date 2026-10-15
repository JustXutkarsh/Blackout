import * as T from 'three';
import { WeaponState } from './rules';
import { CONFIG, type WeaponId } from './config';
export class Actor {
  pos=new T.Vector3();vel=new T.Vector3();grounded=false;health=100;dead=0;protection=0;kills=0;deaths=0;
  weapons={rifle:new WeaponState('rifle'),pistol:new WeaponState('pistol'),knife:new WeaponState('knife')};active:WeaponId='rifle';
  mesh=new T.Group();legs:T.Mesh[]=[];flash:T.Mesh;shield:T.Mesh;target=-1;memory?:T.Vector3;memoryUntil=0;path:T.Vector3[]=[];repath=0;reaction=0;think=0;step=0;state='PATROL';stuck=0;lastPos=new T.Vector3();yaw=0;shots=0;hits=0;
  constructor(public id:number,public name:string,color:number,scene:T.Scene){
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
  reset(pos:T.Vector3){this.pos.copy(pos);this.vel.set(0,0,0);this.grounded=false;this.health=100;this.dead=0;this.protection=CONFIG.protectionSeconds;this.active='rifle';this.weapons={rifle:new WeaponState('rifle'),pistol:new WeaponState('pistol'),knife:new WeaponState('knife')};this.state='PATROL';this.think=0;this.path=[];this.target=-1;this.memory=undefined;this.memoryUntil=0;this.reaction=.7;this.repath=0;this.stuck=0;this.lastPos.copy(pos);this.step=0;this.flash.visible=false;this.mesh.position.copy(pos);}
  animate(t:number,moving:boolean){this.mesh.position.copy(this.pos);this.mesh.rotation.y=this.yaw;this.mesh.visible=this.id!==0&&this.health>0;this.shield.visible=this.protection>0;for(let i=0;i<this.legs.length;i++)this.legs[i].rotation.x=moving?Math.sin(t*9+i*Math.PI)*.45:0;}
}
export function createViewWeapon(id:WeaponId){const root=new T.Group();const metal=new T.MeshStandardMaterial({color:0x27313a,roughness:.35,metalness:.7}),wood=new T.MeshStandardMaterial({color:0x89513e,roughness:.55}),black=new T.MeshStandardMaterial({color:0x121d27}),glow=new T.MeshBasicMaterial({color:0x75dce0});
  const part=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material=metal)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  if(id==='rifle'){part(0,0,0,.12,.17,.55);part(0,-.01,-.42,.1,.12,.3,wood);part(0,.02,-.69,.055,.055,.3);part(0,-.04,.36,.13,.18,.25,wood);const grip=part(0,-.18,.1,.08,.24,.1,black);grip.rotation.x=-.25;const mag=part(0,-.24,-.08,.09,.3,.16);mag.rotation.x=.24;part(0,.13,-.35,.035,.09,.035);part(0,.07,-.76,.06,.11,.03);part(.066,.012,-.12,.01,.035,.07,glow);}
  else if(id==='pistol'){part(0,0,-.05,.13,.15,.36);const grip=part(0,-.17,.055,.11,.26,.14,black);grip.rotation.x=-.2;part(0,.085,-.18,.03,.04,.03,glow);part(0,-.07,-.13,.08,.04,.1);}
  else{part(0,-.13,.12,.09,.11,.3,wood);part(0,-.13,-.08,.21,.04,.06);const blade=part(0,-.13,-.31,.07,.025,.45,new T.MeshStandardMaterial({color:0xaac5cb,metalness:.9,roughness:.2}));blade.rotation.z=.16;}
  // Forearm and gloved hand keep the procedural weapon grounded in first person.
  part(.01,-.22,.28,.15,.15,.35,new T.MeshStandardMaterial({color:0x405968}));part(0,-.13,.16,.16,.15,.17,black);
  root.position.set(.28,-.24,-.58);return root;
}
