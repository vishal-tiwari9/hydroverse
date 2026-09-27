'use client';
import React, { forwardRef, useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

useGLTF.preload('/models/boat.glb');

interface BoatProps {
  primary?: number;
  accent?: number;
  isPlayer?: boolean;
}

const BoatMesh = forwardRef<THREE.Group, BoatProps>(
  ({ accent = 0x00e8d8, isPlayer = false }, ref) => {
    const { scene } = useGLTF('/models/boat.glb');
    const texture = useTexture('/textures/Texture_35.png');

    const cloned = useMemo(() => {
      const clone = scene.clone(true);
      clone.rotation.y = Math.PI;
      clone.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.userData.isPlayerHull = isPlayer;
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
    }, [scene, texture, isPlayer]);

    return (
      <group ref={ref}>
        <primitive object={cloned} />
        {/* Engine glow */}
        <mesh position={[0, 0.1, 2.6]}>
          <boxGeometry args={[1.2, 0.35, 0.6]} />
          <meshBasicMaterial color={accent} />
        </mesh>
        {/* Accent stripe */}
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[2.3, 0.1, 5.6]} />
          <meshBasicMaterial color={accent} />
        </mesh>
        {/* Wake */}
        <mesh position={[0, 0.05, 3.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.8, 4]} />
          <meshBasicMaterial color={0x224466} transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }
);

BoatMesh.displayName = 'BoatMesh';
export default BoatMesh;
