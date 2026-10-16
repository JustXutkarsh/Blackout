import type { Actor } from './actors';
import { CONFIG } from './config';
export type Bounds={minX:number;maxX:number;minZ:number;maxZ:number};
export type MapFeature={x:number;z:number;w:number;d:number;y:number;kind:'building'|'cover'|'floor'|'ramp'};
export function worldToMap(p:{x:number;z:number},b:Bounds,w:number,h:number,pad=12){const scale=Math.min((w-pad*2)/(b.maxX-b.minX),(h-pad*2)/(b.maxZ-b.minZ));return {x:w/2+(p.x-(b.minX+b.maxX)/2)*scale,y:h/2+(p.z-(b.minZ+b.maxZ)/2)*scale,scale};}
export type Ping={x:number;z:number;expires:number};
export class Pings{
  items:Ping[]=[];
  add(pos:{x:number;z:number},t:number,jitterX=0,jitterZ=0){if(this.items.length>=24)this.items.shift();this.items.push({x:pos.x+jitterX,z:pos.z+jitterZ,expires:t+CONFIG.intel.pingSeconds});}
  tick(t:number){this.items=this.items.filter(p=>p.expires>t);}
  clear(){this.items.length=0;}
}
export class TacticalMap{
  private backgrounds=new Map<string,HTMLCanvasElement>();
  constructor(public bounds:Bounds,public features:MapFeature[],public labels:readonly [string,number,number][]=[]){ }
  draw(canvas:HTMLCanvasElement,actors:Actor[],pings:Ping[],yaw:number,full=false){
    const w=full?720:230,h=full?600:192; if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const key=`${w},${h}`;let background=this.backgrounds.get(key);if(!background){background=document.createElement('canvas');background.width=w;background.height=h;this.base(background.getContext('2d')!,w,h,full);this.backgrounds.set(key,background);}
    const c=canvas.getContext('2d')!;c.drawImage(background,0,0);
    for(const ping of pings){const p=worldToMap(ping,this.bounds,w,h);c.beginPath();c.arc(p.x,p.y,full?12:6,0,Math.PI*2);c.fillStyle='#e2742b30';c.fill();c.strokeStyle='#d15e24';c.lineWidth=1.5;c.stroke();}
    for(const a of actors){if(a.team!=='blue'||a.health<=0)continue;const p=worldToMap(a.pos,this.bounds,w,h);c.save();c.translate(p.x,p.y);if(a.id===0){c.rotate(-yaw);c.beginPath();c.moveTo(0,-(full?10:7));c.lineTo(full?7:5,full?8:5);c.lineTo(0,full?4:2);c.lineTo(full?-7:-5,full?8:5);c.closePath();c.fillStyle='#12374c';c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();}else{c.beginPath();c.arc(0,0,full?5:3.5,0,Math.PI*2);c.fillStyle='#2586bd';c.fill();c.strokeStyle='#eef9ff';c.lineWidth=1;c.stroke();if(full){c.fillStyle='#24495b';c.font='10px monospace';c.fillText(a.name,8,3);}}c.restore();}
    c.fillStyle='#32535e';c.font=`bold ${full?13:10}px monospace`;c.fillText('N ↑',w-38,19);
  }
  private base(c:CanvasRenderingContext2D,w:number,h:number,full:boolean){c.fillStyle='#dedbc6';c.fillRect(0,0,w,h);
    const rect=(f:MapFeature)=>{const p=worldToMap({x:f.x-f.w/2,z:f.z-f.d/2},this.bounds,w,h);c.fillRect(p.x,p.y,f.w*p.scale,f.d*p.scale);};
    for(const f of this.features.filter(f=>f.kind==='floor').sort((a,b)=>a.y-b.y)){c.fillStyle=f.y>1?'#b6c79e':f.w<15?'#d3bb96':'#dcd5bc';rect(f);}
    for(const f of this.features.filter(f=>f.kind!=='floor')){c.fillStyle=f.kind==='ramp'?'#ccd29a':f.kind==='building'?'#8d958d':'#a99a7e';rect(f);}
    for(const [z,color] of [[21,'#318bc14a'],[-21,'#e681304a']] as const){const p=worldToMap({x:-10,z:z-3},this.bounds,w,h);c.fillStyle=color;c.fillRect(p.x,p.y,20*p.scale,6*p.scale);}
    if(full){for(const [name,x,z] of this.labels){const p=worldToMap({x,z},this.bounds,w,h);c.font='bold 12px monospace';const width=c.measureText(name).width;c.fillStyle='#f7f4e3e8';c.fillRect(p.x-width/2-5,p.y-11,width+10,18);c.textAlign='center';c.fillStyle='#31474d';c.fillText(name,p.x,p.y+2);c.textAlign='left';}}
  }
}
