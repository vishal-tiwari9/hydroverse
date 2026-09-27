'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import {
  PowerupInstance,
  PowerupDef,
  POWERUP_DEFS,
  spawnPowerup,
} from '@/lib/powerups';
import { WEAPONS } from '@/lib/weapons';

const MAX_POWERUPS = 6;
const SPAWN_INTERVAL = 12; // seconds
const COLLECT_RADIUS = 4;

interface PowerupOrbProps {
  instance: PowerupInstance;
  def: PowerupDef;
}

function PowerupOrb({ instance, def }: PowerupOrbProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime + instance.spawnAge;
    g.position.y = 0.8 + Math.sin(t * 1.8) * 0.3;
    g.rotation.y = t * 1.2;
  });

  const color = def.color;

  return (
    <group ref={groupRef} position={[instance.x, 0.8, instance.z]}>
      {/* Outer glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.08, 8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      {/* Core orb */}
      <mesh>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {/* Inner bright core */}
      <mesh>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshBasicMaterial color={0xffffff} transparent opacity={0.8} />
      </mesh>
      {/* Point light */}
      <pointLight color={color} intensity={2} distance={5} />
      {/* Label */}
      <Html center distanceFactor={10} position={[0, 1.4, 0]}>
        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 13,
          letterSpacing: 2,
          fontWeight: 700,
          color: def.cssColor,
          background: 'rgba(0,0,0,0.75)',
          border: `1px solid ${def.cssColor}88`,
          padding: '2px 8px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          textShadow: `0 0 6px ${def.cssColor}`,
        }}>
          {def.icon} {def.label}
        </div>
      </Html>
    </group>
  );
}

interface PowerupManagerProps {
  /** Ref to a group/mesh representing the player boat — used for distance checks */
  playerRef: React.RefObject<THREE.Object3D>;
}

export default function PowerupManager({ playerRef }: PowerupManagerProps) {
  const [powerups, setPowerups] = useState<PowerupInstance[]>([]);
  const spawnTimer = useRef(SPAWN_INTERVAL * 0.5); // first spawn at half interval
  const { matchRunning, setPlayer, player, addActivePowerup, tickPowerups } = useGameStore();

  // Tick expired powerups every second
  useEffect(() => {
    const id = setInterval(tickPowerups, 1000);
    return () => clearInterval(id);
  }, [tickPowerups]);

  const collectPowerup = useCallback((inst: PowerupInstance) => {
    const def = POWERUP_DEFS[inst.type];

    if (inst.type === 'health') {
      setPlayer({ health: Math.min(100, player.health + 40) });
    } else if (def.duration) {
      addActivePowerup({
        type: inst.type,
        expiresAt: Date.now() + def.duration * 1000,
        label: def.label,
        icon: def.icon,
        cssColor: def.cssColor,
      });
    }

    // Switch weapon if the power-up provides one
    if (def.weaponId) {
      const idx = WEAPONS.findIndex((w) => w.id === def.weaponId);
      if (idx !== -1) {
        const weapon = WEAPONS[idx];
        setPlayer({
          weaponIdx: idx,
          ammo: weapon.maxAmmo ?? 100,
        });
      }
    }

    // Mark collected
    setPowerups((prev) => prev.filter((p) => p.id !== inst.id));

    // Show kill-feed style notification
    useGameStore.getState().addKill(`${def.icon} ${def.label} collected`, 'powerup');
  }, [player.health, setPlayer, addActivePowerup]);

  useFrame((_, dt) => {
    if (!matchRunning) return;

    // Spawn timer
    spawnTimer.current -= dt;
    if (spawnTimer.current <= 0 && powerups.length < MAX_POWERUPS) {
      spawnTimer.current = SPAWN_INTERVAL;
      setPowerups((prev) => {
        const positions = prev.map((p) => ({ x: p.x, z: p.z }));
        return [...prev, spawnPowerup(positions)];
      });
    }

    // Collect check
    const pObj = playerRef.current;
    if (!pObj || player.dead) return;
    const px = pObj.position.x;
    const pz = pObj.position.z;

    for (const inst of powerups) {
      const dist = Math.hypot(inst.x - px, inst.z - pz);
      if (dist < COLLECT_RADIUS) {
        collectPowerup(inst);
        break; // one per frame is fine
      }
    }
  });

  return (
    <>
      {powerups.map((inst) => (
        <PowerupOrb key={inst.id} instance={inst} def={POWERUP_DEFS[inst.type]} />
      ))}
    </>
  );
}
