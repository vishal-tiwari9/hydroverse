'use client';
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { NPC_DEFS } from './NpcBoats';

const WALK_SPEED = 8;
const TURN_SPEED = 2.5;
const INTERACT_RADIUS = 8;

export interface PlayerAvatarHandle {
  position: THREE.Vector3;
  nearestNpc: string | null;
}

interface PlayerAvatarProps {
  onNearNpc: (id: string | null) => void;
  keys: React.MutableRefObject<Record<string, boolean>>;
}

export default function PlayerAvatar({ onNearNpc, keys }: PlayerAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cameraYaw = useRef(0);
  const nearRef = useRef<string | null>(null);
  const { camera } = useThree();
  const { playerCustomization } = useGameStore();

  const accentColor = playerCustomization?.neonColor ?? 0x00e8d8;
  const { scene } = useGLTF('/models/boat.glb');
  const texture = useTexture('/textures/Texture_35.png');
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.rotation.y = Math.PI;
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const applyTexture = (mat: THREE.Material) => {
          const c = mat.clone() as THREE.MeshStandardMaterial;
          c.map = texture;
          c.color.set(0xffffff);
          c.needsUpdate = true;
          return c;
        };
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(applyTexture)
          : applyTexture(obj.material);
      }
    });
    return clone;
  }, [scene, texture]);

  useFrame(({ clock }, dt) => {
    if (!groupRef.current) return;
    const k = keys.current;
    const pos = groupRef.current.position;
    const rot = groupRef.current.rotation;

    // Turn left/right
    if (k['KeyA'] || k['ArrowLeft'])  rot.y += TURN_SPEED * dt;
    if (k['KeyD'] || k['ArrowRight']) rot.y -= TURN_SPEED * dt;

    // Move forward/back
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, rot.y, 0));
    if (k['KeyW'] || k['ArrowUp'])   pos.addScaledVector(dir, WALK_SPEED * dt);
    if (k['KeyS'] || k['ArrowDown']) pos.addScaledVector(dir, -WALK_SPEED * dt);

    // Clamp to arena
    pos.x = THREE.MathUtils.clamp(pos.x, -100, 100);
    pos.z = THREE.MathUtils.clamp(pos.z, -100, 30);
    pos.y = 0;

    // Bob while moving
    const moving = k['KeyW'] || k['KeyS'] || k['ArrowUp'] || k['ArrowDown'];
    if (moving) pos.y = Math.sin(clock.getElapsedTime() * 10) * 0.08;

    // Camera follow — 3rd person behind boat
    const camOffset = new THREE.Vector3(0, 10, 18).applyEuler(new THREE.Euler(0, rot.y, 0));
    camera.position.lerp(pos.clone().add(camOffset), 0.08);
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 1, 0)));

    // Check NPC proximity
    let nearest: string | null = null;
    let nearestDist = Infinity;
    NPC_DEFS.forEach((npc) => {
      const d = pos.distanceTo(new THREE.Vector3(...npc.position));
      if (d < INTERACT_RADIUS && d < nearestDist) {
        nearestDist = d;
        nearest = npc.id;
      }
    });
    if (nearest !== nearRef.current) {
      nearRef.current = nearest;
      onNearNpc(nearest);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 20]}>
      <primitive object={cloned} />
      {/* Accent stripe overlay */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[2.3, 0.1, 5.6]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Player indicator light */}
      <pointLight
        color={accentColor}
        intensity={(playerCustomization?.glowIntensity ?? 0) > 0 ? playerCustomization.glowIntensity : 2}
        distance={8} position={[0, -0.5, 0]}
      />
    </group>
  );
}
