import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PILLAR_POSITIONS, PILLAR_RADIUS, SAFE_SPAWN_RADIUS_MIN } from './arenaLayout';

// ── Load boat model and texture once, clone per AI boat ──────
let _boatTemplate: THREE.Group | null = null;
let _boatTexture: THREE.Texture | null = null;
if (typeof window !== 'undefined') {
  new GLTFLoader().load('/models/boat.glb', (gltf) => {
    _boatTemplate = gltf.scene;
  });
  new THREE.TextureLoader().load('/textures/Texture_35.png', (tex) => {
    _boatTexture = tex;
  });
}

function buildBoatMesh(primary: number, accent: number): THREE.Group {
  if (_boatTemplate) {
    const clone = _boatTemplate.clone(true);
    clone.rotation.y = Math.PI;
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const applyMat = (mat: THREE.Material) => {
          const c = mat.clone() as THREE.MeshStandardMaterial;
          if (_boatTexture) {
            c.map = _boatTexture;
            c.color.set(0xffffff);
          } else {
            c.map = null;
            c.color.setHex(primary);
          }
          c.needsUpdate = true;
          return c;
        };
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(applyMat)
          : applyMat(obj.material as THREE.Material);
      }
    });
    // Engine glow overlay
    const em = new THREE.MeshBasicMaterial({ color: accent });
    const eng = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.6), em);
    eng.position.set(0, 0.1, 2.6);
    clone.add(eng);
    // Wrap in outer group so AI rotation control doesn't override the PI flip
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    return wrapper;
  }

  // Fallback: procedural geometry
  const group = new THREE.Group();
  const hm = new THREE.MeshLambertMaterial({ color: primary });
  const em = new THREE.MeshBasicMaterial({ color: accent });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 5.5), hm);
  group.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4), hm);
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 0, -3.8); group.add(bow);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.8), new THREE.MeshLambertMaterial({ color: 0x0a0a14 }));
  cabin.position.set(0, 0.67, 0.4); group.add(cabin);
  const eng = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.6), em);
  eng.position.set(0, 0.1, 2.6); group.add(eng);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 5.6), em);
  stripe.position.y = 0.28; group.add(stripe);
  return group;
}

export interface AIBoat {
  id: string;
  name: string;
  mesh: THREE.Group;
  health: number;
  alive: boolean;
  team?: 'red' | 'blue';
  speed: number;
  turnSpeed: number;
  stateTimer: number;
  attackTimer: number;          // NEW: for firing bursts / cooldown
  state: 'patrol' | 'chase' | 'attack' | 'flee' | 'frozen';
  targetPos: THREE.Vector3;
  respawnTimer: number;
  frozenTimer: number;
  kills: number;
  deaths: number;
  score: number;
}

const AI_NAMES = ['STORMCROW','IRONSIDES','BLACKTIDE','SEAWOLF','TEMPEST','RAZORFIN','DEEPSTRIKE','WARWAVE'];

const COMBAT_RADIUS = 72;
const PATROL_RADIUS_MAX = 60;
const STAGE_AVOID_Z = -55;

function randomPatrolPoint(): THREE.Vector3 {
  let x: number, z: number;
  do {
    const a = Math.random() * Math.PI * 2;
    const r = SAFE_SPAWN_RADIUS_MIN + Math.random() * (PATROL_RADIUS_MAX - SAFE_SPAWN_RADIUS_MIN);
    x = Math.cos(a) * r;
    z = Math.sin(a) * r;
  } while (z < STAGE_AVOID_Z);
  return new THREE.Vector3(x, 0.25, z);
}

function clampToArena(v: THREE.Vector3): THREE.Vector3 {
  const r = Math.sqrt(v.x * v.x + v.z * v.z);
  if (r > PATROL_RADIUS_MAX) {
    v.x = (v.x / r) * PATROL_RADIUS_MAX;
    v.z = (v.z / r) * PATROL_RADIUS_MAX;
  }
  if (v.z < STAGE_AVOID_Z) v.z = STAGE_AVOID_Z;
  return v;
}

export function createAIBoat(
  id: string,
  primary: number,
  accent: number,
  team?: 'red' | 'blue'
): AIBoat {
  const group = buildBoatMesh(primary, accent);

  const spawnPt = randomPatrolPoint();
  group.position.copy(spawnPt);
  group.rotation.y = Math.random() * Math.PI * 2;

  const nameIndex = parseInt(id.replace(/\D/g, '')) || 0;

  return {
    id,
    name: AI_NAMES[nameIndex % AI_NAMES.length],
    mesh: group,
    health: 100,
    alive: true,
    team,
    speed: 5 + Math.random() * 3,
    turnSpeed: 1.4 + Math.random() * 0.8,
    stateTimer: 0,
    attackTimer: 0,                    // NEW
    state: 'patrol',
    targetPos: randomPatrolPoint(),
    respawnTimer: 0,
    frozenTimer: 0,
    kills: 0,
    deaths: 0,
    score: 0,
  };
}

export interface AIUpdateResult {
  shootTarget: THREE.Vector3 | null;
  shootTargetId: string | null;
}

const PILLAR_VEC3 = PILLAR_POSITIONS.map(([x, z]) => new THREE.Vector3(x, 0, z));
const PILLAR_AVOID_DIST = PILLAR_RADIUS + 5;

export function updateAI(
  boat: AIBoat,
  playerPos: THREE.Vector3,
  dt: number,
  difficulty: string,
  otherBoats: AIBoat[] = [],
  playerTeam: 'red' | 'blue' | null = null,
): AIUpdateResult {

  if (!boat.alive) {
    if (boat.respawnTimer > 0) {
      boat.respawnTimer -= dt;
      if (boat.respawnTimer <= 0) {
        boat.alive = true;
        boat.health = 100;
        boat.mesh.visible = true;
        boat.mesh.position.copy(randomPatrolPoint());
        boat.mesh.rotation.y = Math.random() * Math.PI * 2;
        boat.targetPos.copy(randomPatrolPoint());
        boat.state = 'patrol';
        boat.attackTimer = 0;
      }
    }
    return { shootTarget: null, shootTargetId: null };
  }

  if (boat.frozenTimer > 0) {
    boat.frozenTimer -= dt;
    return { shootTarget: null, shootTargetId: null };
  }

  const pos = boat.mesh.position;
  const speedMult = difficulty === 'ACE' ? 1.4 : difficulty === 'CADET' ? 0.65 : 1.0;
  const shootRange = difficulty === 'ACE' ? 55 : difficulty === 'CADET' ? 35 : 45;

  // ── Find nearest enemy with player bias (classic TM "gang up on human") ──
  const playerIsEnemy = !boat.team || !playerTeam || boat.team !== playerTeam;

  let nearestPos = new THREE.Vector3(9999, 0, 9999);
  let nearestId = '';
  let nearestDist = Infinity;

  if (playerIsEnemy) {
    const d = pos.distanceTo(playerPos);
    nearestDist = d * 0.82;           // ~18% preference for the player
    nearestPos.copy(playerPos);
    nearestId = 'player';
  }

  for (const other of otherBoats) {
    if (!other.alive || other.id === boat.id) continue;
    if (boat.team && other.team && boat.team === other.team) continue;

    const d = pos.distanceTo(other.mesh.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearestPos.copy(other.mesh.position);
      nearestId = other.id;
    }
  }

  // ── State Machine ───────────────────────────────────────────────────────
  const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  const nearEdge = distFromCenter > COMBAT_RADIUS * 0.88 || pos.z < STAGE_AVOID_Z + 5;

  let desiredState: AIBoat['state'] = 'patrol';

  if (nearEdge) {
    desiredState = 'patrol';
  } else if (nearestId !== '' && boat.health >= 40) {
    desiredState = nearestDist < shootRange * 1.25 ? 'attack' : 'chase';
  } else if (nearestId !== '' && boat.health < 40) {
    desiredState = 'flee';
  }

  if (boat.state !== desiredState) {
    boat.state = desiredState;
    boat.stateTimer = desiredState === 'patrol' ? 4 + Math.random() * 9 : 0;
  }

  // ── Patrol target refresh ───────────────────────────────────────────────
  const distToPatrol = pos.distanceTo(boat.targetPos);
  if (boat.state === 'patrol' && (distToPatrol < 8 || boat.stateTimer <= 0)) {
    boat.targetPos.copy(randomPatrolPoint());
    boat.stateTimer = 6 + Math.random() * 10;
  }
  boat.stateTimer -= dt;
  boat.attackTimer -= dt;

  // ── Choose movement target based on state ───────────────────────────────
  let target: THREE.Vector3;

  if (boat.state === 'patrol') {
    target = boat.targetPos;
  } else if (boat.state === 'chase' || boat.state === 'attack') {
    target = clampToArena(nearestPos.clone());
  } else if (boat.state === 'flee') {
    const away = pos.clone().sub(nearestPos).setY(0).normalize();
    target = clampToArena(pos.clone().addScaledVector(away, 48));
  } else {
    target = boat.targetPos;
  }

  // ── Pillar repulsion ────────────────────────────────────────────────────
  const repulsion = new THREE.Vector3();
  for (const pv of PILLAR_VEC3) {
    const dx = pos.x - pv.x;
    const dz = pos.z - pv.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < PILLAR_AVOID_DIST && d > 0.01) {
      const s = (PILLAR_AVOID_DIST - d) / PILLAR_AVOID_DIST;
      repulsion.x += (dx / d) * s * 12;
      repulsion.z += (dz / d) * s * 12;
    }
  }
  const effectiveTarget = target.clone().add(repulsion);

  // ── Improved Steering (smoother + anti-deadlock) ────────────────────────
  const toTarget = effectiveTarget.clone().sub(pos).setY(0);
  const distToMove = toTarget.length();

  if (distToMove > 2) {
    toTarget.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(boat.mesh.rotation);
    const angle = Math.atan2(
      toTarget.x * forward.z - toTarget.z * forward.x,
      toTarget.x * forward.x + toTarget.z * forward.z
    ); // signed angle in radians

    let turnAggression = 1.0;
    if (boat.state === 'flee') turnAggression = 1.65;
    else if (boat.state === 'attack') turnAggression = 0.95;
    else if (boat.state === 'chase') turnAggression = 1.25;

    // ACE difficulty: Add a slight "wobble" or strafe to make them harder to hit
    let finalAngle = angle;
    if (difficulty === 'ACE' && boat.state === 'attack') {
      const wobble = Math.sin(Date.now() * 0.005) * 0.35;
      finalAngle += wobble;
    }

    let turn = finalAngle * boat.turnSpeed * turnAggression * speedMult;

    // Anti-deadlock when almost 180° behind
    if (Math.abs(angle) > 2.7) {
      turn = (boat.id.charCodeAt(boat.id.length - 1) % 2 === 0 ? 1.9 : -1.9);
    }

    boat.mesh.rotation.y += turn * dt;
  }

  // ── Movement with state-based speed ─────────────────────────────────────
  let currentSpeed = boat.speed * speedMult;
  if (boat.state === 'attack') currentSpeed *= 0.78;   // slow slightly to aim
  if (boat.state === 'flee')   currentSpeed *= 1.22;

  const dir = new THREE.Vector3(0, 0, -1).applyEuler(boat.mesh.rotation);
  pos.addScaledVector(dir, currentSpeed * dt);
  pos.y = 0.25;

  // ── Hard boundary clamp ─────────────────────────────────────────────────
  const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  if (r > COMBAT_RADIUS) {
    pos.x = (pos.x / r) * COMBAT_RADIUS;
    pos.z = (pos.z / r) * COMBAT_RADIUS;
  }
  if (pos.z < -62) pos.z = -62;

  // ── Shooting with burst timing ──────────────────────────────────────────
  const inRange = nearestId !== '' && nearestDist < shootRange;
  const shouldShoot = inRange && boat.attackTimer <= 0;

  if (shouldShoot) {
    // Fire!
    const fireDelay = difficulty === 'ACE' ? 0.35 : difficulty === 'CADET' ? 1.1 : 0.7;
    boat.attackTimer = fireDelay;

    return {
      shootTarget: nearestPos.clone(),
      shootTargetId: nearestId
    };
  }

  return { shootTarget: null, shootTargetId: null };
}