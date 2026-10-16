import * as T from 'three';
import type {World} from './world';
// Original static village set dressing. Only substantial cover enters world collision.
export function buildMarket(w:World){
  const sphere=new T.SphereGeometry(1,12,8),cylinder=new T.CylinderGeometry(1,1,1,10),torus=new T.TorusGeometry(1,.09,5,14);
  const pools=new Map<string,{g:T.BufferGeometry;m:T.Material;matrices:T.Matrix4[];colors?:T.Color[];shadow:boolean}>();
  const matrix=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0),delta=new T.Vector3(),p=new T.Vector3();
  const put=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,sx:number,sy=sx,sz=sx,rx=0,ry=0,rz=0,color?:number,shadow=false)=>{const key=g.uuid+m.uuid+shadow;let pool=pools.get(key);if(!pool){pool={g,m,matrices:[],colors:color===undefined?undefined:[],shadow};pools.set(key,pool);}q.setFromEuler(new T.Euler(rx,ry,rz));matrix.compose(p.set(x,y,z),q,new T.Vector3(sx,sy,sz));pool.matrices.push(matrix.clone());pool.colors?.push(new T.Color(color??0xffffff));};
  const pipe=(a:number[],b:number[],r:number,color=0x53636a)=>{delta.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);q.setFromUnitVectors(up,delta.clone().normalize());matrix.compose(p.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),q,new T.Vector3(r,delta.length(),r));const m=w.mat(color),key=cylinder.uuid+m.uuid+'false';let pool=pools.get(key);if(!pool){pool={g:cylinder,m,matrices:[],shadow:false};pools.set(key,pool);}pool.matrices.push(matrix.clone());};
  const fruit=new T.MeshStandardMaterial({color:0xffffff,roughness:.85});
  const banana=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.12,.06,0),new T.Vector3(-.05,0,0),new T.Vector3(.06,.015,0),new T.Vector3(.15,.09,0)]),8,.025,6,false);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#426e31';ctx.fillRect(0,0,256,128);for(let i=0;i<13;i++){ctx.beginPath();for(let y=0;y<=128;y+=4){const x=i*21+Math.sin(y*.11+i)*3;if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle='#243f25';ctx.lineWidth=6;ctx.stroke();}const melonMap=new T.CanvasTexture(canvas);melonMap.colorSpace=T.SRGBColorSpace;const melon=new T.MeshStandardMaterial({map:melonMap,roughness:.9});
  const fabric=document.createElement('canvas');fabric.width=fabric.height=128;const fc=fabric.getContext('2d')!;fc.fillStyle='#d8d1b9';fc.fillRect(0,0,128,128);fc.fillStyle='#a8a38f';for(let i=0;i<128;i+=32)fc.fillRect(i,0,12,128);fc.fillStyle='#ffffff22';for(let i=0;i<128;i+=3)fc.fillRect(0,i,128,1);const clothMap=new T.CanvasTexture(fabric);clothMap.colorSpace=T.SRGBColorSpace;clothMap.wrapS=clothMap.wrapT=T.RepeatWrapping;clothMap.repeat.set(2,3);
  const awning=(z:number,color:number)=>{const g=new T.PlaneGeometry(3.2,4.8,1,4),m=new T.MeshStandardMaterial({color,map:clothMap,roughness:1,side:T.DoubleSide});const cloth=new T.Mesh(g,m);cloth.rotation.x=-Math.PI/2;cloth.position.set(-36.9,2.65,z);cloth.castShadow=true;w.scene.add(cloth);w.movingCloth.push(cloth);for(const dz of [-2.15,2.15]){w.box(-35.45,1.3,z+dz,.09,2.6,.09,0x665b4d);pipe([-38.45,2.75,z+dz],[-35.4,2.65,z+dz],.035,0x665b4d);}w.box(-35.35,2.52,z,.055,.22,4.8,color,false);};
  const tray=(z:number,kind:'apples'|'oranges'|'bananas'|'melons')=>{
    const x=-36.8;for(const side of [-1,1]){w.box(x+side*.4,1.04,z,.055,.15,.95,0x9a7750,false);w.box(x,1.04,z+side*.48,.85,.15,.055,0x9a7750,false);}w.box(x,.98,z,.85,.06,.95,0x735c43,false);
    if(kind==='apples'||kind==='oranges')for(let i=0;i<28;i++){const xx=x-.29+(i%4)*.19,zz=z-.34+(Math.floor(i/4)%4)*.2,yy=1.13+Math.floor(i/16)*.14;put(sphere,fruit,xx,yy,zz,.092,kind==='apples'?.085:.092,.09,0,i*.7,0,kind==='apples'?(i%5?0xb14d32:0x99a845):0xdc8737);if(kind==='apples')put(cylinder,w.mat(0x665b4d),xx,yy+.09,zz,.009,.06,.009);}
    if(kind==='bananas')for(let i=0;i<20;i++)put(banana,w.mat(0xd2ad46),x-.2+(i%3)*.2,1.12+Math.floor(i/9)*.07,z-.32+(Math.floor(i/3)%3)*.26,1,1,1,.15,(i%3)*.35,0);
    if(kind==='melons')for(let i=0;i<4;i++)put(sphere,melon,x-.2+(i%2)*.37,1.18,z-.22+Math.floor(i/2)*.43,.23,.17,.19,0,i*.4,0);
  };
  const board=(text:string,x:number,y:number,z:number,width=2)=>w.sign(text,x,y,z,width,.34,'#375c50',Math.PI/2);
  // Added footprint is 12 x 50m. Terrace has two ramps, plus an eastern cross-connection.
  w.floor(-35.5,15,11,12,.6,0xc1b39c);w.box(-35.5,.12,15,11,.6,12,0x9ca49a,true,0,false);
  w.ramp({x1:-35.5,x2:-31.5,z1:5,z2:9,low:0,high:.6,reverse:true});w.ramp({x1:-34.5,x2:-31.5,z1:21,z2:24,low:0,high:.6});
  w.floor(-29.5,10,3,2,.6,0xc1b39c);w.ramp({x1:-30.5,x2:-27.5,z1:6,z2:9,low:0,high:.6,reverse:true});
  for(const z of [-10,-3,4]){w.house(-39.8,z,2.8,5,0xe5d5b8,z===4?0xb66048:0x5b9b91);awning(z,z===-10?0x927d58:z===-3?0x718c79:0xa67d61);w.box(-36.8,.48,z,1,.96,3.8,0x9a7750);w.contact(-36.8,.025,z,1.5,4.3);for(const dz of [-1.55,1.55])w.crate(-38,z+dz,0,.65);}
  tray(-10.8,'apples');tray(-9.3,'oranges');tray(-3.8,'bananas');tray(-2.3,'melons');
  board('NIMA FRUIT',-35.31,2.49,-10,3.1);board('RIDGE HARVEST',-35.31,2.49,-3,3.1);board('KORA TEA',-35.31,2.49,4,3.1);
  board('APPLES 80 / ORANGES 60',-36.24,.68,-10,3);board('BANANAS 50 / MELON 90',-36.24,.68,-3,3);board('TEA / CLOSED FOR TODAY',-36.24,.68,4,3);
  // Mechanical weighing scale, woven baskets, tea kettle and cups.
  w.box(-36.8,1.04,-11.5,.45,.15,.4,0x648087,false);put(cylinder,w.mat(0x53636a),-36.8,1.23,-11.5,.24,.035,.24);
  put(cylinder,w.mat(0xc9ae7b),-36.51,1.2,-11.5,.13,.06,.13,0,0,Math.PI/2);pipe([-36.47,1.2,-11.5],[-36.47,1.28,-11.45],.008,0x334c54);
  for(const z of [-12.6,-5.5,6.5]){put(cylinder,w.mat(0x9a7750),-38,.22,z,.3,.42,.3);for(const h of [.07,.18,.3,.42])put(torus,w.mat(0x735c43),-38,h,z,.3,.3,.3,Math.PI/2);}
  put(sphere,w.mat(0xc39b65),-36.8,1.18,3.6,.19,.19,.19);pipe([-36.78,1.2,3.5],[-36.58,1.34,3.4],.04,0xc39b65);put(torus,w.mat(0x53636a),-36.8,1.23,3.8,.12,.16,.12);
  for(let i=0;i<5;i++)put(cylinder,w.mat(0xe5d5b8),-36.7,1.07,4.3+i*.15,.045,.13,.045);
  // Residential court and water supply. Entries face the open court, not the boundary.
  w.house(-39.1,17,4,5,0xdfc18e,0x527b85,false,.6);w.crate(-36,19,.6,1);w.barrel(-40,12,.6);board('JUNIPER COURT',-36.5,3.23,17,2.7);
  w.box(-39.1,5.13,17,1.7,.15,1.7,0x665b4d,false);for(const x of [-39.7,-38.5])for(const z of [16.4,17.6])w.box(x,4.91,z,.1,.43,.1,0x665b4d,false);
  put(cylinder,w.mat(0x53636a),-39.1,5.78,17,.68,1.15,.68,0,0,0,undefined,true);put(cylinder,w.mat(0x648087),-39.1,6.37,17,.72,.07,.72);pipe([-38.5,5.7,17],[-37.2,.65,17],.035);
  // Parked cycle/scooters leave the 3m combat aisle clear. Frames and cloth aren't cover.
  const bike=(x:number,z:number,scooter:boolean)=>{for(const dz of [-.67,.67]){put(torus,w.mat(0x343a36),x,.34,z+dz,.31,.31,.31,0,Math.PI/2);put(cylinder,w.mat(0x53636a),x,.34,z+dz,.21,.08,.21,0,0,Math.PI/2);}pipe([x,.35,z-.65],[x,.9,z-.45],.035);pipe([x,.35,z+.65],[x,.65,z],.035);pipe([x,.65,z],[x,.35,z-.65],.035);pipe([x,.65,z],[x,.9,z-.45],.035);pipe([x-.25,1,z-.43],[x+.25,1,z-.43],.025);w.box(x,.84,z+.12,.35,.1,.5,0x343a36,false);if(scooter){w.box(x,.48,z,.42,.38,.9,0x69929a);w.box(x,.7,z-.48,.42,.6,.12,0x69929a,false);}};
  bike(-39,-19,true);bike(-37.6,-19,true);bike(-40,10,true);bike(-30.8,-10,false);
  board('PASS MOTOR REPAIR',-38.2,2.5,-19,4);w.box(-39,2,-22,.14,1.1,3,0x735c43,false);for(let i=0;i<6;i++)pipe([-38.9,1.65+i*.12,-22.5],[-38.9,1.65+i*.12,-21.8],.018);
  // Delivery handcart, wood balcony, drain grates and useful sturdy cover.
  w.box(-38,.55,-15,1.3,.14,1.6,0x9a7750);for(const dx of [-.6,.6]){put(torus,w.mat(0x343a36),-38+dx,.3,-15,.27,.27,.27,0,Math.PI/2);pipe([-38+dx,.55,-14.3],[-38+dx,.8,-13.5],.035,0x665b4d);}w.crate(-38,-15,.64,.7);
  w.box(-37.2,2.77,17,1.2,.36,3.7,0x8d826b);for(const z of [15.2,18.8]){w.box(-37.2,3.72,z,1.3,.09,.07,0x665b4d);w.box(-36.57,1.66,z,.1,2.12,.1,0x665b4d);}for(const y of [3.01,3.72])w.box(-36.57,y,17,.07,.09,3.7,0x665b4d);for(let z=15.2;z<18.9;z+=.37)w.box(-36.57,3.36,z,.06,.72,.06,0x665b4d); // Decorative balcony is not a navigation destination.
  for(let z=-14;z<6;z+=.22)w.box(-35.7,.018,z,.25,.025,.045,0x343a36,false);w.box(-35.7,.005,-4,.3,.012,20,0x343a36,false);
  w.crate(-32,-18,0,1.05);w.crate(-32,1,0,1.1);w.crate(-31,14,.6,1.15);w.coverPoints.push(new T.Vector3(-34.5,0,-10),new T.Vector3(-34,.6,18));
  for(const z of [-22,22]){w.box(-35,3,z,.14,6,.14,0x7c6c58);const curve=new T.CatmullRomCurve3([new T.Vector3(-35,6,z),new T.Vector3(-34,5.4,0),new T.Vector3(-35,6,-z)]);const wire=new T.Mesh(new T.TubeGeometry(curve,24,.012,4,false),w.mat(0x343a36));w.scene.add(wire);break;}
  const dust=new Float32Array(96*3);for(let i=0;i<96;i++){dust[i*3]=-40+(i*13%100)/10;dust[i*3+1]=.4+(i*7%30)/10;dust[i*3+2]=-15+(i*17%350)/10;}const dg=new T.BufferGeometry();dg.setAttribute('position',new T.BufferAttribute(dust,3));w.dust=new T.Points(dg,new T.PointsMaterial({color:0xf1d8a6,size:.025,transparent:true,opacity:.23,depthWrite:false}));w.scene.add(w.dust);
  for(const pool of pools.values()){const mesh=new T.InstancedMesh(pool.g,pool.m,pool.matrices.length);pool.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(pool.colors)mesh.setColorAt(i,pool.colors[i]);});mesh.castShadow=pool.shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();w.scene.add(mesh);}
}
