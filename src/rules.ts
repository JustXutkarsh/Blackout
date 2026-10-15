import { CONFIG, type WeaponId } from './config';
export type PowerState = 'on' | 'warning' | 'blackout';
export function powerAt(elapsed: number): { state: PowerState; remaining: number } {
  const { on, warning, blackout } = CONFIG.power;
  const t = elapsed % (on + warning + blackout);
  return t < on ? { state: 'on', remaining: on - t } : t < on + warning ? { state: 'warning', remaining: on + warning - t } : { state: 'blackout', remaining: on + warning + blackout - t };
}
export class WeaponState {
  mag: number; reserve: number; cooldown = 0; reloadLeft = 0;
  constructor(public id: WeaponId) { this.mag = CONFIG.weapons[id].mag; this.reserve = CONFIG.weapons[id].reserve; }
  tick(dt: number) { this.cooldown = Math.max(0, this.cooldown - dt); if (this.reloadLeft > 0) { this.reloadLeft = Math.max(0, this.reloadLeft - dt); if (!this.reloadLeft) { const n = Math.min(CONFIG.weapons[this.id].mag - this.mag, this.reserve); this.mag += n; this.reserve -= n; } } }
  reload() { const c = CONFIG.weapons[this.id]; if (this.id === 'knife' || this.reloadLeft > 0 || this.mag === c.mag || !this.reserve) return false; this.reloadLeft = c.reload; return true; }
  fire() { if (this.cooldown > 1e-6 || this.reloadLeft > 0 || (this.id !== 'knife' && this.mag <= 0)) return false; this.cooldown = CONFIG.weapons[this.id].interval; if (this.id !== 'knife') this.mag--; return true; }
  cancelReload() { this.reloadLeft = 0; }
}
export type Score = { id: number; name: string; kills: number; deaths: number };
export function ranked(scores: Score[]) { return [...scores].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths).map((s, i, all) => ({ ...s, rank: 1 + all.filter(v => v.kills > s.kills || (v.kills === s.kills && v.deaths < s.deaths)).length, tied: all.some((v, j) => i !== j && v.kills === s.kills && v.deaths === s.deaths) })); }
export type Life = { health: number; dead: number; protection: number; kills: number; deaths: number };
export function damage(victim: Life, amount: number, attacker?: Life) {
  if (victim.health <= 0 || victim.protection > 0) return false;
  victim.health = Math.max(0, victim.health - amount);
  if (!victim.health) { victim.dead = CONFIG.respawnSeconds; victim.deaths++; if (attacker && attacker !== victim) attacker.kills++; return true; }
  return false;
}
export function endProtection(life: Life) { life.protection = 0; }
export function tickLife(life: Life, dt: number) { life.protection = Math.max(0, life.protection - dt); if (life.health <= 0) { life.dead = Math.max(0, life.dead - dt); return life.dead === 0; } return false; }
export function matchOver(elapsed: number) { return elapsed >= CONFIG.matchSeconds; }
