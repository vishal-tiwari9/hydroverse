'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { remotePlayerColor, PlayerCustomization } from '@/lib/multiplayer';

interface RemotePlayerProps {
  id: string;
  x: number;
  z: number;
  ry: number;
  health: number;
  dead: boolean;
  name: string;
  customization?: PlayerCustomization;
}

export default function RemotePlayer({ id, x, z, ry, dead, name, customization }: RemotePlayerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Track interpolation targets via ref to avoid stale closures
  const target = useRef({ x, z, ry });
  target.current = { x, z, ry };

  const [primary, accent] = remotePlayerColor(id);
  const finalAccent = customization?.neonColor ?? accent;
  const glowIntensity = customization?.glowIntensity ?? 1.5;
  const finalPrimary = customization?.primaryColor ?? primary;

  const { scene } = useGLTF('/models/boat.glb');
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.rotation.y = Math.PI;
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const applyColor = (mat: THREE.Material) => {
          const c = mat.clone() as THREE.MeshStandardMaterial;
          c.map = null;
          c.color.setHex(finalPrimary);
          c.needsUpdate = true;
          return c;
        };
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(applyColor)
          : applyColor(obj.material);
      }
    });
    return clone;
  }, [scene, finalPrimary]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;

    const alpha = Math.min(1, dt * 12);
    g.position.x = THREE.MathUtils.lerp(g.position.x, target.current.x, alpha);
    g.position.z = THREE.MathUtils.lerp(g.position.z, target.current.z, alpha);
    g.position.y = 0.25 + Math.sin(Date.now() * 0.001) * 0.05;

    // Shortest-path rotation lerp
    let diff = target.current.ry - g.rotation.y;
    while (diff > Math.PI)  diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.rotation.y += diff * alpha;

    g.visible = !dead;
  });

  return (
    <group ref={groupRef} position={[x, 0.25, z]}>
      <primitive object={cloned} />
      {/* Accent stripe overlay */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[2.3, 0.1, 5.6]} />
        <meshBasicMaterial color={finalAccent} />
      </mesh>
      {/* Point light marker */}
      <pointLight color={finalAccent} intensity={glowIntensity} distance={6} position={[0, -0.5, 0]} />

      {/* Enemy label */}
      {!dead && (
        <Html center distanceFactor={18} position={[0, 5.2, 0]}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            pointerEvents: 'none', userSelect: 'none',
          }}>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 28, fontWeight: 700, letterSpacing: 5,
              color: '#ff3355',
              background: 'rgba(0,0,0,0.75)',
              border: '1px solid rgba(255,50,80,0.7)',
              padding: '5px 18px',
              whiteSpace: 'nowrap',
              textShadow: '0 0 12px rgba(255,50,80,0.9)',
              clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)',
            }}>
              {name}
            </div>
            <div style={{
              fontSize: 14, letterSpacing: 4,
              color: '#ff3355',
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,50,80,0.4)',
              borderTop: 'none',
              padding: '2px 14px',
              whiteSpace: 'nowrap',
            }}>
              ENEMY
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
