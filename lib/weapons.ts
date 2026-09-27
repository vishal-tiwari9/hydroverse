export interface Weapon {
  id: string;
  name: string;
  icon: string;
  damage: number;
  fireRate: number; // shots/sec
  ammoType: 'heat' | 'limited' | 'unlimited';
  maxAmmo?: number;
  projectileSpeed: number;
  homing?: boolean;
  freeze?: boolean;
  isGas?: boolean;
  bounce?: number;
  burstCount?: number;
}

export const WEAPONS: Weapon[] = [
  { id: 'machinegun', name: 'RAILGUN',      icon: '⚡', damage: 18, fireRate: 8,   ammoType: 'heat',    projectileSpeed: 55, maxAmmo: 100 },
  { id: 'homing',     name: 'TRACKER',      icon: '🎯', damage: 32, fireRate: 1.2, ammoType: 'limited', projectileSpeed: 28, maxAmmo: 8,  homing: true },
  { id: 'freeze',     name: 'CRYO',         icon: '❄️', damage: 12, fireRate: 1.5, ammoType: 'limited', projectileSpeed: 35, maxAmmo: 12, freeze: true },
  { id: 'power',      name: 'SHOCKWAVE',    icon: '💥', damage: 55, fireRate: 0.5, ammoType: 'limited', projectileSpeed: 40, maxAmmo: 4 },
  { id: 'gascan',     name: 'NAPALM',       icon: '🔥', damage: 45, fireRate: 0.8, ammoType: 'limited', projectileSpeed: 22, maxAmmo: 6,  isGas: true },
  { id: 'rico',       name: 'RICOCHET',     icon: '🔮', damage: 22, fireRate: 2.5, ammoType: 'limited', projectileSpeed: 45, maxAmmo: 16, bounce: 3 },
  { id: 'zoomy',      name: 'BURST',        icon: '🚀', damage: 28, fireRate: 3,   ammoType: 'limited', projectileSpeed: 60, maxAmmo: 24, burstCount: 3 },
  { id: 'remotebomb', name: 'REMOTE BOMB',  icon: '💣', damage: 80, fireRate: 0.4, ammoType: 'limited', projectileSpeed: 8,  maxAmmo: 3 },
];
