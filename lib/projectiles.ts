import * as THREE from 'three';

export interface Projectile {
  id: number;
  mesh: THREE.Mesh;
  dir: THREE.Vector3;
  speed: number;
  life: number;
  alive: boolean;
  isPlayer: boolean;
  shooterId?: string; // 'player' or AI boat id
  damage: number;
  homing?: boolean;
  freeze?: boolean;
  isGas?: boolean;
  bounceCount?: number;
  maxBounce?: number;
  trackStrength?: number;
}

let _pid = 0;

export function createProjectile(
  scene: THREE.Scene,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  isPlayer: boolean,
  weapon: { damage: number; projectileSpeed: number; homing?: boolean; freeze?: boolean; isGas?: boolean; bounce?: number },
  shooterId?: string,
): Projectile {
  let geo: THREE.BufferGeometry;
  let mat: THREE.Material;

  if (weapon.isGas) {
    geo = new THREE.SphereGeometry(0.5, 6, 6);
    mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 });
  } else if (weapon.homing) {
    geo = new THREE.ConeGeometry(0.18, 0.9, 5);
    mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
  } else if (weapon.freeze) {
    geo = new THREE.SphereGeometry(0.22, 6, 6);
    mat = new THREE.MeshBasicMaterial({ color: 0x88ddff });
  } else {
    geo = new THREE.SphereGeometry(0.18, 4, 4);
    mat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0x00e8d8 : 0xff4422 });
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(origin);
  scene.add(mesh);

  return {
    id: _pid++,
    mesh,
    dir: dir.normalize().clone(),
    speed: weapon.projectileSpeed,
    life: weapon.isGas ? 3 : 2.5,
    alive: true,
    isPlayer,
    shooterId,
    damage: weapon.damage,
    homing: weapon.homing,
    freeze: weapon.freeze,
    isGas: weapon.isGas,
    bounceCount: 0,
    maxBounce: weapon.bounce || 0,
    trackStrength: 0.04,
  };
}

export function updateProjectiles(
  projectiles: Projectile[],
  scene: THREE.Scene,
  dt: number
): void {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.alive) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }
    p.mesh.position.addScaledVector(p.dir, p.speed * dt);
    p.life -= dt;
    if (p.life <= 0) { p.alive = false; }
  }
}

export function spawnExplosion(
  scene: THREE.Scene,
  pos: THREE.Vector3,
  count: number,
  color: number
): void {
  for (let i = 0; i < Math.min(count, 20); i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.15 + Math.random() * 0.25, 4, 4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
    );
    mesh.position.copy(pos);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      Math.random() * 8,
      (Math.random() - 0.5) * 12
    );
    scene.add(mesh);
    // Animate and clean up
    let life = 0.6 + Math.random() * 0.4;
    const maxLife = life;
    const tick = () => {
      life -= 0.016;
      if (life <= 0) { scene.remove(mesh); return; }
      mesh.position.addScaledVector(vel, 0.016);
      vel.y -= 9.8 * 0.016;
      (mesh.material as THREE.MeshBasicMaterial).opacity = life / maxLife;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
