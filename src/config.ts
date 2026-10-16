export const CONFIG = {
  matchSeconds: 480, targetScore: 40, maxHealth: 100, respawnSeconds: 3, protectionSeconds: 2,
  reloadEvents: { remove: .2, insert: .68, bolt: .84 },
  healing: { delay: 5, perSecond: 5 },
  intel: { pingSeconds: 1.5, audibleRadius: 34 },
  render: { highDpr: 1.25, lowDpr: 1, highPixels: 1_800_000, lowPixels: 1_200_000 },
  view: { fov: 80, adsFov: 62, adsSensitivity: .6, adsSpeed: .62, transition: 12, switchSeconds: .24 },
  player: { radius: .32, height: 1.75, eye: 1.57, crouchHeight: 1.12, crouchEye: .98, crouchSpeed: .55, speed: 5.2, sprint: 8, jump: 7, gravity: 21, acceleration: 28, braking: 22 },
  stance: { crouchSeconds: .28, proneSeconds: .65, cooldown: .12, front: .82, rear: .85, radius: .28, supportTolerance: .1, headForward: .68, height: .55, eye: .38, speed: .24, spread: .65, crouchSpread: .8 },
  bots: { easy: { reaction: .65, spread: .09, sight: 35, speed: 3.2, aggression: .5 }, normal: { reaction: .38, spread: .052, sight: 40, speed: 3.7, aggression: .78 } },
  weapons: {
    rifle: { name: 'AK / 47', mag: 30, reserve: 120, damage: 25, head: 50, interval: .1, reload: 2.2, range: 100, spread: .006 },
    pistol: { name: 'M / 12', mag: 12, reserve: 60, damage: 20, head: 40, interval: .25, reload: 1.4, range: 70, spread: .002 },
    knife: { name: 'FIELD KNIFE', mag: 0, reserve: 0, damage: 50, head: 50, interval: .65, reload: 0, range: 2.2, spread: 0 },
  },
} as const;
export type WeaponId = keyof typeof CONFIG.weapons;
export type Difficulty = keyof typeof CONFIG.bots;
export type Settings = { sensitivity: number; volume: number; quality: 'low' | 'high'; reduced: boolean };
export const DEFAULT_SETTINGS: Settings = { sensitivity: 1, volume: .45, quality: 'high', reduced: false };
export function loadSettings(): Settings {
  try { const s = JSON.parse(localStorage.getItem('blackout.settings') || '{}'); return { sensitivity: Math.max(.2, Math.min(2.5, Number(s.sensitivity) || 1)), volume: typeof s.volume === 'number' ? Math.max(0, Math.min(1, s.volume)) : .45, quality: s.quality === 'low' ? 'low' : 'high', reduced: s.reduced === true }; } catch { return { ...DEFAULT_SETTINGS }; }
}
