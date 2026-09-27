'use client';
import React from 'react';

export default function LobbyDock() {
  // Central hexagonal dock platform where you spawn
  return (
    <group>
      {/* Central circular dock platform */}
      <mesh position={[0, -0.2, 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[28, 32]} />
        <meshLambertMaterial color={0x5a3a1a} />
      </mesh>

      {/* Dock planks */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, -0.1, -15 + i * 4]}>
          <boxGeometry args={[56, 0.15, 0.3]} />
          <meshLambertMaterial color={0x7a5a2a} />
        </mesh>
      ))}

      {/* Edge railing posts */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r = 27;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.6, 8 + Math.sin(a) * r]}>
            <cylinderGeometry args={[0.12, 0.12, 1.4, 4]} />
            <meshLambertMaterial color={0x8B6914} />
          </mesh>
        );
      })}

      {/* Dock lights along edge */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 26;
        const color = [0xffee00, 0xff4466, 0x00ffcc, 0xff8800][i % 4];
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * r, 1.2, 8 + Math.sin(a) * r]}>
              <sphereGeometry args={[0.2, 6, 6]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <pointLight color={color} intensity={1.5} distance={12} position={[Math.cos(a) * r, 1.5, 8 + Math.sin(a) * r]} />
          </group>
        );
      })}

      {/* NPC docking piers - extend toward each NPC */}
      {([
        { x: 0,   z: -8,  len: 20, ry: 0 },              // FFA — forward
        { x: -20, z: 0,   len: 20, ry: Math.PI / 2 },    // TDM — left
        { x: 20,  z: 0,   len: 20, ry: Math.PI / 2 },    // LBS — right
        { x: 10,  z: -10, len: 22, ry: Math.PI / 4 },    // PvP — front-right diagonal
      ] as { x: number; z: number; len: number; ry: number }[]).map((p, i) => (
        <mesh key={i} position={[p.x, -0.2, p.z]} rotation={[0, p.ry, 0]}>
          <boxGeometry args={[3, 0.3, p.len]} />
          <meshLambertMaterial color={0x6a4a1a} />
        </mesh>
      ))}
    </group>
  );
}
