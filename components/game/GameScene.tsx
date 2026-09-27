'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import AnimeWater from '@/components/AnimeWater';
import SkyDome from '@/components/SkyDome';
import { PalmRing } from '@/components/PalmTree';
import { FestivalStage, Buoys, CrowdDots, SceneLights, BattlePillars } from '@/components/WorldDecorations';
import BoatMesh from '@/components/BoatMesh';
import GameHUD from './GameHUD';
import EndScreen from './EndScreen';
import PlayerController from './PlayerController';
import MobileControls from './MobileControls';
import RemotePlayer from './RemotePlayer';
import PowerupManager from './PowerupManager';
import FireworksSystem from '@/components/FireworksSystem';
import { Html } from '@react-three/drei';
import { createAIBoat, updateAI, AIBoat } from '@/lib/aiBoat';
import { Projectile, updateProjectiles, spawnExplosion } from '@/lib/projectiles';
import { createProjectile } from '@/lib/projectiles';
import { ScoreManager } from '@/lib/scoreManager';
import { SFX } from '@/lib/sfx';
import { adaptiveDpr } from '@/lib/deviceUtils';
import { WEAPONS } from '@/lib/weapons';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { GameStatePayload, ShootPayload, HitPayload, KillPayload } from '@/lib/multiplayer';

// ── Label that tracks a single AI boat mesh ──────────────────
function AIBoatLabel({ boat, playerTeam }: { boat: AIBoat; playerTeam: 'red' | 'blue' | null }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(boat.mesh.position);
    groupRef.current.position.y += 3.8;
    groupRef.current.visible = boat.alive;
  });

  const isAlly = playerTeam !== null && boat.team === playerTeam;
  const color = isAlly ? '#44aaff' : boat.team ? '#ff3344' : '#ff9933';
  const borderAlpha = isAlly ? 'rgba(50,150,255,0.7)' : boat.team ? 'rgba(255,50,70,0.7)' : 'rgba(255,150,50,0.7)';
  const shadowColor = isAlly ? 'rgba(50,150,255,0.8)' : boat.team ? 'rgba(255,50,70,0.8)' : 'rgba(255,150,50,0.8)';
  const subLabel = isAlly ? 'ALLY (AI)' : 'ENEMY (AI)';

  return (
    <group ref={groupRef}>
      <Html center distanceFactor={18}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 28, fontWeight: 700, letterSpacing: 5,
            color,
            background: 'rgba(0,0,0,0.75)',
            border: `1px solid ${borderAlpha}`,
            padding: '5px 18px',
            whiteSpace: 'nowrap',
            textShadow: `0 0 12px ${shadowColor}`,
            clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)',
          }}>
            {boat.name}
          </div>
          <div style={{
            fontSize: 14, letterSpacing: 4,
            color,
            background: 'rgba(0,0,0,0.65)',
            border: `1px solid ${borderAlpha.replace('0.7', '0.4')}`,
            borderTop: 'none',
            padding: '2px 14px',
            whiteSpace: 'nowrap',
          }}>
            {subLabel}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ── Renders labels for all AI boats ──────────────────────────
function AIBoatLabels({ aiBoatsRef, playerTeam }: { aiBoatsRef: React.MutableRefObject<AIBoat[]>; playerTeam: 'red' | 'blue' | null }) {
  // Snapshot the list once on mount; new boats won't appear mid-match
  const boats = aiBoatsRef.current;
  return (
    <>
      {boats.map((boat) => (
        <AIBoatLabel key={boat.id} boat={boat} playerTeam={playerTeam} />
      ))}
    </>
  );
}

// ── Inner scene that has access to R3F context ──────────────
function GameWorld({
  playerBoatRef,
  projectilesRef,
  aiBoatsRef,
  ripplesRef,
  keys,
  onPositionUpdate,
  onMatchEnd,
  onRemoteHit,
}: {
  playerBoatRef: React.RefObject<THREE.Group>;
  projectilesRef: React.MutableRefObject<Projectile[]>;
  aiBoatsRef: React.MutableRefObject<AIBoat[]>;
  ripplesRef: React.MutableRefObject<{ x: number; z: number; age: number }[]>;
  keys: React.MutableRefObject<Record<string, boolean>>;
  onPositionUpdate: (pos: { x: number; z: number }) => void;
  onMatchEnd: () => void;
  onRemoteHit?: (proj: Projectile) => void;
}) {
  const { scene } = useThree();
  const { settings, player, setPlayer, addKill, tickTimer, matchRunning, playerCustomization } = useGameStore();
  const endFired = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Reset endFired whenever a new match starts
  useEffect(() => {
    if (matchRunning) endFired.current = false;
  }, [matchRunning]);

  useFrame((_, dt) => {
    if (!matchRunning) return;
    const playerPos = playerBoatRef.current?.position ?? new THREE.Vector3();
    // In TDM the player is on the blue team; LBS has no teams
    const playerTeam = settingsRef.current.mode === 'TDM' ? 'blue' as const : null;
    const isLBS = settingsRef.current.mode === 'LBS';

    // ── Projectile updates & collisions ────────────────────
    updateProjectiles(projectilesRef.current, scene, dt);

    projectilesRef.current.forEach((p) => {
      if (!p.alive) return;
      const ppos = p.mesh.position;

      if (p.isPlayer) {
        // Check collision with remote players
        if (onRemoteHit) onRemoteHit(p);

        // vs AI boats — no friendly fire in TDM
        aiBoatsRef.current.forEach((boat) => {
          if (!boat.alive || !p.alive) return;
          if (playerTeam && boat.team === playerTeam) return;
          if (ppos.distanceTo(boat.mesh.position) < 3) {
            boat.health -= p.damage;
            spawnExplosion(scene, ppos.clone(), 12, 0xff6600);
            SFX.explosion(0.6);
            p.alive = false;
            if (boat.health <= 0) {
              boat.alive = false;
              boat.mesh.visible = false;
              boat.respawnTimer = isLBS ? Infinity : 6;
              spawnExplosion(scene, boat.mesh.position.clone(), 45, 0xff3300);
              SFX.explosion(1.2);
              addKill(`⊕ ${boat.name} destroyed`, '');
              ScoreManager.onKill('player', boat.id, settingsRef.current.mode);
            }
          }
        });
      } else if (p.shooterId && p.shooterId !== 'player') {
        // AI-vs-AI: check hit on other AI boats — no friendly fire in TDM
        const shooterBoat = aiBoatsRef.current.find((b) => b.id === p.shooterId);
        aiBoatsRef.current.forEach((boat) => {
          if (!boat.alive || !p.alive || boat.id === p.shooterId) return;
          if (shooterBoat?.team && boat.team === shooterBoat.team) return;
          if (ppos.distanceTo(boat.mesh.position) < 3) {
            boat.health -= p.damage;
            spawnExplosion(scene, ppos.clone(), 12, 0xff6600);
            SFX.explosion(0.6);
            p.alive = false;
            if (boat.health <= 0) {
              boat.alive = false;
              boat.mesh.visible = false;
              boat.respawnTimer = isLBS ? Infinity : 6;
              spawnExplosion(scene, boat.mesh.position.clone(), 45, 0xff3300);
              SFX.explosion(1.2);
              const killer = aiBoatsRef.current.find((b) => b.id === p.shooterId);
              addKill(`⊕ ${killer?.name ?? 'AI'} destroyed ${boat.name}`, '');
              ScoreManager.onKill(p.shooterId!, boat.id, settingsRef.current.mode);
            }
          }
        });
        // AI can also hit the player — not if same team
        const shielded = useGameStore.getState().player.shielded;
        if (!player.dead && !shielded && !(playerTeam && shooterBoat?.team === playerTeam) && ppos.distanceTo(playerPos) < 2.8) {
          const newHealth = Math.max(0, player.health - p.damage);
          setPlayer({ health: newHealth });
          SFX.hit();
          p.alive = false;
          spawnExplosion(scene, ppos.clone(), 8, 0xff0000);
          if (newHealth <= 0 && !player.dead) {
            setPlayer({ dead: true });
            spawnExplosion(scene, playerPos.clone(), 50, 0xff3300);
            SFX.explosion(1.8);
            if (playerBoatRef.current) playerBoatRef.current.visible = false;
            addKill('☠ Your vessel was destroyed', 'red');
            ScoreManager.onKill(p.shooterId!, 'player', settingsRef.current.mode);
            if (isLBS) {
              if (!endFired.current) { endFired.current = true; setTimeout(onMatchEnd, 1500); }
            } else {
              setTimeout(() => { if (playerBoatRef.current) playerBoatRef.current.visible = true; }, 5000);
            }
          }
        }
      } else {
        // vs player
        const shielded = useGameStore.getState().player.shielded;
        if (!player.dead && !shielded && ppos.distanceTo(playerPos) < 2.8) {
          const newHealth = Math.max(0, player.health - p.damage);
          setPlayer({ health: newHealth });
          SFX.hit();
          p.alive = false;
          spawnExplosion(scene, ppos.clone(), 8, 0xff0000);
          if (newHealth <= 0 && !player.dead) {
            setPlayer({ dead: true });
            spawnExplosion(scene, playerPos.clone(), 50, 0xff3300);
            SFX.explosion(1.8);
            if (playerBoatRef.current) playerBoatRef.current.visible = false;
            addKill('☠ Your vessel was destroyed', 'red');
            ScoreManager.onDeath('player');
            setTimeout(() => {
              if (playerBoatRef.current) playerBoatRef.current.visible = true;
            }, 5000);
          }
        }
      }
    });

    // ── AI update (handles movement, shooting, and respawn countdown) ────
    aiBoatsRef.current.forEach((boat) => {
      const result = updateAI(boat, playerPos, dt, settings.difficulty, aiBoatsRef.current, playerTeam);
      if (result.shootTarget) {
        const dir = result.shootTarget.clone().sub(boat.mesh.position).setY(0).normalize();
        const muzzle = boat.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0));
        const proj = createProjectile(scene, muzzle, dir, false, { damage: 18, projectileSpeed: 28 }, boat.id);
        projectilesRef.current.push(proj);
        SFX.shoot('machinegun');
      }
    });

    // ── Ripples ─────────────────────────────────────────────
    ripplesRef.current = ripplesRef.current
      .map((r) => ({ ...r, age: r.age + dt * 0.3 }))
      .filter((r) => r.age < 1);

    if (Math.random() < 0.05 && playerPos.length() > 0) {
      ripplesRef.current.push({ x: playerPos.x, z: playerPos.z, age: 0 });
    }
    aiBoatsRef.current.forEach((b) => {
      if (b.alive && Math.random() < 0.01) {
        ripplesRef.current.push({ x: b.mesh.position.x, z: b.mesh.position.z, age: 0 });
      }
    });
    if (ripplesRef.current.length > 8) ripplesRef.current = ripplesRef.current.slice(-8);

    if (!isLBS) tickTimer(dt);

    // ── Match end conditions ──────────────────────────────────
    if (!endFired.current) {
      if (isLBS && aiBoatsRef.current.length > 0) {
        // LBS offline: all AI dead → player wins; player already dead → handled above
        const anyAlive = aiBoatsRef.current.some((b) => b.alive);
        if (!anyAlive && !useGameStore.getState().player.dead) {
          endFired.current = true;
          setTimeout(onMatchEnd, 1000);
        }
      } else if (!isLBS && useGameStore.getState().matchTimer === 0) {
        endFired.current = true;
        onMatchEnd();
      }
    }
  });

  return (
    <>
      <SceneLights />
      <SkyDome />
      <PalmRing count={20} radius={155} />
      <FestivalStage />
      <BattlePillars />
      <Buoys />
      <CrowdDots />
      <FireworksSystem />
      <AnimeWater size={900} ripples={ripplesRef.current} />

      {/* Player boat */}
      <group ref={playerBoatRef} position={[0, 0.25, 0]}>
        <BoatMesh
          primary={playerCustomization?.primaryColor ?? 0x0066cc}
          accent={playerCustomization?.neonColor ?? 0x00e8d8}
          isPlayer
        />
        {/* Neon underglow light */}
        <pointLight
          color={playerCustomization?.neonColor ?? 0x00e8d8}
          intensity={playerCustomization?.neonColor ? (playerCustomization.glowIntensity || 2) : 0}
          distance={8}
          position={[0, -0.5, 0]}
        />
      </group>
    </>
  );
}

// ── AI Renderer ──────────────────────────────────────────────
function AIRenderer({ aiBoatsRef }: { aiBoatsRef: React.MutableRefObject<AIBoat[]> }) {
  const { scene } = useThree();
  useEffect(() => {
    aiBoatsRef.current.forEach((b) => scene.add(b.mesh));
    return () => { aiBoatsRef.current.forEach((b) => scene.remove(b.mesh)); };
  }, [scene, aiBoatsRef]);
  return null;
}

// ── Online: spawn remote projectiles for visual feedback ─────
function RemoteShootReceiver({
  projectilesRef,
}: {
  projectilesRef: React.MutableRefObject<Projectile[]>;
}) {
  const { scene } = useThree();
  const { isOnline } = useGameStore();

  useEffect(() => {
    if (!isOnline) return;
    const socket = connectSocket();
    if (!socket) return;

    const handleShoot = (data: ShootPayload) => {
      const origin = new THREE.Vector3(data.x, 0.5, data.z);
      const dir    = new THREE.Vector3(data.dirX, 0, data.dirZ).normalize();
      const weapon = WEAPONS.find((w) => w.id === data.weaponId) ?? WEAPONS[0];
      const proj   = createProjectile(scene, origin, dir, false, weapon);
      proj.damage = 0; // visual only — damage handled via game:hit relay
      projectilesRef.current.push(proj);
    };

    socket.on('game:shoot', handleShoot);
    return () => { socket.off('game:shoot', handleShoot); };
  }, [isOnline, scene, projectilesRef]);

  return null;
}

// ── Top-level game scene ─────────────────────────────────────
export default function GameScene() {
  const {
    settings, setScreen, startMatch, endMatchAction, matchRunning, matchEnded,
    isOnline, roomCode, playerId, playerName,
    remotePlayers, setRemotePlayer, removeRemotePlayer,
    setPlayer, addKill, syncTimer,
  } = useGameStore();

  const playerBoatRef  = useRef<THREE.Group>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const aiBoatsRef     = useRef<AIBoat[]>([]);
  const ripplesRef     = useRef<{ x: number; z: number; age: number }[]>([]);
  const keys           = useRef<Record<string, boolean>>({});
  const [playerPos, setPlayerPos] = useState<{ x: number; z: number } | null>(null);
  const [endState, setEndState]   = useState<{ winner: string; color: string } | null>(null);

  // Sync timer for online position broadcast (~20 Hz)
  const syncAccum = useRef(0);

  // ── Init AI boats (skipped when online: bots=0) ──────────
  useEffect(() => {
    const botCount = isOnline ? 0 : settings.bots;
    const boats: AIBoat[] = [];
    const ffaColors = [
      [0xcc1133, 0xff6688], [0x113399, 0x4488ff], [0x228833, 0x44ee88],
      [0x994411, 0xffaa44], [0x6611aa, 0xcc44ff], [0x119988, 0x44ffee],
      [0x885511, 0xffcc44],
    ];
    if (settings.mode === 'TDM') {
      // botCount = bots per team → equal red and blue AI squads
      for (let i = 0; i < botCount; i++) {
        boats.push(createAIBoat(`red${i}`, 0xcc1133, 0xff4466, 'red'));
      }
      for (let i = 0; i < botCount; i++) {
        boats.push(createAIBoat(`blue${i}`, 0x0033aa, 0x44aaff, 'blue'));
      }
    } else {
      for (let i = 0; i < botCount; i++) {
        const [primary, accent] = ffaColors[i % ffaColors.length];
        boats.push(createAIBoat(`ai${i}`, primary, accent, undefined));
      }
    }
    aiBoatsRef.current = boats;

    const playerTeamEntry = settings.mode === 'TDM' ? 'blue' as const : undefined;
    ScoreManager.reset([
      { id: 'player', name: 'YOU', team: playerTeamEntry },
      ...boats.map((b) => ({ id: b.id, name: b.name, team: b.team })),
    ]);

    SFX.startEngine();
    return () => { SFX.stopEngine(); };
  }, [settings]);

  // ── Keyboard listeners ───────────────────────────────────
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { keys.current[e.code] = true; e.preventDefault(); };
    const onUp   = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // ── Online: socket event handlers ────────────────────────
  useEffect(() => {
    if (!isOnline) return;

    const socket = connectSocket();
    if (!socket) return;

    // Remote position/health updates
    socket.on('game:state', (data: GameStatePayload & { serverElapsed?: number }) => {
      setRemotePlayer(data.id, {
        x: data.x, z: data.z, ry: data.ry,
        health: data.health, dead: data.dead,
      });
      // Sync timer to server's authoritative elapsed time (skip LBS — no timer)
      if (data.serverElapsed !== undefined && useGameStore.getState().settings.mode !== 'LBS') {
        syncTimer(data.serverElapsed);
      }
    });

    // We got hit by a remote player
    socket.on('game:hit', ({ fromId, damage }: HitPayload) => {
      const state = useGameStore.getState();
      if (state.player.dead || state.player.shielded) return;
      const newHealth = Math.max(0, state.player.health - damage);
      setPlayer({ health: newHealth });
      SFX.hit();
      if (newHealth <= 0 && !state.player.dead) {
        setPlayer({ dead: true });
        SFX.explosion(1.8);
        addKill('☠ Your vessel was destroyed', 'red');
        // Tell server we were killed
        socket.emit('game:kill', { victimId: playerId, victimName: playerName });
        if (playerBoatRef.current) playerBoatRef.current.visible = false;
        setTimeout(() => {
          if (playerBoatRef.current) playerBoatRef.current.visible = true;
          setPlayer({ dead: false, health: 100, ammo: 100, boost: 100 });
          addKill('⚓ Vessel repaired — back in action', 'gold');
        }, 5000);
      }
    });

    // Kill broadcast
    socket.on('game:kill', ({ killerId, killerName, victimName, victimId }: KillPayload) => {
      if (victimId === playerId) return; // already handled in game:hit
      addKill(`⊕ ${killerName} destroyed ${victimName}`, '');
      ScoreManager.onKill(killerId, victimId, useGameStore.getState().settings.mode);
    });

    return () => {
      socket.off('game:state');
      socket.off('game:hit');
      socket.off('game:kill');
      // Do NOT disconnect here — the socket must stay in the room for the whole match.
      // Disconnection happens in handleReturnLobby when the player explicitly leaves.
    };
  }, [isOnline, playerId, playerName, setPlayer, setRemotePlayer, removeRemotePlayer, addKill, syncTimer]);

  // ── Online: broadcast local state at ~20 Hz ──────────────
  // We use a requestAnimationFrame loop so it doesn't depend on R3F
  useEffect(() => {
    if (!isOnline) return;
    let rafId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      syncAccum.current += dt;

      if (syncAccum.current >= 0.05 && playerBoatRef.current) {
        syncAccum.current = 0;
        const boat = playerBoatRef.current;
        const socket = connectSocket();
        const { health, dead } = useGameStore.getState().player;
        socket?.emit('game:state', {
          x: boat.position.x,
          z: boat.position.z,
          ry: boat.rotation.y,
          health,
          dead,
        });
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isOnline]);

  // ── Online: detect hits on remote players ────────────────
  // Checked in PlayerController via onShoot callback — we wire it here
  // by passing a shoot callback that the controller can use
  const handlePlayerShoot = useCallback((
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    weaponId: string,
    damage: number,
    projectileSpeed: number,
  ) => {
    if (!isOnline) return;
    const socket = connectSocket();
    socket?.emit('game:shoot', {
      x: origin.x, z: origin.z,
      dirX: dir.x, dirZ: dir.z,
      weaponId, damage, projectileSpeed,
    });

    // Local hit detection against remote players
    Object.values(remotePlayers).forEach((rp) => {
      if (rp.dead) return;
      const rpPos = new THREE.Vector3(rp.x, 0.25, rp.z);
      if (origin.distanceTo(rpPos) < 30) { // rough range check
        // We'll let the projectile do the hit detection via the game loop;
        // here we just send the shoot event for the server to relay
      }
    });
  }, [isOnline, remotePlayers]);

  // ── Hit detection for remote players ─────────────────────
  // Run every frame outside R3F via a ref-based check in GameWorld
  // We expose a callback so ProjectileController can call it
  const remoteHitCheck = useCallback((proj: Projectile) => {
    if (!isOnline || !proj.isPlayer) return;
    const socket = connectSocket();
    if (!socket) return;
    Object.entries(remotePlayers).forEach(([id, rp]) => {
      if (rp.dead) return;
      const rpPos = new THREE.Vector3(rp.x, 0.25, rp.z);
      if (proj.mesh.position.distanceTo(rpPos) < 3) {
        proj.alive = false;
        socket.emit('game:hit', { toId: id, damage: proj.damage });
        addKill(`⊕ Hit on ${rp.name}`, '');
      }
    });
  }, [isOnline, remotePlayers, addKill]);

  const handleMatchEnd = useCallback(() => {
    endMatchAction();
    const mode = useGameStore.getState().settings.mode;
    if (mode === 'LBS') {
      const playerSurvived = !useGameStore.getState().player.dead;
      setEndState({ winner: playerSurvived ? 'LAST STANDING' : 'ELIMINATED', color: playerSurvived ? '#44ee88' : '#ff3344' });
    } else if (mode === 'TDM') {
      const red  = ScoreManager.teamScores.red;
      const blue = ScoreManager.teamScores.blue;
      const winner = blue > red ? 'BLUE TEAM WINS' : red > blue ? 'RED TEAM WINS' : 'DRAW';
      const color  = blue > red ? '#4488ff' : red > blue ? '#ff3344' : '#ffffff';
      setEndState({ winner, color });
    } else {
      const sorted = ScoreManager.getSorted();
      const top = sorted[0];
      if (!top) return;
      const isPlayer = top.id === 'player';
      setEndState({ winner: isPlayer ? 'VICTORY' : top.name, color: isPlayer ? '#00e8d8' : '#ff4466' });
    }
  }, [endMatchAction]);

  const handleReturnLobby = useCallback(() => {
    if (isOnline) disconnectSocket();
    setScreen('lobby');
  }, [setScreen, isOnline]);
  const handleRematch = useCallback(() => {
    // Clear lingering projectiles
    projectilesRef.current = [];

    // Reset all AI boats to full health at new spawn positions
    aiBoatsRef.current.forEach((boat) => {
      boat.health = 100;
      boat.alive = true;
      boat.mesh.visible = true;
      boat.respawnTimer = 0;
      boat.kills = 0;
      boat.deaths = 0;
      boat.score = 0;
      boat.state = 'patrol';
      const a = Math.random() * Math.PI * 2;
      const r = 15 + Math.random() * 60;
      boat.mesh.position.set(Math.cos(a) * r, 0.25, Math.sin(a) * r);
    });

    // Reset scoreboard
    const rematchPlayerTeam = useGameStore.getState().settings.mode === 'TDM' ? 'blue' as const : undefined;
    ScoreManager.reset([
      { id: 'player', name: 'YOU', team: rematchPlayerTeam },
      ...aiBoatsRef.current.map((b) => ({ id: b.id, name: b.name, team: b.team })),
    ]);

    setEndState(null);
    startMatch();
  }, [startMatch]);

  const remotePlayerList = Object.values(remotePlayers);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        gl={{ antialias: false, alpha: false }}
        camera={{ fov: 72, near: 0.1, far: 1000, position: [0, 8, 16] }}
        style={{ background: '#1a0400' }}
        dpr={adaptiveDpr()}
      >
        <GameWorld
          playerBoatRef={playerBoatRef}
          projectilesRef={projectilesRef}
          aiBoatsRef={aiBoatsRef}
          ripplesRef={ripplesRef}
          keys={keys}
          onPositionUpdate={setPlayerPos}
          onMatchEnd={handleMatchEnd}
          onRemoteHit={remoteHitCheck}
        />
        <AIRenderer aiBoatsRef={aiBoatsRef} />
        <AIBoatLabels aiBoatsRef={aiBoatsRef} playerTeam={settings.mode === 'TDM' ? 'blue' : null} />
        <PlayerController
          boatRef={playerBoatRef}
          projectiles={projectilesRef}
          onPositionUpdate={setPlayerPos}
          keys={keys}
          onShoot={handlePlayerShoot}
        />

        {/* ── Remote players (PvP) ─────────────────────── */}
        {remotePlayerList.map((rp) => (
          <RemotePlayer
            key={rp.id}
            id={rp.id}
            name={rp.name ?? ''}
            x={rp.x}
            z={rp.z}
            ry={rp.ry}
            health={rp.health}
            dead={rp.dead}
            customization={rp.customization}
          />
        ))}

        {/* Receive remote shoot events and spawn visual projectiles */}
        <RemoteShootReceiver projectilesRef={projectilesRef} />

        {/* Power-up spawning and collection */}
        <PowerupManager playerRef={playerBoatRef} />

      </Canvas>

      <GameHUD
        aiBoats={aiBoatsRef.current}
        playerWorldPos={playerPos}
        onReturnLobby={handleReturnLobby}
      />
      <MobileControls keys={keys} />

      {endState && (
        <EndScreen
          winner={endState.winner}
          winnerColor={endState.color}
          onRematch={handleRematch}
          onLobby={handleReturnLobby}
        />
      )}
    </div>
  );
}
