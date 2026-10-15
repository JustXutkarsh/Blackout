import * as T from 'three';
import { Physics, Navigation, type Ramp } from './physics';
export type Pickup = { mesh:T.Group; pos:T.Vector3; kind:'health'|'ammo'; cooldown:number };
export class World {
  physics=new Physics(); nav!:Navigation; neon:T.MeshStandardMaterial[]=[]; signs:T.MeshBasicMaterial[]=[]; pickups:Pickup[]=[];
  ambient=new T.HemisphereLight(0x8dbbdf,0x182032,1.5); moon=new T.DirectionalLight(0x98bcff,2.1);
  powerLights:T.PointLight[]=[]; rain:T.LineSegments; rainPositions:Float32Array;
  spawnPoints=[new T.Vector3(-17,6,-18),new T.Vector3(18,6,-18),new T.Vector3(-8,6,-3),new T.Vector3(18,6,19),new T.Vector3(-12,0,20),new T.Vector3(20,0,14),new T.Vector3(18,3,21),new T.Vector3(0,0,-18)];
  private mats=new Map<string,T.MeshStandardMaterial>(); private cube=new T.BoxGeometry(1,1,1);
  constructor(public scene:T.Scene) {
    scene.background=new T.Color(0x0a1425);scene.fog=new T.FogExp2(0x0c182b,.009);
    scene.add(this.ambient,this.moon);this.moon.position.set(-30,55,-15);
    this.moon.castShadow=true;this.moon.shadow.mapSize.set(1024,1024);Object.assign(this.moon.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:120});this.moon.shadow.bias=-.001;
    this.build();this.batchBoxes();
    this.nav=new Navigation(this.physics);
    this.rainPositions=new Float32Array(360*6);
    let seed=428;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<360;i++){const n=i*6,x=random()*90-45,y=random()*28,z=random()*90-45;this.rainPositions.set([x,y,z,x-.08,y+.65,z],n);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(this.rainPositions,3));this.rain=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x81acbf,transparent:true,opacity:.18,depthWrite:false}));this.rain.frustumCulled=false;scene.add(this.rain);
  }
  private batchBoxes(){
    const groups=new Map<string,T.Mesh[]>();
    for(const o of [...this.scene.children])if(o instanceof T.Mesh&&o.geometry===this.cube){const key=`${o.material.uuid}:${o.castShadow}`;groups.set(key,[...(groups.get(key)||[]),o]);}
    for(const objects of groups.values()){const batch=new T.InstancedMesh(this.cube,objects[0].material,objects.length);batch.castShadow=objects[0].castShadow;batch.receiveShadow=true;objects.forEach((o,i)=>{o.updateMatrix();batch.setMatrixAt(i,o.matrix);this.scene.remove(o);});batch.computeBoundingSphere();this.scene.add(batch);}
  }
  mat(color:number,emissive=0) {const key=`${color},${emissive}`;if(!this.mats.has(key))this.mats.set(key,new T.MeshStandardMaterial({color,roughness:.45,metalness:.28,emissive,emissiveIntensity:emissive?1.6:0}));return this.mats.get(key)!;}
  box(x:number,y:number,z:number,w:number,h:number,d:number,color=0x26364a,solid=true,emissive=0) {const m=new T.Mesh(this.cube,this.mat(color,emissive));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=solid;m.receiveShadow=true;this.scene.add(m);if(solid)this.physics.addBox(x,y,z,w,h,d);return m;}
  floor(x:number,z:number,w:number,d:number,y:number,color=0x263747) {this.box(x,y-.18,z,w,.36,d,color);this.physics.surfaces.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2,y});}
  neonBox(x:number,y:number,z:number,w:number,h:number,d:number,color:number) {const mat=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2.8,roughness:.4});this.neon.push(mat);const m=new T.Mesh(this.cube,mat);m.position.set(x,y,z);m.scale.set(w,h,d);this.scene.add(m);return m;}
  sign(text:string,x:number,y:number,z:number,w:number,h:number,color:string,rotation=0) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d')!;c.fillStyle='#09121f';c.fillRect(0,0,1024,256);c.strokeStyle=color;c.lineWidth=7;c.strokeRect(14,14,996,228);c.fillStyle=color;c.shadowColor=color;c.shadowBlur=14;c.font='900 105px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(text,512,132,940);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const mat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});this.signs.push(mat);const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;this.scene.add(mesh);
  }
  light(x:number,y:number,z:number,color:number,power=35,range=11,emergency=false) {const l=new T.PointLight(color,power,range,2);l.position.set(x,y,z);this.scene.add(l);if(!emergency)this.powerLights.push(l);this.box(x,y,z,.22,.16,.28,color,false,color);return l;}
  ramp(r:Ramp) {this.physics.ramps.push(r);const y1=this.physics.rampY(r,r.z1),y2=this.physics.rampY(r,r.z2),b=r.low-.2;const vertices=new Float32Array([r.x1,y1,r.z1,r.x2,y1,r.z1,r.x2,y2,r.z2,r.x1,y2,r.z2,r.x1,b,r.z1,r.x2,b,r.z1,r.x2,b,r.z2,r.x1,b,r.z2]);const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(vertices,3));g.setIndex([0,3,2,0,2,1,4,0,1,4,1,5,5,1,2,5,2,6,6,2,3,6,3,7,7,3,0,7,0,4]);g.computeVertexNormals();const m=new T.Mesh(g,this.mat(0x344457));m.receiveShadow=true;this.scene.add(m);
    for(let z=r.z1+.4;z<r.z2;z+=1.5){const y=this.physics.rampY(r,z);this.neonBox(r.x1+.08,y+.02,z,.09,.035,.32,0x27a2ad);this.neonBox(r.x2-.08,y+.02,z,.09,.035,.32,0x27a2ad);}
  }
  railing(x:number,z:number,w:number,d:number,y=6) {this.box(x,y+.42,z,w,.84,d,0x31435a);this.neonBox(x,y+.85,z,w,.035,d+.012,0x185a72);}
  tank(x:number,z:number) {this.box(x,6.65,z,2.7,1.3,2.7,0x1a2332);const tank=new T.Mesh(new T.CylinderGeometry(1.1,1.1,2.1,12),this.mat(0x55717e));tank.position.set(x,8.28,z);tank.castShadow=true;this.scene.add(tank);this.physics.addBox(x,8.28,z,2.2,2.1,2.2);const lid=new T.Mesh(new T.ConeGeometry(1.18,.5,12),this.mat(0x303f51));lid.position.set(x,9.58,z);this.scene.add(lid);this.box(x,8.2,z,2.23,.08,2.23,0x192637,false);}
  ac(x:number,z:number,y=6,w=2.4) {this.box(x,y+.65,z,w,1.3,1.6,0x526473);for(let i=0;i<5;i++)this.box(x,y+.3+i*.16,z+.81,w-.3,.035,.015,0x182533,false);this.box(x+.3,y+1.34,z,.8,.06,.8,0x1c2b3c,false);}
  pickup(x:number,y:number,z:number,kind:'health'|'ammo') {const group=new T.Group(),color=kind==='health'?0x7cf1b1:0xf4ca68;const m=new T.Mesh(new T.BoxGeometry(.55,.5,.55),this.mat(0x29413e,color));group.add(m);const cross=new T.Mesh(new T.BoxGeometry(.35,.09,.58),this.mat(color,color));group.add(cross);if(kind==='health'){const v=cross.clone();v.rotation.z=Math.PI/2;group.add(v);}group.position.set(x,y+.65,z);this.scene.add(group);this.pickups.push({mesh:group,pos:new T.Vector3(x,y,z),kind,cooldown:0});}
  private build() {
    this.floor(0,0,60,54,0,0x14212d);
    // Apartment blocks, with two bridges linking both rooftop lanes.
    this.box(-15,2.85,-10,24,5.7,24,0x1b2a3e);this.floor(-15,-10,24,24,6);
    this.box(15,2.85,-10,24,5.7,24,0x202c42);this.floor(15,-10,24,24,6);
    this.floor(0,-12,6,4,6,0x3c5262);
    this.floor(-2,-20,2,2,6);this.floor(2,-20,2,2,6);
    this.neonBox(-1.05,6.02,-20,.08,.04,2,0xdce88a);this.neonBox(1.05,6.02,-20,.08,.04,2,0xdce88a);
    this.sign('2m / JUMP',0,7.3,-25.9,4,.65,'#dce88a');this.floor(0,.5,6,3,6,0x3c5262);
    for(const x of [-15,15]){this.railing(x,-22,24,.22);this.railing(x,2,12,.22);}
    for(const x of [-27,27])this.railing(x,-10,.22,24);
    // Inner parapets leave bridge openings. South-west ramp leaves an open landing.
    for(const x of [-3,3]){this.railing(x,-16,.2,4);this.railing(x,-5,.2,10);}
    for(const z of [-14.1,-9.9])this.railing(0,z,6,.13);
    this.railing(-18,2,9,.22);this.railing(-7,2,7,.22);this.railing(9,2,12,.22);this.railing(24,2,6,.22);
    this.ramp({x1:-25,x2:-21,z1:2,z2:20,low:0,high:6});
    this.floor(18.5,5,5,6,6);for(const x of [16,21])this.railing(x,5,.14,6);
    // Roof equipment creates alternate loops instead of a single firing lane.
    this.tank(-18,-15);this.tank(20,-16);this.ac(-12,-7);this.ac(12,-7);this.ac(22,-4);this.ac(-23,-4);
    this.box(-9,7.1,-17,4,2.2,3,0x33435a);this.box(9,7.1,-17,3,2.2,3,0x33435a);
    this.box(-15,6.45,-4,5,.9,1,0x42546a);this.box(16,6.45,-12,4,.9,1,0x42546a);
    this.box(-22,7.4,-10,.12,2.8,.12,0x597183);this.box(-22,8.2,-10,2,.06,.06,0x748e9d,false);
    this.box(8,8,-20,.12,4,.12,0x5a6a7d);for(let y=8;y<10;y+=.6)this.box(8,y,-20,1.7,.04,.07,0x7190a0,false);
    this.sign('SKYLINE',-15,9.3,-21.75,8,1.6,'#76eaff');this.sign('APT. 08',15,8.7,-21.75,6,1.2,'#fa86c9');
    this.neonBox(-26.8,6.1,-10,.08,.12,22,0x3ad5dc);this.neonBox(26.8,6.1,-10,.08,.12,22,0xd74fa5);
    this.light(-15,9,-7,0x47b8dc,75,14);this.light(17,9,-7,0xbc4fbc,65,14);
    // Hotel: lobby, open combat floor, two separate ramp routes, and balcony.
    this.floor(20,16,12,16,3,0x3a3546);this.floor(10.5,21,7,6,3,0x3a3546);this.floor(12,11,4,6,3,0x3a3546);this.floor(10.5,13,1,10,3,0x3a3546);this.floor(8.5,7,3,2,3,0x3a3546);
    this.floor(8.5,13,3,10,6);this.floor(20,16,12,16,6);this.floor(10.5,21,7,6,6);this.floor(13.5,7,5,2,6);
    this.ramp({x1:7,x2:10,z1:8,z2:18,low:0,high:3});
    this.ramp({x1:11,x2:14,z1:8,z2:18,low:3,high:6});
    // Opening under lower ramp connects lobby to the market; large openings stay human-scale.
    this.box(26,3,16,.35,6,16,0x323044);this.box(16.5,3,24,19,6,.35,0x323044);
    this.box(7,1.4,22,.3,2.8,4,0x323044);this.box(7,4.4,22,.3,2.8,4,0x323044);
    this.box(20,1.35,8,4,2.7,.3,0x323044);this.box(25,4.35,8,2,2.7,.3,0x323044);
    this.box(17,1.3,19,4,2.6,1,0x453b4a);this.box(22,3.5,19,3,1,1,0x54465b);
    this.box(21,0.65,12,3,1.3,1,0x493f50);this.box(23,3.65,12,2,1.3,1,0x493f50);
    this.ac(22,20,6);this.railing(26,16,.2,16);this.railing(16.5,24,19,.2);this.railing(7,21,.2,6);
    this.floor(4.5,21,5,4,3,0x45526b);this.railing(2,21,.15,4,3);this.railing(4.5,23,5,.15,3);
    this.sign('NO VACANCY',25.78,4.6,17,7,1.2,'#ff658f',-Math.PI/2);this.sign('HOTEL / 09',19,8.3,23.8,7,1.6,'#ff7797');
    this.light(19,2.6,16,0xb5647f,40,10);this.light(19,5.7,19,0x9f78b5,35,10);this.light(15,6.5,23,0xff395a,25,9,true);
    // Night market, readable central streets and short stall alleys.
    for(const [x,z,color] of [[-16,11,0x77354f],[-8,11,0x24566a],[-16,21,0x46574b],[-7,21,0x6c4f40]]){this.box(x,1.15,z,3.4,2.3,2.2,0x263544);this.box(x,2.4,z,4,.2,2.8,color);for(let i=0;i<6;i++)this.box(x-1.4+i*.56,1.25,z+1.12,.025,1.9,.03,0x526170,false);}
    this.sign('夜市  NIGHT MARKET',-12,4,24,14,1.8,'#68f3cd');this.light(-12,4,17,0x4ac1a3,65,14);
    this.box(-12,.55,16,1.2,1.1,1.2,0x685344);this.box(-5,.55,7,1.1,1.1,1.3,0x695547);this.box(-17,.6,6,1.5,1.2,1.1,0x675c49);
    for(const x of [-19,-4]){this.box(x,.45,14,.65,.9,1.5,0x456d71);this.box(x,.95,14.3,.65,.15,.65,0x1a2534);this.box(x,1.4,13.7,.8,.08,.1,0x82919b);}
    // Service passage runs below the central rooftop bridges, exiting at both ends.
    this.sign('SERVICE →',2.78,2,-4,4,.65,'#ff665c',-Math.PI/2);
    for(const z of [-18,-5,4])this.light(0,2.5,z,0xff3b48,25,8,true);
    this.neonBox(2.8,.12,-10,.08,.08,23,0x9b253a);
    // Boundary and distant skyline.
    this.box(-29.5,6,0,1,12,54,0x1a293a);this.box(29.5,6,0,1,12,54,0x1a293a);this.box(0,6,-26.5,60,12,1,0x19283a);this.box(0,6,26.5,60,12,1,0x19283a);
    this.sign('DISTRICT 07',0,11,-26,10,1.6,'#5d849f');
    const windows:{x:number;y:number;z:number;sx:number;sy:number;sz:number}[]=[];
    for(let i=0;i<32;i++){const angle=i/32*Math.PI*2,rad=48+(i%4)*6,x=Math.sin(angle)*rad,z=Math.cos(angle)*rad,h=12+(i*7%23),w=6+(i%3)*2;this.box(x,h/2-2,z,w,h,w,0x15243a,false);for(let y=3;y<h-3;y+=3)for(let ox=-w/2+1;ox<w/2;ox+=2){if((i+Math.floor(y)+ox)%3===0)continue;windows.push({x:x+ox,y:y-2,z:z+w/2+.02,sx:.7,sy:1,sz:.04});}}
    // Repeated windows use one instanced draw call.
    for(const x of [-15,15])for(let ox=-9;ox<=9;ox+=3)windows.push({x:x+ox,y:3,z:2.02,sx:.9,sy:1.25,sz:.03});
    const inst=new T.InstancedMesh(this.cube,this.mat(0xaa9a6b,0x76603a),windows.length),m=new T.Matrix4();windows.forEach((v,i)=>{m.makeScale(v.sx,v.sy,v.sz);m.setPosition(v.x,v.y,v.z);inst.setMatrixAt(i,m);});this.scene.add(inst);
    // Suspended cables add a silhouette without blocking travel.
    for(const z of [5,23]){const pts=[];for(let i=0;i<=20;i++){const x=-25+i*2.5;pts.push(new T.Vector3(x,10-Math.sin(i/20*Math.PI)*2,z));}this.scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x293b51})));}
    this.pickup(-24,6,-18,'health');this.pickup(9,6,-3,'ammo');this.pickup(-10,0,16,'health');this.pickup(20,3,22,'ammo');this.pickup(20,6,11,'health');
    // Moon is an inexpensive procedural disc.
    const moon=new T.Mesh(new T.SphereGeometry(4,16,12),new T.MeshBasicMaterial({color:0xb3c8da}));moon.position.set(-42,55,-90);this.scene.add(moon);
  }
  setPower(blackout:boolean,flicker=1) {this.ambient.intensity=blackout?.82:1.5;this.moon.intensity=blackout?1.65:2.1;for(const m of this.neon)m.emissiveIntensity=blackout?.06:2.8*flicker;for(const m of this.signs)m.color.setScalar(blackout?.085:flicker);for(const l of this.powerLights)l.intensity=(blackout?.025:flicker)*(l.color.b>l.color.r?75:55);}
  update(dt:number,t:number,low:boolean) {this.rain.visible=!low;if(!low){for(let i=0;i<this.rainPositions.length;i+=6){this.rainPositions[i+1]-=dt*13;this.rainPositions[i+4]-=dt*13;if(this.rainPositions[i+1]<0){this.rainPositions[i+1]+=28;this.rainPositions[i+4]+=28;}}this.rain.geometry.attributes.position.needsUpdate=true;}
    for(const p of this.pickups){p.mesh.visible=p.cooldown<=0;if(p.cooldown>0)p.cooldown=Math.max(0,p.cooldown-dt);p.mesh.rotation.y=t*.8;p.mesh.position.y=p.pos.y+.65+Math.sin(t*2+p.pos.x)*.1;}
  }
  zone(p:T.Vector3) {return p.z>=8?(p.x>1?'ABANDONED HOTEL':'NIGHT MARKET'):p.y<3?'SERVICE PASSAGE':'SKYLINE APARTMENTS';}
  dispose(){this.scene.traverse(o=>{if(o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if('map'in m)(m as T.MeshStandardMaterial).map?.dispose();m.dispose();}}});}
}
