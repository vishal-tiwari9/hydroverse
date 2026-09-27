export type PowerupType =
  | 'health'
  | 'shield'
  | 'weaponUpgrade'
  | 'special'
  | 'homing'
  | 'remoteBomb'
  | 'freeze'
  | 'powerMissile';

export interface PowerupDef {
  type: PowerupType;
  label: string;
  icon: string;
  color: number;      // Three.js hex
  cssColor: string;   // CSS color for HUD
  duration?: number;  // seconds; undefined = instant
  weaponId?: string;  // switches player to this weapon on pickup
}

export const POWERUP_DEFS: Record<PowerupType, PowerupDef> = {
  health:        { type: 'health',        label: 'REPAIR KIT',    icon: '❤️',  color: 0x00ff66, cssColor: '#00ff66' },
  shield:        { type: 'shield',        label: 'SHIELD',         icon: '🛡️',  color: 0x00aaff, cssColor: '#00aaff', duration: 8 },
  weaponUpgrade: { type: 'weaponUpgrade', label: 'WEAPON BOOST',   icon: '⚡',  color: 0xffcc00, cssColor: '#ffcc00', duration: 15 },
  special:       { type: 'special',       label: 'SPECIAL CHARGE', icon: '💫',  color: 0xff66ff, cssColor: '#ff66ff', weaponId: 'power' },
  homing:        { type: 'homing',        label: 'TRACKER AMMO',   icon: '🎯',  color: 0xff4400, cssColor: '#ff7744', weaponId: 'homing' },
  remoteBomb:    { type: 'remoteBomb',    label: 'REMOTE BOMBS',   icon: '💣',  color: 0xff6600, cssColor: '#ff9900', weaponId: 'remotebomb' },
  freeze:        { type: 'freeze',        label: 'CRYO ROUNDS',    icon: '❄️',  color: 0x88ddff, cssColor: '#88ddff', weaponId: 'freeze' },
  powerMissile:  { type: 'powerMissile',  label: 'SHOCKWAVE',      icon: '💥',  color: 0xff3300, cssColor: '#ff5533', weaponId: 'power' },
};

export const ALL_POWERUP_TYPES = Object.keys(POWERUP_DEFS) as PowerupType[];

export interface PowerupInstance {
  id: number;
  type: PowerupType;
  x: number;
  z: number;
  collected: boolean;
  spawnAge: number; // seconds since spawn (for bob animation phase offset)
}

let _pid = 0;

export function spawnPowerup(existingPositions: { x: number; z: number }[]): PowerupInstance {
  // Pick a random type (health/shield/boost more common)
  const weighted: PowerupType[] = [
    'health', 'health', 'health',
    'shield', 'shield',
    'weaponUpgrade', 'weaponUpgrade',
    'homing', 'freeze', 'powerMissile', 'remoteBomb', 'special',
  ];
  const type = weighted[Math.floor(Math.random() * weighted.length)];

  // Random position avoiding clustering
  let x = 0, z = 0, attempts = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 90;
    x = Math.cos(angle) * radius;
    z = Math.sin(angle) * radius;
    attempts++;
  } while (
    attempts < 20 &&
    existingPositions.some((p) => Math.hypot(p.x - x, p.z - z) < 14)
  );

  return { id: _pid++, type, x, z, collected: false, spawnAge: Math.random() * Math.PI * 2 };
}
