'use client';
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Constants ─────────────────────────────────────────────────
const EXPLOSION_PARTICLES = 80;
const SPREAD              = 18;   // world-units radius of burst
const LERP_FACTOR         = 20;   // higher = slower approach
const FADE_SPEED          = 0.015;
const SPAWN_CHANCE        = 20;   // 1-in-N chance per frame

interface FireworkData {
  phase     : 'launch' | 'explode';
  points    : THREE.Points;
  geometry  : THREE.BufferGeometry;
  material  : THREE.PointsMaterial;
  positions : Float32Array;
  dest      : THREE.Vector3[];
  done      : boolean;
}

// ── Helpers ───────────────────────────────────────────────────

function makeMaterial(size: number, opacity = 1): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    size,
    vertexColors : true,
    transparent  : true,
    opacity,
    depthTest    : false,
    sizeAttenuation: true,
  });
}

function spawnLaunch(scene: THREE.Scene): FireworkData {
  const x = THREE.MathUtils.randFloatSpread(160);
  const y = THREE.MathUtils.randFloat(28, 65);
  const z = THREE.MathUtils.randFloatSpread(160);

  const fromY = -8;
  const positions = new Float32Array([x, fromY, z]);
  const dest      = [new THREE.Vector3(x, y, z)];

  const hue   = THREE.MathUtils.randFloat(0.1, 0.9);
  const color = new THREE.Color().setHSL(hue, 1, 0.9);
  const colors = new Float32Array([color.r, color.g, color.b]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

  const material = makeMaterial(0.5);
  const points   = new THREE.Points(geometry, material);
  scene.add(points);

  return { phase: 'launch', points, geometry, material, positions, dest, done: false };
}

function triggerExplode(fw: FireworkData, scene: THREE.Scene, origin: THREE.Vector3) {
  scene.remove(fw.points);
  fw.geometry.dispose();
  fw.material.dispose();

  const N         = EXPLOSION_PARTICLES;
  const positions = new Float32Array(N * 3);
  const colors    = new Float32Array(N * 3);
  const dest: THREE.Vector3[] = [];

  for (let i = 0; i < N; i++) {
    positions[i * 3]     = origin.x + THREE.MathUtils.randFloatSpread(1);
    positions[i * 3 + 1] = origin.y + THREE.MathUtils.randFloatSpread(1);
    positions[i * 3 + 2] = origin.z + THREE.MathUtils.randFloatSpread(1);

    const hue = THREE.MathUtils.randFloat(0, 1);
    const c   = new THREE.Color().setHSL(hue, 1, 0.6);
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    dest.push(new THREE.Vector3(
      origin.x + THREE.MathUtils.randFloatSpread(SPREAD * 2),
      origin.y + THREE.MathUtils.randFloatSpread(SPREAD * 2),
      origin.z + THREE.MathUtils.randFloatSpread(SPREAD * 2),
    ));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

  const material = makeMaterial(0.38);
  const points   = new THREE.Points(geometry, material);
  scene.add(points);

  fw.phase     = 'explode';
  fw.points    = points;
  fw.geometry  = geometry;
  fw.material  = material;
  fw.positions = positions;
  fw.dest      = dest;
}

// ── Component ─────────────────────────────────────────────────

export default function FireworksSystem() {
  const { scene }   = useThree();
  const fireworks   = useRef<FireworkData[]>([]);

  // cleanup all particles when unmounted
  useEffect(() => {
    return () => {
      fireworks.current.forEach(fw => {
        scene.remove(fw.points);
        fw.geometry.dispose();
        fw.material.dispose();
      });
      fireworks.current = [];
    };
  }, [scene]);

  useFrame(() => {
    // randomly spawn a new rocket
    if (THREE.MathUtils.randInt(1, SPAWN_CHANCE) === 1) {
      fireworks.current.push(spawnLaunch(scene));
    }

    // update all active fireworks (iterate backwards for safe splice)
    for (let i = fireworks.current.length - 1; i >= 0; i--) {
      const fw  = fireworks.current[i];
      const pos = fw.positions;
      const N   = fw.dest.length;

      // lerp every particle toward its destination
      for (let j = 0; j < N; j++) {
        pos[j * 3]     += (fw.dest[j].x - pos[j * 3])     / LERP_FACTOR;
        pos[j * 3 + 1] += (fw.dest[j].y - pos[j * 3 + 1]) / LERP_FACTOR;
        pos[j * 3 + 2] += (fw.dest[j].z - pos[j * 3 + 2]) / LERP_FACTOR;
      }
      fw.geometry.attributes.position.needsUpdate = true;

      if (fw.phase === 'launch') {
        // trigger explosion once rocket is within 0.6 units of its apex
        if (Math.abs(fw.dest[0].y - pos[1]) < 0.6) {
          triggerExplode(fw, scene, new THREE.Vector3(pos[0], pos[1], pos[2]));
        }
      } else {
        fw.material.opacity -= FADE_SPEED;
        if (fw.material.opacity <= 0) {
          scene.remove(fw.points);
          fw.geometry.dispose();
          fw.material.dispose();
          fireworks.current.splice(i, 1);
        }
      }
    }
  });

  return null;
}
