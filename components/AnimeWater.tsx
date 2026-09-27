'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { waterVertexShader, waterFragmentShader } from '@/shaders/waterShader';

interface WaterProps {
  size?: number;
  ripples?: { x: number; z: number; age: number }[];
}

export default function AnimeWater({ size = 900, ripples = [] }: WaterProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    uTime:           { value: 0 },
    uColorDeep:      { value: new THREE.Color(0x001a4d) },
    uColorMid:       { value: new THREE.Color(0x0055aa) },
    uColorHighlight: { value: new THREE.Color(0x4499ff) },
    uColorFoam:      { value: new THREE.Color(0xaad4ff) },
    uScale:          { value: 18.0 },
    uSpeed:          { value: 1.0 },
    uRipples:        { value: Array(8).fill(null).map(() => new THREE.Vector3(0, 0, 1)) },
    uRippleCount:    { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime();

    // Update ripples from prop
    const count = Math.min(ripples.length, 8);
    for (let i = 0; i < 8; i++) {
      if (i < count) {
        uniforms.uRipples.value[i].set(ripples[i].x, ripples[i].z, ripples[i].age);
      } else {
        uniforms.uRipples.value[i].set(0, 0, 1);
      }
    }
    uniforms.uRippleCount.value = count;
  });

  return (
    <>
      {/* Seabed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color={0x000d26} />
      </mesh>

      {/* Animated water surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[size, size, 1, 1]} />
        <shaderMaterial
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.FrontSide}
        />
      </mesh>
    </>
  );
}
