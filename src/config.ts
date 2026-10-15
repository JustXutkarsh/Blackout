export const CONFIG = {
  matchSeconds: 300, respawnSeconds: 3, protectionSeconds: 2,
  power: { on: 60, warning: 5, blackout: 20 },
  player: { radius: .32, height: 1.75, eye: 1.57, speed: 5.2, sprint: 8, jump: 7, gravity: 21, acceleration: 28, braking: 22 },
  scanner: { cooldown: 20, duration: 1.5, radius: 30 },
  bots: { easy: { reaction: .65, spread: .095, sight: 30, speed: 3.1 }, normal: { reaction: .38, spread: .06, sight: 37, speed: 3.7 } },
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
