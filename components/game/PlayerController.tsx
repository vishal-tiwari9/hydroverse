'use client';
import React, { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { WEAPONS } from '@/lib/weapons';
import { createProjectile, Projectile } from '@/lib/projectiles';
import { SFX } from '@/lib/sfx';

const BOAT_SPEED      = 55;
const BOOST_MULT      = 1.8;
const TURN_SPEED      = 1.6;
const DRAG            = 0.92;
const RESPAWN_TIME    = 5;

interface PlayerControllerProps {
  boatRef: React.RefObject<THREE.Group>;
  projectiles: React.MutableRefObject<Projectile[]>;
  onPositionUpdate: (pos: { x: number; z: number }) => void;
  keys: React.MutableRefObject<Record<string, boolean>>;
  onShoot?: (
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    weaponId: string,
    damage: number,
    speed: number
  ) => void;
}

export default function PlayerController({ boatRef, projectiles, onPositionUpdate, keys, onShoot }: PlayerControllerProps) {
  const { camera } = useThree();
  const { player, setPlayer, settings, addKill } = useGameStore();
  const WEAPON_BOOST_DMG  = 1.75;
  const WEAPON_BOOST_RATE = 1.5;
  const { scene } = useThree();

  const speedRef      = useRef(0);
  const weaponIdx     = useRef(0);
  const fireTimer     = useRef(0);
  const weaponHeat    = useRef(0);
  const overheated    = useRef(false);
  const respawnTimer  = useRef(0);
  const mouseDown     = useRef(false);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { mouseDown.current = e.button === 0; };
    const onUp   = () => { mouseDown.current = false; };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('mouseup', onUp); };
  }, []);

  useFrame((_, dt) => {
    if (!boatRef.current) return;
    const boat = boatRef.current;
    const k = keys.current;
    const pl = player;

    // ── Respawn ────────────────────────────────────────────────
    if (pl.dead) {
      respawnTimer.current -= dt;
      if (respawnTimer.current <= 0) {
        const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 60;
        boat.position.set(Math.cos(a) * r, 0.25, Math.sin(a) * r);
        boat.visible = true;
        setPlayer({ dead: false, health: 100, ammo: 100, boost: 100 });
        addKill('⚓ Vessel repaired — back in action', 'gold');
      }
      return;
    }

    // ── Throttle ───────────────────────────────────────────────
    const boosting = (k['ShiftLeft'] || k['ShiftRight']) && pl.boost > 0;
    const mult = boosting ? BOOST_MULT : 1;
    if (k['KeyW'] || k['ArrowUp'])    speedRef.current += BOAT_SPEED * mult * dt;
    if (k['KeyS'] || k['ArrowDown'])  speedRef.current -= BOAT_SPEED * 0.6 * dt;
    speedRef.current *= DRAG;
    speedRef.current = THREE.MathUtils.clamp(speedRef.current, -4, BOAT_SPEED * mult);

    // ── Steer ──────────────────────────────────────────────────
    if (k['KeyA'] || k['ArrowLeft'])  boat.rotation.y += TURN_SPEED * dt;
    if (k['KeyD'] || k['ArrowRight']) boat.rotation.y -= TURN_SPEED * dt;

    // ── Move ───────────────────────────────────────────────────
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(boat.rotation);
    boat.position.addScaledVector(dir, speedRef.current * dt);
    boat.position.y = 0.25 + Math.sin(Date.now() * 0.001) * 0.05;

    // ── Boost drain ────────────────────────────────────────────
    if (boosting) {
      setPlayer({ boost: Math.max(0, pl.boost - 30 * dt) });
    } else if (pl.boost < 100) {
      setPlayer({ boost: Math.min(100, pl.boost + 10 * dt) });
    }

    // ── Camera follow ───────────────────────────────────────────
    const camOffset = new THREE.Vector3(0, 8, 16).applyEuler(new THREE.Euler(0, boat.rotation.y, 0));
    camera.position.lerp(boat.position.clone().add(camOffset), 0.1);
    camera.lookAt(boat.position.clone().add(new THREE.Vector3(0, 0.5, 0)));

    // ── Sync weapon index from store (powerups can switch weapon) ──
    // Must run BEFORE key input so a powerup switch is applied first,
    // then user input builds on top — prevents stale-store revert glitch.
    if (player.weaponIdx !== weaponIdx.current) {
      weaponIdx.current = player.weaponIdx;
    }

    // ── Weapon select ──────────────────────────────────────────
    if (k['KeyQ']) { k['KeyQ'] = false; weaponIdx.current = (weaponIdx.current - 1 + WEAPONS.length) % WEAPONS.length; SFX.shoot('machinegun'); }
    if (k['KeyE']) { k['KeyE'] = false; weaponIdx.current = (weaponIdx.current + 1) % WEAPONS.length; }
    setPlayer({ weaponIdx: weaponIdx.current, speed: speedRef.current });

    // ── Shoot ──────────────────────────────────────────────────
    fireTimer.current -= dt;
    const weapon = WEAPONS[weaponIdx.current];
    const shooting = mouseDown.current || k['Space'];
    const boostedRate = player.weaponBoost ? weapon.fireRate * WEAPON_BOOST_RATE : weapon.fireRate;
    if (shooting && fireTimer.current <= 0 && !overheated.current) {
      const fireInterval = 1 / boostedRate;
      fireTimer.current = fireInterval;

      if (weapon.ammoType === 'heat') {
        weaponHeat.current += 0.15;
        if (weaponHeat.current >= 1) { overheated.current = true; weaponHeat.current = 1; }
      }

      const muzzle = boat.position.clone().add(new THREE.Vector3(0, 0.5, -4).applyEuler(boat.rotation));
      const shootDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, boat.rotation.y, 0));
      const boostedWeapon = player.weaponBoost
        ? { ...weapon, damage: Math.round(weapon.damage * WEAPON_BOOST_DMG) }
        : weapon;
      const proj = createProjectile(scene, muzzle, shootDir, true, boostedWeapon);
      projectiles.current.push(proj);
      if (onShoot) onShoot(muzzle, shootDir, weapon.id, boostedWeapon.damage, boostedWeapon.projectileSpeed);
      SFX.shoot(weapon.id);
    }

    // Cool heat
    if (!shooting) {
      weaponHeat.current = Math.max(0, weaponHeat.current - 0.4 * dt);
      if (overheated.current && weaponHeat.current <= 0) overheated.current = false;
    }

    // ── Boundary — circular arena ──────────────────────────────
    const bx = boat.position.x, bz = boat.position.z;
    const br = Math.sqrt(bx * bx + bz * bz);
    if (br > 85) {
      boat.position.x = (bx / br) * 85;
      boat.position.z = (bz / br) * 85;
      speedRef.current *= 0.5; // dampen speed at wall
    }

    onPositionUpdate({ x: boat.position.x, z: boat.position.z });
    SFX.updateEngine(Math.abs(speedRef.current) / BOAT_SPEED, boosting);
  });

  return null;
}
