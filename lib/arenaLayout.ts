// Shared arena constants used by both WorldDecorations (rendering)
// and aiBoat (navigation / avoidance).

export const ARENA_RADIUS = 85;          // hard boundary for all boats
export const SAFE_SPAWN_RADIUS_MIN = 15;
export const SAFE_SPAWN_RADIUS_MAX = 70;

// Pillar [x, z] positions — must stay in sync with BattlePillars component
export const PILLAR_POSITIONS: [number, number][] = [
  // Inner ring  r ≈ 30
  [ 30,   0], [-30,   0],
  [ 15,  26], [-15,  26],
  [ 15, -26], [-15, -26],
  // Middle ring r ≈ 55
  [ 55,   0], [-55,   0],
  [  0,  55], [  0, -55],
  [ 39,  39], [-39,  39],
  [ 39, -39], [-39, -39],
  // Outer scatter r ≈ 72
  [ 72,  18], [-68, -28],
  [ 42, -68], [-45,  65],
];

export const PILLAR_RADIUS = 3; // collision / avoidance radius per pillar
