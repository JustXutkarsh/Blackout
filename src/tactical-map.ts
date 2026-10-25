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
  constructor(public bounds:Bounds,public features:MapFeature[],public labels:readonly [string,number,number][]=[],public routes:readonly {x:number;z:number}[][]=[]){ }
  draw(canvas:HTMLCanvasElement,actors:Actor[],pings:Ping[],yaw:number,full=false){
    const w=full?900:256,h=full?650:200; if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const key=`${w},${h}`;let background=this.backgrounds.get(key);if(!background){background=document.createElement('canvas');background.width=w;background.height=h;this.base(background.getContext('2d')!,w,h,full);this.backgrounds.set(key,background);}
    const c=canvas.getContext('2d')!;c.drawImage(background,0,0);
    for(const ping of pings){const p=worldToMap(ping,this.bounds,w,h);c.beginPath();c.arc(p.x,p.y,full?12:6,0,Math.PI*2);c.fillStyle='#f3a36628';c.fill();c.strokeStyle='#ffb072';c.lineWidth=1.5;c.stroke();}
    for(const a of actors){if(a.team!=='blue'||a.health<=0)continue;const p=worldToMap(a.pos,this.bounds,w,h);c.save();c.translate(p.x,p.y);if(a.id===0){c.rotate(-yaw);c.beginPath();c.moveTo(0,-(full?10:7));c.lineTo(full?7:5,full?8:5);c.lineTo(0,full?4:2);c.lineTo(full?-7:-5,full?8:5);c.closePath();c.fillStyle='#fff9e7';c.fill();c.strokeStyle='#10222e';c.lineWidth=2;c.stroke();}else{c.beginPath();c.arc(0,0,full?5:3.5,0,Math.PI*2);c.fillStyle='#81c7ed';c.fill();c.strokeStyle='#eef9ff';c.lineWidth=1;c.stroke();}c.restore();}
    c.fillStyle='#c8d4d7';c.font=`bold ${full?13:10}px monospace`;c.fillText('N ↑',w-38,19);
  }
  private base(c:CanvasRenderingContext2D,w:number,h:number,full:boolean){
    c.fillStyle='#1b282f';c.fillRect(0,0,w,h);const origin=worldToMap({x:this.bounds.minX,z:this.bounds.minZ},this.bounds,w,h),scale=origin.scale;
    c.fillStyle='#2c393d';c.fillRect(origin.x,origin.y,(this.bounds.maxX-this.bounds.minX)*scale,(this.bounds.maxZ-this.bounds.minZ)*scale);
    c.strokeStyle='#e1edf008';c.lineWidth=1;for(let x=this.bounds.minX;x<this.bounds.maxX;x+=6){const p=worldToMap({x,z:0},this.bounds,w,h);c.beginPath();c.moveTo(p.x,origin.y);c.lineTo(p.x,h-origin.y);c.stroke();}for(let z=this.bounds.minZ;z<this.bounds.maxZ;z+=6){const p=worldToMap({x:0,z},this.bounds,w,h);c.beginPath();c.moveTo(origin.x,p.y);c.lineTo(w-origin.x,p.y);c.stroke();}
    const rect=(f:MapFeature,outline=false)=>{const p=worldToMap({x:f.x-f.w/2,z:f.z-f.d/2},this.bounds,w,h);c.fillRect(p.x,p.y,f.w*scale,f.d*scale);if(outline)c.strokeRect(p.x,p.y,f.w*scale,f.d*scale);};
    for(const f of this.features.filter(f=>f.kind==='floor'&&f.w<40).sort((a,b)=>a.y-b.y)){c.fillStyle=f.y>.4?'#445b58':'#384747';rect(f);}
    c.lineWidth=full?12:4;c.lineCap='round';c.lineJoin='round';c.strokeStyle='#9eac9060';for(const route of this.routes){c.beginPath();route.forEach((point,i)=>{const p=worldToMap(point,this.bounds,w,h);if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);});c.stroke();}
    c.lineWidth=full?1.3:1;c.strokeStyle='#b6c2bb90';for(const f of this.features.filter(f=>f.kind!=='floor')){c.fillStyle=f.kind==='ramp'?'#7b8a6d':f.kind==='building'?'#667476':'#65706a';rect(f,f.kind==='building');}
    for(const [z,color] of [[21,'#5eb5e440'],[-21,'#e99d6040']] as const){const p=worldToMap({x:-10,z:z-3},this.bounds,w,h);c.fillStyle=color;c.fillRect(p.x,p.y,20*scale,6*scale);}
    if(full){const occupied:{x:number;y:number;w:number;h:number}[]=[];c.font='600 14px system-ui';c.textAlign='center';c.textBaseline='middle';
      for(const [name,x,z] of this.labels){const p=worldToMap({x,z},this.bounds,w,h),width=c.measureText(name).width+14;let chosen:{x:number;y:number;w:number;h:number}|undefined;
        for(const [dx,dy] of [[0,0],[0,-22],[0,22],[0,-44],[0,44],[-45,0],[45,0]]){const r={x:Math.max(14,Math.min(w-width-14,p.x-width/2+dx)),y:Math.max(22,Math.min(h-42,p.y-10+dy)),w:width,h:20};if(!occupied.some(o=>r.x<o.x+o.w+5&&r.x+r.w+5>o.x&&r.y<o.y+o.h+4&&r.y+r.h+4>o.y)){chosen=r;break;}}
        if(!chosen)continue;occupied.push(chosen);const cx=chosen.x+chosen.w/2,cy=chosen.y+10;c.strokeStyle='#0b181e';c.lineWidth=4;c.strokeText(name,cx,cy);c.fillStyle='#e4ece8';c.fillText(name,cx,cy);
      }c.textAlign='left';c.textBaseline='alphabetic';
    }
  }
}
