'use client';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { skyVertexShader, skyFragmentShader } from '@/shaders/skyShader';

export default function SkyDome() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  }), []);

  return (
    <mesh>
      <sphereGeometry args={[480, 32, 16]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}
