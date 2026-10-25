import {Vector3} from 'three';
export type MotionKind='idle'|'walk'|'backward'|'strafe'|'run'|'sprint'|'crouch'|'crawl'|'air'|'land'|'turn';
export class MotionState {
  last=new Vector3();phase=0;speed=0;blend=0;land=0;hitSide=1;hit=0;air=0;grounded=false;direction=0;kind:MotionKind='idle';lastYaw=0;
  reset(pos:Vector3){this.last.copy(pos);this.phase=this.speed=this.blend=this.land=this.hit=this.air=this.direction=0;this.kind='idle';this.grounded=false;this.lastYaw=0;}
  tick(pos:Vector3,dt:number,grounded:boolean,crouch:number,prone:number,yaw:number,sprint=false){
    const dx=pos.x-this.last.x,dz=pos.z-this.last.z,d=Math.hypot(dx,dz);this.last.copy(pos);this.speed=d<1?d/Math.max(dt,.0001):0;const moving=this.speed>.08;
    if(grounded&&!this.grounded&&this.air>.1)this.land=.2;this.air=grounded?0:this.air+dt;this.grounded=grounded;this.land=Math.max(0,this.land-dt);this.hit=Math.max(0,this.hit-dt);
    const side=dx*Math.cos(yaw)-dz*Math.sin(yaw),forward=-dx*Math.sin(yaw)-dz*Math.cos(yaw);if(moving)this.direction=Math.atan2(side,forward);
    const turn=Math.abs(Math.atan2(Math.sin(yaw-this.lastYaw),Math.cos(yaw-this.lastYaw)));this.lastYaw=yaw;
    this.kind=!grounded?'air':this.land>0?'land':!moving?(turn>.005?'turn':'idle'):prone>.5?'crawl':crouch>.5?'crouch':forward<-d*.55?'backward':Math.abs(side)>d*.75?'strafe':sprint?'sprint':this.speed>2.3?'run':'walk';
    this.blend+=(Number(moving)-this.blend)*(1-Math.exp(-dt*12));const stride=prone>.5?.85:crouch>.5?1.65:sprint?3.7:this.speed>2.3?2.5:1.5,old=this.phase;this.phase+=grounded&&moving&&d<1?d/stride*Math.PI*2:0;
    if(this.kind==='turn')this.phase+=turn*.7;return grounded&&moving&&prone<.5&&Math.floor((old+1e-8)/Math.PI)!==Math.floor((this.phase+1e-8)/Math.PI);
  }
}
