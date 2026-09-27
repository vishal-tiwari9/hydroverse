'use client';
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface NpcDef {
  id: string;
  mode: string;
  position: [number, number, number];
  color: number;
  accentColor: number;
  label: string;
  subtitle: string;
  greeting: string[];
  flagColor: number;
  openOnline?: boolean; // opens OnlinePanel instead of launching a local match
  openGarage?: boolean; // opens the customization/upgrade menu
}

export const NPC_DEFS: NpcDef[] = [
  {
    id: 'ffa',
    mode: 'FFA',
    position: [0, 0, -18],
    color: 0xff3344,
    accentColor: 0xff8800,
    label: 'FREE FOR ALL',
    subtitle: 'EVERY BOAT FOR ITSELF',
    greeting: [
      'Every captain for themselves!',
      'Last one floating wins.',
      'No teams. Pure chaos.',
      'Think you can outlast everyone?',
    ],
    flagColor: 0xff3344,
  },
  {
    id: 'tdm',
    mode: 'TDM',
    position: [-22, 0, -8],
    color: 0x4488ff,
    accentColor: 0x00e8d8,
    label: 'TEAM DEATHMATCH',
    subtitle: 'RED FLEET vs BLUE FLEET',
    greeting: [
      'Choose your fleet wisely.',
      'Red versus Blue — classic rivalry.',
      'Teamwork wins the day.',
      'Your squad needs you, captain.',
    ],
    flagColor: 0x4488ff,
  },
  {
    id: 'pvp',
    mode: 'FFA',
    position: [16, 0, -16],
    color: 0xff5064,
    accentColor: 0xff2244,
    label: 'PLAY ONLINE',
    subtitle: 'PvP — REAL OPPONENTS',
    greeting: [
      'The open seas await, captain.',
      'No bots — only real opponents.',
      'Join a room or create your own.',
      'Prove yourself against the best.',
    ],
    flagColor: 0xff5064,
    openOnline: true,
  },
  {
    id: 'lbs',
    mode: 'LBS',
    position: [22, 0, -8],
    color: 0x44ee88,
    accentColor: 0xffcc00,
    label: 'LAST BOAT STANDING',
    subtitle: 'SURVIVE TO THE END',
    greeting: [
      'No respawns. No second chances.',
      'Once you sink, you\'re done.',
      'Outlast every vessel on the water.',
      'Only the last hull floating wins.',
    ],
    flagColor: 0x44ee88,
  },
  {
    id: 'garage',
    mode: 'GARAGE',
    position: [-18, 0, 18],
    color: 0xffcc00,
    accentColor: 0x222222,
    label: 'HYDRO-GARAGE',
    subtitle: 'UPGRADES & STYLE',
    greeting: [
      'Looking to spend some Hydro-tokens, captain?',
      'We can make her faster. Much faster.',
      'Style is just as important as speed.',
      'Time for some fresh neon and a turbo tune?',
    ],
    flagColor: 0xffcc00,
    openGarage: true,
  },
];

interface NpcBoatProps {
  npc: NpcDef;
  isNear: boolean;
}

export function NpcBoat({ npc, isNear }: NpcBoatProps) {
  const groupRef = useRef<THREE.Group>(null);
  const flagRef = useRef<THREE.Mesh>(null);

  const { scene } = useGLTF('/models/boat.glb');
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.rotation.y = Math.PI;
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const applyColor = (mat: THREE.Material) => {
          const c = mat.clone() as THREE.MeshStandardMaterial;
          c.map = null;
          c.color.setHex(npc.color);
          c.needsUpdate = true;
          return c;
        };
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(applyColor)
          : applyColor(obj.material);
      }
    });
    return clone;
  }, [scene, npc.color]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.2 + npc.position[0]) * 0.15;
      groupRef.current.rotation.z = Math.sin(t * 0.8 + npc.position[2]) * 0.04;
    }
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(t * 3) * 0.3;
    }
  });

  return (
    <group position={npc.position}>
      <group ref={groupRef}>
        <primitive object={cloned} />

        {/* Accent stripe overlay */}
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[2.3, 0.1, 5.6]} />
          <meshBasicMaterial color={npc.accentColor} />
        </mesh>

        {/* Flag pole */}
        <mesh position={[0, 1.8, -1]}>
          <cylinderGeometry args={[0.05, 0.05, 2.5, 4]} />
          <meshBasicMaterial color={0xcccccc} />
        </mesh>

        {/* Flag */}
        <mesh ref={flagRef} position={[0.5, 2.9, -1]}>
          <planeGeometry args={[1.2, 0.7]} />
          <meshBasicMaterial color={npc.flagColor} side={THREE.DoubleSide} />
        </mesh>

        {/* NPC glow when nearby */}
        {isNear && (
          <pointLight color={npc.accentColor} intensity={3} distance={12} position={[0, 2, 0]} />
        )}

        {/* Mode label floating above the vessel */}
        <Html center distanceFactor={18} position={[0, 5.2, 0]}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            pointerEvents: 'none', userSelect: 'none',
          }}>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 28, fontWeight: 700, letterSpacing: 5,
              color: `#${npc.color.toString(16).padStart(6, '0')}`,
              background: 'rgba(0,0,0,0.75)',
              border: `1px solid #${npc.color.toString(16).padStart(6, '0')}99`,
              padding: '5px 18px',
              whiteSpace: 'nowrap',
              textShadow: `0 0 12px #${npc.color.toString(16).padStart(6, '0')}`,
              clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)',
            }}>
              {npc.label}
            </div>
            <div style={{
              fontSize: 14, letterSpacing: 4,
              color: `#${npc.accentColor.toString(16).padStart(6, '0')}`,
              background: 'rgba(0,0,0,0.65)',
              border: `1px solid #${npc.color.toString(16).padStart(6, '0')}55`,
              borderTop: 'none',
              padding: '2px 14px',
              whiteSpace: 'nowrap',
            }}>
              {npc.subtitle}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}
