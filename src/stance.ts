import { Box3, Vector3 } from 'three';
import { CONFIG } from './config';
import { rayBox, type Physics } from './physics';
export type StanceKind='standing'|'crouched'|'prone';
export const STANCES={standing:{height:CONFIG.player.height,eye:CONFIG.player.eye,speed:1,spread:1},crouched:{height:CONFIG.player.crouchHeight,eye:CONFIG.player.crouchEye,speed:CONFIG.player.crouchSpeed,spread:CONFIG.stance.crouchSpread},prone:{height:CONFIG.stance.height,eye:CONFIG.stance.eye,speed:CONFIG.stance.speed,spread:CONFIG.stance.spread}} as const;
export class Stance {
  kind:StanceKind='standing';from:StanceKind='standing';left=0;duration=0;cooldown=0;height=STANCES.standing.height as number;eye=STANCES.standing.eye as number;prone=0;crouch=0;
  private startHeight=this.height;private startEye=this.eye;private startProne=0;private startCrouch=0;
  get changing(){return this.left>0;}
  get elongated(){return this.kind==='prone'||(this.changing&&this.from==='prone');}
  get speed(){return STANCES[this.kind].speed*(this.changing?0:1);}
  cancel(){this.left=this.cooldown=0;this.from=this.kind;}
  reset(){this.kind=this.from='standing';this.left=this.cooldown=this.prone=this.crouch=0;this.height=STANCES.standing.height;this.eye=STANCES.standing.eye;}
  request(kind:StanceKind,actor:StancedBody,physics:Physics):string|undefined {
    if(this.changing||this.cooldown>0)return 'STANCE TRANSITION';if(kind===this.kind)return;
    const elongated=this.kind==='prone'||kind==='prone',height=Math.max(this.height,STANCES[kind].height);
    if(kind==='prone'&&!actor.grounded)return 'PRONE NEEDS LEVEL GROUND';
    if(elongated){if(!physics.proneFits(actor.pos,actor.yaw,height))return 'PRONE / NEED MORE LEVEL SPACE';}
    else if(!physics.clearance(actor.pos,height))return 'LOW CEILING / CANNOT STAND';
    this.from=this.kind;this.kind=kind;this.duration=this.left=elongated?CONFIG.stance.proneSeconds:CONFIG.stance.crouchSeconds;
    this.startHeight=this.height;this.startEye=this.eye;this.startProne=this.prone;this.startCrouch=this.crouch;
  }
  tick(dt:number){this.cooldown=Math.max(0,this.cooldown-dt);if(!this.changing)return;
    this.left=Math.max(0,this.left-dt);const t=1-this.left/this.duration,p=t*t*(3-2*t),target=STANCES[this.kind];
    this.height=this.startHeight+(target.height-this.startHeight)*p;this.eye=this.startEye+(target.eye-this.startEye)*p;this.prone=this.startProne+((this.kind==='prone'?1:0)-this.startProne)*p;this.crouch=this.startCrouch+((this.kind==='crouched'?1:0)-this.startCrouch)*p;
    if(!this.changing){this.from=this.kind;this.cooldown=CONFIG.stance.cooldown;}
  }
}
export type StancedBody={pos:Vector3;yaw:number;grounded:boolean;stance:Stance;height:number};
export function headOffset(s:Stance){return Math.sin(s.prone*Math.PI/2)*(CONFIG.stance.headForward+.94-.5*s.crouch-.94*s.prone)*(1-.18*s.crouch);}
export function eyePosition(a:StancedBody,out:Vector3){const offset=headOffset(a.stance);return out.set(a.pos.x-Math.sin(a.yaw)*offset,a.pos.y+a.stance.eye,a.pos.z-Math.cos(a.yaw)*offset);}
export function turnBody(a:StancedBody,yaw:number,physics:Physics){if(!a.stance.elongated){a.yaw=yaw;return true;}const delta=Math.atan2(Math.sin(yaw-a.yaw),Math.cos(yaw-a.yaw)),n=Math.max(1,Math.ceil(Math.abs(delta)/.06));for(let i=1;i<=n;i++)if(!physics.proneFits(a.pos,a.yaw+delta*i/n,a.height))return false;a.yaw=yaw;return true;}
const o=new Vector3(),d=new Vector3(),box=new Box3();
export function postureHit(a:StancedBody,origin:Vector3,direction:Vector3,max:number){
  const c=Math.cos(a.yaw),s=Math.sin(a.yaw),x=origin.x-a.pos.x,z=origin.z-a.pos.z,p=a.stance.prone,h=a.height;
  o.set(c*x-s*z,origin.y-a.pos.y,s*x+c*z);d.set(c*direction.x-s*direction.z,direction.y,s*direction.x+c*direction.z);
  const offset=headOffset(a.stance);box.min.set(-.21,a.stance.eye-.15,-offset-.21);box.max.set(.21,Math.min(h+.02,a.stance.eye+.2),-offset+.21);
  const head=rayBox(o,d,box);box.min.set(-.3,.06,-.28-.2*p);box.max.set(.3,Math.max(.3,(h-.3)*(1-p)+.52*p),.3+.7*p);const body=rayBox(o,d,box);
  if(head!==null&&head<max&&(body===null||head<=body))return {distance:head,head:true};if(body!==null&&body<max)return {distance:body,head:false};return null;
}
