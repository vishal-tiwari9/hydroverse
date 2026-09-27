'use client';
import React, { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

const MODEL_PATH = '/models/tropical_palm_tree.glb';

// ── Custom GLTF model ─────────────────────────────────────────
function PalmModel({ position, scale }: { position: [number, number, number]; scale: number }) {
  const { scene } = useGLTF(MODEL_PATH);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
        mesh.castShadow = true;
      }
    });
    return c;
  }, [scene]);

  return <primitive object={clone} position={position} scale={scale} />;
}

// Preload so the first tree doesn't stall the frame
useGLTF.preload(MODEL_PATH);

interface PalmProps {
  position: [number, number, number];
  height?: number;
}

// ── Fallback procedural tree (shown while model loads) ────────
function PalmFallback({ position, height = 8 }: PalmProps) {
  const lightColors = [0xffee00, 0xff3366, 0x33ffcc, 0xff8800, 0xffffff, 0xff44aa, 0x44ffff, 0xffcc00];
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.2, 0.35, height, 6]} />
        <meshLambertMaterial color={0x8B5E2A} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(angle) * 1.2, height + 0.5, Math.cos(angle) * 1.2]} rotation={[0, angle, 0.7]}>
            <planeGeometry args={[0.6, 3.5]} />
            <meshBasicMaterial color={0x2d8a2d} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
      {lightColors.map((color, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.8, height - 0.5 + Math.sin(i) * 0.5, Math.sin(a) * 1.8]}>
            <sphereGeometry args={[0.12, 4, 4]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Public PalmTree: tries model, falls back to procedural ────
export function PalmTree({ position, height = 8 }: PalmProps) {
  // scale maps the model to roughly the same visual size as the procedural tree
  // Adjust MODEL_SCALE if your model is too large or too small
  const MODEL_SCALE = 0.0065;

  return (
    <Suspense fallback={<PalmFallback position={position} height={height} />}>
      <PalmModel position={position} scale={MODEL_SCALE} />
    </Suspense>
  );
}

export function PalmRing({ count = 24, radius = 160 }: { count?: number; radius?: number }) {
  const palms = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const r = radius + (Math.random() * 30 - 15);
    return {
      position: [Math.cos(angle) * r, 0, Math.sin(angle) * r] as [number, number, number],
      height: 6 + Math.random() * 5,
    };
  }), [count, radius]);

  return (
    <>
      {palms.map((p, i) => <PalmTree key={i} position={p.position} height={p.height} />)}
    </>
  );
}
