import * as T from 'three';
import { Physics, Navigation, type Ramp } from './physics';
import type { MapFeature } from './tactical-map';
import type { Team } from './rules';
import type { SurfaceAudio } from './audio';
export type Pickup = { mesh:T.Group; pos:T.Vector3; kind:'health'|'ammo'; cooldown:number };
export class World {
  physics=new Physics();nav!:Navigation;signs:T.MeshBasicMaterial[]=[];pickups:Pickup[]=[];
  bounds={minX:-30,maxX:30,minZ:-25,maxZ:25};features:MapFeature[]=[];kinds:SurfaceAudio[]=[];coverPoints:T.Vector3[]=[];
  ambient=new T.HemisphereLight(0xc7e7ff,0x9b9b72,2.15);moon=new T.DirectionalLight(0xfff2da,2.7);
  teamSpawns:Record<Team,T.Vector3[]>={blue:[],orange:[]};spawnPoints:T.Vector3[]=[];
  routes=[[-14,0,14,-19,0,6,-15,0,-7,-13,0,-15],[-6,0,13,-3,0,6,-3,0,-5,-6,0,-13],[20,0,21,20,2,10,16,2,0,20,2,-10,20,0,-21]].map(a=>{const out:T.Vector3[]=[];for(let i=0;i<a.length;i+=3)out.push(new T.Vector3(a[i],a[i+1],a[i+2]));return out;});
  private mats=new Map<string,T.MeshStandardMaterial>(); private cube=new T.BoxGeometry(1,1,1);private barrelGeometry=new T.CylinderGeometry(.42,.42,1.1,10);private bandGeometry=new T.CylinderGeometry(.435,.435,.07,10);private rockGeometry=new T.DodecahedronGeometry(1,0);
  constructor(public scene:T.Scene) {
    scene.background=new T.Color(0x9dcce5);scene.fog=new T.FogExp2(0xb9d5df,.0035);scene.add(this.ambient,this.moon);this.moon.position.set(-30,55,20);
    this.moon.castShadow=true;this.moon.shadow.mapSize.set(1024,1024);Object.assign(this.moon.shadow.camera,{left:-36,right:36,top:32,bottom:-32,near:1,far:120});this.moon.shadow.bias=-.0015;
    for(const team of ['blue','orange'] as const)for(const z of [20.5,23])for(const x of [-8,-4,0,4,8])this.teamSpawns[team].push(new T.Vector3(x,0,z*(team==='blue'?1:-1)));
    this.spawnPoints=[...this.teamSpawns.blue,...this.teamSpawns.orange];
    this.build();this.batchBoxes();this.nav=new Navigation(this.physics);
  }
  private batchBoxes(){
    const groups=new Map<string,T.Mesh[]>();
    for(const o of [...this.scene.children])if(o instanceof T.Mesh&&o.geometry===this.cube){const key=`${o.material.uuid}:${o.castShadow}`;groups.set(key,[...(groups.get(key)||[]),o]);}
    for(const objects of groups.values()){const batch=new T.InstancedMesh(this.cube,objects[0].material,objects.length);batch.castShadow=objects[0].castShadow;batch.receiveShadow=true;objects.forEach((o,i)=>{o.updateMatrix();batch.setMatrixAt(i,o.matrix);this.scene.remove(o);});batch.computeBoundingSphere();this.scene.add(batch);}
  }
  mat(color:number,emissive=0) {const key=`${color},${emissive}`;if(!this.mats.has(key))this.mats.set(key,new T.MeshStandardMaterial({color,roughness:.83,metalness:.06,emissive,emissiveIntensity:emissive?1.6:0}));return this.mats.get(key)!;}
  box(x:number,y:number,z:number,w:number,h:number,d:number,color=0x26364a,solid=true,emissive=0,mapSolid=true) {const m=new T.Mesh(this.cube,this.mat(color,emissive));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=solid;m.receiveShadow=true;this.scene.add(m);if(solid){this.physics.addBox(x,y,z,w,h,d);this.kinds.push([0x9a7750,0x735c43,0x8d826b,0x8d6950,0x7c6c58].includes(color)?'wood':[0x648087,0x69929a,0xc39b65,0x527b85].includes(color)?'metal':'stone');if(h>.4&&mapSolid)this.features.push({x,z,w,d,y:y+h/2,kind:h>2?'building':'cover'});}return m;}
  floor(x:number,z:number,w:number,d:number,y:number,color=0x263747) {this.box(x,y-.18,z,w,.36,d,color);this.features.push({x,z,w,d,y,kind:'floor'});if(y===0||y>=.1)this.physics.surfaces.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2,y});}
  sign(text:string,x:number,y:number,z:number,w:number,h:number,color:string,rotation=0) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d')!;c.fillStyle='#e9dec1';c.fillRect(0,0,1024,256);c.strokeStyle=color;c.lineWidth=7;c.strokeRect(14,14,996,228);c.fillStyle=color;c.shadowColor=color;c.shadowBlur=0;c.font='900 105px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(text,512,132,940);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const mat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});this.signs.push(mat);const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;this.scene.add(mesh);
  }
  ramp(r:Ramp) {this.physics.ramps.push(r);this.features.push({x:(r.x1+r.x2)/2,z:(r.z1+r.z2)/2,w:r.x2-r.x1,d:r.z2-r.z1,y:r.high,kind:'ramp'});const y1=this.physics.rampY(r,r.z1),y2=this.physics.rampY(r,r.z2),b=r.low-.2;const vertices=new Float32Array([r.x1,y1,r.z1,r.x2,y1,r.z1,r.x2,y2,r.z2,r.x1,y2,r.z2,r.x1,b,r.z1,r.x2,b,r.z1,r.x2,b,r.z2,r.x1,b,r.z2]);const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(vertices,3));g.setIndex([0,3,2,0,2,1,4,0,1,4,1,5,5,1,2,5,2,6,6,2,3,6,3,7,7,3,0,7,0,4]);g.computeVertexNormals();const m=new T.Mesh(g,this.mat(0xb5b09a));m.receiveShadow=true;this.scene.add(m);
    for(let z=r.z1+.4;z<r.z2;z+=1.5){const y=this.physics.rampY(r,z);this.box(r.x1+.08,y+.02,z,.09,.035,.32,0xc9ae7b,false);this.box(r.x2-.08,y+.02,z,.09,.035,.32,0xc9ae7b,false);}
  }
  pickup(x:number,y:number,z:number,kind:'health'|'ammo') {const group=new T.Group(),color=kind==='health'?0x7cf1b1:0xf4ca68;const m=new T.Mesh(new T.BoxGeometry(.55,.5,.55),this.mat(0x29413e,color));group.add(m);const cross=new T.Mesh(new T.BoxGeometry(.35,.09,.58),this.mat(color,color));group.add(cross);if(kind==='health'){const v=cross.clone();v.rotation.z=Math.PI/2;group.add(v);}group.position.set(x,y+.65,z);this.scene.add(group);this.pickups.push({mesh:group,pos:new T.Vector3(x,y,z),kind,cooldown:0});}
  private build(){
    this.floor(0,0,60,50,0,0xb7b39c);
    this.floor(-17,0,10,38,.01,0xc8b397);this.floor(0,0,21,34,.015,0xc7c3b4);
    // Raised flank: two end ramps and a central cross-connection.
    this.box(21, .85,0,14,1.7,28,0x8b9080,true,0,false);this.floor(21,0,14,28,2,0xa6b18a);
    this.ramp({x1:17,x2:23,z1:-22,z2:-14,low:0,high:2,reverse:true});
    this.ramp({x1:17,x2:23,z1:14,z2:22,low:0,high:2});
    this.ramp({x1:11,x2:15,z1:-8,z2:0,low:0,high:2,reverse:true});this.floor(13,2,4,4,2,0xa6b18a);
    // Defilade spawn walls force both teams to choose a lane.
    for(const z of [-17,17]){this.box(0,1.35,z,13,2.7,.55,0x9ca49a);this.box(-10,1.3,z>0?22:-22,.55,2.6,5,0x929c93);this.box(10,1.3,z>0?22:-22,.55,2.6,5,0x929c93);}
    this.sign('BLUE / SNOWLINE',0,2.1,24.65,8,1,'#3284b0');this.sign('ORANGE / RIDGEBACK',0,2.1,-24.65,8,1,'#d47934');
    // Warehouse walls use real entrance gaps on all four sides.
    for(const z of [-9,9])for(const x of [-5.55,5.55])this.box(x,2.35,z,6.9,4.7,.4,0xd4c5a9);
    for(const x of [-9,9])for(const z of [-5.55,5.55])this.box(x,2.35,z,.4,4.7,6.9,0xd4c5a9);
    for(const z of [-9,9])this.box(0,4.1,z,4.2,1.2,.4,0x487e83);
    for(const x of [-9,9])this.box(x,4.1,0,.4,1.2,4.2,0x487e83);
    this.box(0,4.78,0,18.7,.18,18.7,0x6e6657);this.roof(0,0,19.2,19.2,4.9,2.3,0x527b85);
    for(const z of [-7,-2,3,7])this.box(0,4.5,z,18,.2,.18,0x665b4d,false);
    this.sign('KORA CO-OP / 02',0,3.9,9.24,8,.85,'#255e68');this.sign('WAREHOUSE',0,3.9,-9.24,7,.85,'#255e68',Math.PI);
    this.floor(4.75,0,3.5,6,1.5,0x8d826b);
    this.ramp({x1:3,x2:6.5,z1:-8,z2:-3,low:0,high:1.5,reverse:true});this.ramp({x1:3,x2:6.5,z1:3,z2:8,low:0,high:1.5});
    this.box(3,1.9,0,.18,.8,2.5,0x487e83);this.crate(-4,-4,0,2);this.crate(-3,4,0,1.6);this.crate(.4,-1,0,1.3);
    this.crate(-5,13,0,1.5);this.crate(5,-13,0,1.5);this.crate(11,11,0,1.5);this.crate(-11,-12,0,1.5);
    // Village rooms, shopfronts, balcony and connected street alleys.
    this.house(-24,-11,7,7,0xdfc18e,0x2e808e,false);this.house(-24,11,7,7,0xe5d5b8,0xb66048,false);
    this.house(-23,0,8,8,0xe4d7b9,0x5b9b91,true);
    this.sign('SUMMIT STORES',-18.85,2.9,0,5,.7,'#397b75',Math.PI/2);
    this.floor(-16,1.5,6,5,2.7,0xab9580);this.ramp({x1:-16.5,x2:-13.5,z1:4,z2:13,low:0,high:2.7});
    for(const x of [-18.8,-13.2])this.box(x,3.12,1.5,.15,.84,5,0x8d6950);this.box(-16,3.12,-1,6,.84,.16,0x8d6950);
    this.sign('TEA / CHAI',-19.9,2.6,11,4,.7,'#ad5945',Math.PI/2);this.sign('MOUNTAIN TURF',-19.9,2.6,-11,5,.7,'#307f91',Math.PI/2);
    this.box(-16,.5,-11,2,1,1.4,0x9b8d74);this.barrel(-20,6,0);this.barrel(-11,7,0);this.crate(-22,-5,0,1.2);
    // Terraced gardens and sheds break up the longer-range route.
    this.house(25,-7,5,5,0xd8c6a3,0x7c8a77,false,2);this.house(25,9,5,5,0xbcbca1,0xa77959,false,2);
    this.rock(18,0,2,3.3,1.2,2);this.rock(22,4,2,2,1.3,2);this.crate(16,-10,2,1.5);this.barrel(17,8,2);
    for(const z of [-12,12])this.box(27,2.4,z,1,.8,3,0x949b84);
    this.sign('RIDGE TRAIL',27.7,4,0,5,.8,'#58724c',-Math.PI/2);
    this.vehicle(-11,14,0,0x69929a);this.vehicle(10,-13,0,0xc39b65);
    this.box(-11,1.4,0,1.2,2.8,2.1,0xa3a08c);this.box(11,1.2,8,1.4,2.4,2,0xa6a08a);
    for(const [x,z,y] of [[-27,19,0],[-27,-20,0],[27,18,0],[27,-18,0],[27,3,2],[25,-12,2],[-28,4,0]])this.tree(x,z,y);
    // Painted boundaries read as village retaining walls; mountains remain decorative.
    this.box(-29.5,2,0,1,4,50,0x8f998c);this.box(29.5,3,0,1,6,50,0x8f998c);this.box(0,2,-24.8,60,4,.6,0x929b8d);this.box(0,2,24.8,60,4,.6,0x929b8d);
    for(const x of [-27,-18,13,27])for(const z of [-18,18]){this.box(x,3.3,z,.15,6.6,.15,0x7c6c58);}
    for(const z of [-18,18]){const pts=[];for(let i=0;i<=28;i++)pts.push(new T.Vector3(-27+i*1.93,6.6-Math.sin(i/28*Math.PI)*1.4,z));this.scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x525b55})));for(let i=0;i<24;i++){const x=-25+i*2.1,y=6.6-Math.sin((x+27)/54*Math.PI)*1.4;this.box(x,y-.25,z,.55,.5,.035,[0x5285ad,0xd2a55a,0xb55f54,0x638f7b][i%4],false);}}
    for(let i=0;i<18;i++){const a=i/18*Math.PI*2,x=Math.sin(a)*85,z=Math.cos(a)*85,h=24+(i*7%24);const g=new T.ConeGeometry(23,h,5);const m=new T.Mesh(g,this.mat(i%2?0x7d9eaf:0x8ca9ba));m.position.set(x,h/2-6,z);m.rotation.y=i*.8;this.scene.add(m);const snow=new T.Mesh(new T.ConeGeometry(9,h*.38,5),this.mat(0xe6efee));snow.position.set(x,h-6-h*.19,z);snow.rotation.y=i*.8;this.scene.add(snow);}
    this.pickup(-12,0,-8,'ammo');this.pickup(20,2,9,'ammo');this.pickup(0,0,12,'ammo');
    this.coverPoints=[[-12,0,14],[-4,0,13],[4,0,-13],[-5,0,-5],[-5,0,5],[17,2,-1],[22,2,6],[-19,0,6],[-20,0,-5]].map(p=>new T.Vector3(...p as [number,number,number]));
  }
  private roof(x:number,z:number,w:number,d:number,y:number,rise:number,color:number){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-w/2,0,-d/2,0,rise,-d/2,w/2,0,-d/2,-w/2,0,d/2,0,rise,d/2,w/2,0,d/2],3));g.setIndex([0,3,4,0,4,1,1,4,5,1,5,2,0,1,2,3,5,4]);g.computeVertexNormals();const roof=new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:.65,metalness:.3,side:T.DoubleSide}));roof.position.set(x,y,z);roof.castShadow=true;this.scene.add(roof);
    for(let dx=-w/2+.3;dx<w/2;dx+=.65){const sy=y+rise*(1-Math.abs(dx)/(w/2));this.box(x+dx,sy+.03,z,.045,.045,d,color,false);}
  }
  private house(x:number,z:number,w:number,d:number,color:number,trim:number,room=false,y=0){
    if(room){this.floor(x,z,w,d,y,0xc1b39c);this.box(x-w/2,y+1.6,z,.3,3.2,d,color);this.box(x,y+1.6,z+d/2,w,3.2,.3,color);for(const zz of [-d/2+1,d/2-1])this.box(x+w/2,y+1.6,z+zz,.3,3.2,2,color);for(const xx of [-w/2+1,w/2-1])this.box(x+xx,y+1.6,z-d/2,2,3.2,.3,color);this.box(x,y+3.25,z,w,.15,d,0x837d69);}
    else this.box(x,y+1.65,z,w,3.3,d,color);
    this.roof(x,z,w+.6,d+.6,y+3.35,1.1,trim);
    for(const zz of [-d*.27,d*.27]){this.box(x+w/2+.03,y+1.8,z+zz,.06,1.2,1.15,trim,false);this.box(x+w/2+.08,y+1.8,z+zz,.035,.9,.65,0x334c54,false);}
    if(!room)this.box(x+w/2+.07,y+1.15,z,.08,2.3,1,0x7e6044,false);
    for(let h=.4;h<1.2;h+=.35)this.box(x,y+h,z+d/2+.03,w,.08,.04,0x999c88,false);
  }
  private crate(x:number,z:number,y=0,size=1.5){this.box(x,y+size/2,z,size,size,size,0x9a7750);for(const dx of [-.38,.38])this.box(x+dx*size,y+size/2,z+size/2+.02,.08,size,.035,0x735c43,false);this.coverPoints.push(new T.Vector3(x-size*.8,y,z));}
  private barrel(x:number,z:number,y:number){const body=new T.Mesh(this.barrelGeometry,this.mat(0x648087));body.position.set(x,y+.55,z);body.castShadow=true;body.receiveShadow=true;this.scene.add(body);for(const h of [.18,.88]){const band=new T.Mesh(this.bandGeometry,this.mat(0x53636a));band.position.set(x,y+h,z);this.scene.add(band);}this.physics.addBox(x,y+.55,z,.84,1.1,.84);this.kinds.push('metal');this.features.push({x,z,w:.84,d:.84,y:y+1.1,kind:'cover'});}
  private rock(x:number,z:number,y:number,w:number,h:number,d:number){this.rockGeometry.computeBoundingBox();const b=this.rockGeometry.boundingBox!;const rock=new T.Mesh(this.rockGeometry,this.mat(0x939a8a));rock.scale.set(w/(b.max.x-b.min.x),h/(b.max.y-b.min.y),d/(b.max.z-b.min.z));rock.position.set(x,y+h/2,z);rock.castShadow=true;rock.receiveShadow=true;this.scene.add(rock);this.physics.addBox(x,y+h/2,z,w,h,d);this.kinds.push('stone');this.features.push({x,z,w,d,y:y+h,kind:'cover'});}
  private vehicle(x:number,z:number,y:number,color:number){this.box(x,y+.75,z,2.2,1.1,4,color);this.box(x,y+1.6,z-.5,2.1,1.1,1.8,color);this.box(x,y+1.75,z-1.42,1.75,.6,.035,0x517580,false);for(const dx of [-1.05,1.05])for(const dz of [-1.25,1.25])this.box(x+dx,y+.45,z+dz,.35,.85,.85,0x3f4a49);}
  private tree(x:number,z:number,y:number){this.box(x,y+1.5,z,.65,3,.65,0x7d6b4d);for(let i=0;i<3;i++){const tree=new T.Mesh(new T.ConeGeometry(2.2-i*.4,3.5,7),this.mat(0x52755e+i*0x080600));tree.position.set(x,y+3+i*1.1,z);this.scene.add(tree);}}
  surfaceAt(p:T.Vector3):SurfaceAudio{for(let i=this.physics.boxes.length-1;i>=0;i--){const b=this.physics.boxes[i];if(p.x>=b.min.x-.12&&p.x<=b.max.x+.12&&p.z>=b.min.z-.12&&p.z<=b.max.z+.12&&p.y>=b.min.y-.12&&p.y<=b.max.y+.12)return this.kinds[i];}return 'stone';}
  update(dt:number,t:number,_low:boolean){for(const p of this.pickups){p.mesh.visible=p.cooldown<=0;if(p.cooldown>0)p.cooldown=Math.max(0,p.cooldown-dt);p.mesh.rotation.y=t*.5;p.mesh.position.y=p.pos.y+.6+Math.sin(t*2)*.06;}}
  zone(p:T.Vector3){return p.z>17?'SNOWLINE CAMP':p.z<-17?'RIDGEBACK CAMP':p.x>12?'TERRACED HILLSIDE':p.x<-12?'VILLAGE STREET':Math.abs(p.z)<9&&Math.abs(p.x)<9?'KORA WAREHOUSE':'CO-OP COURTYARD';}
  dispose(){this.scene.traverse(o=>{if(o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if('map'in m)(m as T.MeshStandardMaterial).map?.dispose();m.dispose();}}});}
}
