import { CONFIG, type WeaponId } from './config';
export class WeaponState {
  mag:number; reserve:number; cooldown=0; reloadLeft=0; reloadEmpty=false; transferred=false;autoWait=0;
  constructor(public id:WeaponId){this.mag=CONFIG.weapons[id].mag;this.reserve=CONFIG.weapons[id].reserve;}
  get progress(){return this.reloadLeft>0?1-this.reloadLeft/CONFIG.weapons[this.id].reload:0;}
  tick(dt:number){
    this.cooldown=Math.max(0,this.cooldown-dt);if(this.reloadLeft<=0)return 0;
    const before=this.progress;this.reloadLeft=Math.max(0,this.reloadLeft-dt);const after=this.reloadLeft>0?this.progress:1;let events=0;
    if(before<CONFIG.reloadEvents.remove&&after>=CONFIG.reloadEvents.remove)events|=1;
    if(!this.transferred&&after>=CONFIG.reloadEvents.insert){const n=Math.min(CONFIG.weapons[this.id].mag-this.mag,this.reserve);this.mag+=n;this.reserve-=n;this.transferred=true;events|=2;}
    if(this.reloadEmpty&&before<CONFIG.reloadEvents.bolt&&after>=CONFIG.reloadEvents.bolt)events|=4;
    return events;
  }
  reload(){const c=CONFIG.weapons[this.id];if(this.id==='knife'||this.reloadLeft>0||this.mag===c.mag||!this.reserve)return false;this.autoWait=0;this.reloadEmpty=this.mag===0;this.transferred=false;this.reloadLeft=c.reload;return true;}
  automaticReload(dt:number,enabled:boolean,ready:boolean,sprinting=false){if(!enabled||!ready||this.id==='knife'||this.mag>0||this.reserve<=0||this.reloadLeft>0){this.autoWait=0;return false;}if(sprinting&&this.autoWait===0)this.autoWait=CONFIG.animation.sprintExit;if(this.autoWait>0){this.autoWait=Math.max(0,this.autoWait-dt);if(this.autoWait>1e-6)return false;}return this.reload();}
  fire(){if(this.cooldown>1e-6||this.reloadLeft>0||(this.id!=='knife'&&this.mag<=0))return false;this.cooldown=CONFIG.weapons[this.id].interval;if(this.id!=='knife')this.mag--;return true;}
  cancelReload(){this.reloadLeft=this.autoWait=0;}
}
export type Team='blue'|'orange';
export type Life={health:number;dead:number;protection:number;kills:number;deaths:number;team:Team;sinceDamage:number};
export type Score={id:number;name:string;kills:number;deaths:number;team:Team;health:number};
export function damage(victim:Life,amount:number,attacker?:Life){
  if(victim.health<=0||victim.protection>0||amount<=0||(attacker&&attacker!==victim&&attacker.team===victim.team))return false;
  victim.sinceDamage=0;victim.health=Math.max(0,victim.health-amount);
  if(!victim.health){victim.dead=CONFIG.respawnSeconds;victim.deaths++;if(attacker&&attacker!==victim&&attacker.team!==victim.team)attacker.kills++;return true;}return false;
}
export function endProtection(life:Life){life.protection=0;}
export function tickLife(life:Life,dt:number){
  life.protection=Math.max(0,life.protection-dt);
  if(life.health<=0){life.dead=Math.max(0,life.dead-dt);return life.dead===0;}
  const before=life.sinceDamage;life.sinceDamage+=dt;
  const healingTime=Math.max(0,life.sinceDamage-CONFIG.healing.delay)-Math.max(0,before-CONFIG.healing.delay);
  life.health=Math.min(CONFIG.maxHealth,life.health+healingTime*CONFIG.healing.perSecond);return false;
}
export function teamScores(actors:Pick<Score,'team'|'kills'>[]){const s={blue:0,orange:0};for(const a of actors)s[a.team]+=a.kills;return s;}
export function aliveCounts(actors:Pick<Score,'team'|'health'>[]){const s={blue:0,orange:0};for(const a of actors)if(a.health>0)s[a.team]++;return s;}
export type Outcome=Team|'draw';
export function matchResult(elapsed:number,scores:{blue:number;orange:number}):Outcome|null{if(elapsed<CONFIG.matchSeconds&&Math.max(scores.blue,scores.orange)<CONFIG.targetScore)return null;return scores.blue===scores.orange?'draw':scores.blue>scores.orange?'blue':'orange';}
export function ranked(scores:Score[]){return [...scores].sort((a,b)=>b.kills-a.kills||a.deaths-b.deaths);}
