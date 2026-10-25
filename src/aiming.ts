import {Vector3} from 'three';
import {CONFIG,type WeaponId} from './config';
import {eyePosition} from './stance';
import type {Actor} from './actors';
export class AdsIntent {
  held=false;toggled=false;
  get active(){return this.held||this.toggled;}
  toggle(repeat=false){if(!repeat)this.toggled=!this.toggled;}
  clear(){this.held=this.toggled=false;}
}
// Produces a sensitivity multiplier only. It never writes camera rotation or shot direction.
export class AimSlowdown {
  factor=1;target=-1;angle=Infinity;visible=false;private wait=0;private desired=1;
  private point=new Vector3();private direction=new Vector3();
  reset(){this.factor=this.desired=1;this.target=-1;this.angle=Infinity;this.visible=false;this.wait=0;}
  update(dt:number,enabled:boolean,ads:number,weapon:WeaponId,player:Actor,actors:Actor[],origin:Vector3,forward:Vector3,visible:(o:Vector3,d:Vector3,range:number,target:Actor)=>boolean){
    this.wait-=dt;
    if(!enabled||ads<.85||weapon==='knife'||player.health<=0){this.desired=1;this.target=-1;this.visible=false;this.angle=Infinity;this.wait=0;}
    else if(this.wait<=0){this.wait=CONFIG.aimAssist.querySeconds;let best=Infinity,target=-1;this.visible=false;
      for(const a of actors){if(a===player||a.team===player.team||a.health<=0||a.protection>0)continue;
        for(let region=0;region<2;region++){eyePosition(a,this.point);if(region)this.point.y-=a.prone?.1:a.height*.22;this.direction.copy(this.point).sub(origin);const distance=this.direction.length();if(distance<.6||distance>CONFIG.aimAssist.range)continue;this.direction.divideScalar(distance);const angle=Math.acos(Math.max(-1,Math.min(1,forward.dot(this.direction))));if(angle>CONFIG.aimAssist.cone||angle>=best)continue;if(visible(origin,this.direction,distance,a)){best=angle;target=a.id;}}
      }
      this.target=target;this.angle=best;this.visible=target>=0;this.desired=target<0?1:1-CONFIG.aimAssist.reduction*(1-best/CONFIG.aimAssist.cone)**2;
    }
    this.factor+=(this.desired-this.factor)*(1-Math.exp(-CONFIG.aimAssist.smoothing*Math.max(0,dt)));return this.factor;
  }
}
