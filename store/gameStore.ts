import { create } from 'zustand';
import type { RemotePlayerState, PlayerCustomization, PlayerInventory } from '@/lib/multiplayer';
import { TokenManager } from '@/lib/tokenManager';
import { InventoryManager } from '@/lib/inventoryManager';
import { PART_UPGRADES, SELL_PERCENT, PartCategory } from '@/lib/partData';

export type Screen = 'lobby' | 'game';
export type GameMode = 'FFA' | 'TDM' | 'LBS';
export type Difficulty = 'CADET' | 'VETERAN' | 'ACE';
export type BotCount = 0 | 3 | 5 | 7;

export interface Settings {
  mode: GameMode;
  difficulty: Difficulty;
  bots: BotCount;
  scoreLimit: number;
  timeLimit: number;
}

export interface ActivePowerup {
  type: string;
  expiresAt: number; // Date.now() ms
  label: string;
  icon: string;
  cssColor: string;
}

export interface PlayerState {
  health: number;
  ammo: number;
  boost: number;
  speed: number;
  dead: boolean;
  reloading: boolean;
  weaponIdx: number;
  shielded: boolean;
  weaponBoost: boolean; // damage + fireRate multiplier
  activePowerups: ActivePowerup[];
}

export interface GameState {
  screen: Screen;
  settings: Settings;
  player: PlayerState;
  matchTimer: number;
  matchRunning: boolean;
  matchEnded: boolean;
  killFeed: { id: number; msg: string; cls: string }[];
  nextKillId: number;

  // ── Multiplayer ──────────────────────────────────────────
  isOnline: boolean;
  roomCode: string | null;
  playerId: string | null;
  playerName: string;
  remotePlayers: Record<string, RemotePlayerState>;
  playerCustomization: PlayerCustomization;
  inventory: PlayerInventory;
  hydroTokens: number;

  // actions
  setScreen: (s: Screen) => void;
  setSettings: (s: Partial<Settings>) => void;
  startMatch: () => void;
  startOnlineMatch: (roomCode: string, playerId: string) => void;
  endMatchAction: () => void;
  setPlayer: (p: Partial<PlayerState>) => void;
  tickTimer: (dt: number) => void;
  syncTimer: (elapsed: number) => void;
  addKill: (msg: string, cls?: string) => void;
  removeKill: (id: number) => void;

  addActivePowerup: (p: ActivePowerup) => void;
  tickPowerups: () => void;

  // multiplayer actions
  setOnline: (isOnline: boolean, roomCode?: string, playerId?: string) => void;
  setPlayerName: (name: string) => void;
  setRemotePlayer: (id: string, state: Partial<RemotePlayerState>) => void;
  removeRemotePlayer: (id: string) => void;
  clearRemotePlayers: () => void;
  setPlayerCustomization: (p: PlayerCustomization) => void;
  addHydroTokens: (amount: number) => void;
  spendHydroTokens: (amount: number) => boolean;
  purchasePart: (category: PartCategory, level: number) => void;
  sellPart: (category: PartCategory, level: number) => void;
  purchaseVisual: (type: 'hull' | 'neon', value: number | null, cost: number) => boolean;
}

const DEFAULT_PLAYER: PlayerState = {
  health: 100, ammo: 100, boost: 100,
  speed: 0, dead: false, reloading: false, weaponIdx: 0,
  shielded: false, weaponBoost: false, activePowerups: [],
};

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'lobby', // Default to lobby to prevent SSR mismatches
  settings: {
    mode: 'FFA',
    difficulty: 'VETERAN',
    bots: 5,
    scoreLimit: 10,
    timeLimit: 180,
  },
  player: { ...DEFAULT_PLAYER },
  matchTimer: 180,
  matchRunning: false,
  matchEnded: false,
  killFeed: [],
  nextKillId: 0,

  // multiplayer defaults
  isOnline: false,
  roomCode: null,
  playerId: null,
  playerName: 'PILOT',
  remotePlayers: {},
  playerCustomization: {
    primaryColor: 0x0066cc,
    neonColor: null,
    hullPattern: 0,
    decalId: null,
    glowIntensity: 0,
    partUpgrades: { engine: 0, rudder: 0, hull: 0 },
  },
  inventory: { 
    engine: [0], rudder: [0], hull: [0], 
    hullColors: [0x0066cc], neonColors: [null] 
  },
  hydroTokens: 0,

  // ── Actions ──────────────────────────────────────────────
  setScreen: (screen) => set({ screen }),
  setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),

  startMatch: () => set(() => ({
    screen: 'game',
    isOnline: false,
    roomCode: null,
    playerId: null,
    remotePlayers: {},
    matchRunning: true,
    matchEnded: false,
    matchTimer: 180,
    player: { ...DEFAULT_PLAYER },
    killFeed: [],
  })),

  startOnlineMatch: (roomCode, playerId) => set((state) => ({
    screen: 'game',
    isOnline: true,
    roomCode,
    playerId,
    remotePlayers: {},
    matchRunning: true,
    matchEnded: false,
    matchTimer: 180,
    player: { ...DEFAULT_PLAYER },
    killFeed: [],
    settings: { ...state.settings, bots: 0 },
  })),

  endMatchAction: () => set({ matchRunning: false, matchEnded: true }),

  setPlayer: (p) => set((state) => ({ player: { ...state.player, ...p } })),

  tickTimer: (dt) => set((state) => ({
    matchTimer: Math.max(0, state.matchTimer - dt),
  })),

  syncTimer: (elapsed) => set((state) => ({
    matchTimer: Math.max(0, state.settings.timeLimit - elapsed),
  })),

  addKill: (msg, cls = '') => {
    const id = get().nextKillId;
    set((state) => ({
      killFeed: [{ id, msg, cls }, ...state.killFeed].slice(0, 8),
      nextKillId: state.nextKillId + 1,
    }));
    setTimeout(() => get().removeKill(id), 3800);
  },

  removeKill: (id) => set((state) => ({
    killFeed: state.killFeed.filter((k) => k.id !== id),
  })),

  addActivePowerup: (p) => set((state) => {
    const activePowerups = [
      ...state.player.activePowerups.filter((a) => a.type !== p.type),
      p,
    ];
    const shielded = activePowerups.some((a) => a.type === 'shield');
    const weaponBoost = activePowerups.some((a) => a.type === 'weaponUpgrade');
    return { player: { ...state.player, activePowerups, shielded, weaponBoost } };
  }),

  tickPowerups: () => set((state) => {
    const now = Date.now();
    const activePowerups = state.player.activePowerups.filter((a) => a.expiresAt > now);
    const shielded = activePowerups.some((a) => a.type === 'shield');
    const weaponBoost = activePowerups.some((a) => a.type === 'weaponUpgrade');
    return { player: { ...state.player, activePowerups, shielded, weaponBoost } };
  }),

  // ── Multiplayer actions ──────────────────────────────────
  setOnline: (isOnline, roomCode = null, playerId = null) =>
    set({ isOnline, roomCode, playerId }),

  setPlayerName: (playerName) => set({ playerName }),

  setRemotePlayer: (id, state) =>
    set((s) => ({
      remotePlayers: {
        ...s.remotePlayers,
        [id]: { ...s.remotePlayers[id], id, ...state } as RemotePlayerState,
      },
    })),

  removeRemotePlayer: (id) =>
    set((s) => {
      const next = { ...s.remotePlayers };
      delete next[id];
      return { remotePlayers: next };
    }),

  clearRemotePlayers: () => set({ remotePlayers: {} }),

  setPlayerCustomization: (p) => set({ playerCustomization: p }),

  addHydroTokens: (amount) => set((state) => {
    const nextBalance = state.hydroTokens + amount;
    TokenManager.saveBalance(nextBalance);
    return { hydroTokens: nextBalance };
  }),

  spendHydroTokens: (amount) => {
    const current = get().hydroTokens;
    if (current < amount) return false;
    const nextBalance = current - amount;
    TokenManager.saveBalance(nextBalance);
    set({ hydroTokens: nextBalance });
    return true;
  },

  purchasePart: (category, level) => {
    const info = PART_UPGRADES[category].find(p => p.level === level);
    if (!info) return;
    const { hydroTokens, inventory, spendHydroTokens } = get();
    if (inventory[category].includes(level)) return;
    
    if (spendHydroTokens(info.cost)) {
      const nextInv = { ...inventory, [category]: [...inventory[category], level] };
      InventoryManager.save(nextInv);
      set({ inventory: nextInv });
    }
  },

  sellPart: (category, level) => {
    if (level === 0) return; // Cannot sell stock
    const info = PART_UPGRADES[category].find(p => p.level === level);
    if (!info) return;
    const { inventory, playerCustomization, setPlayerCustomization, addHydroTokens } = get();
    if (!inventory[category].includes(level)) return;

    const nextInv = { ...inventory, [category]: inventory[category].filter(l => l !== level) };
    
    // Revert to stock if selling the currently equipped part
    if (playerCustomization.partUpgrades[category] === level) {
      setPlayerCustomization({
        ...playerCustomization,
        partUpgrades: { ...playerCustomization.partUpgrades, [category]: 0 }
      });
    }

    InventoryManager.save(nextInv);
    addHydroTokens(Math.floor(info.cost * SELL_PERCENT));
    set({ inventory: nextInv });
  },

  purchaseVisual: (type, value, cost) => {
    const { inventory, spendHydroTokens } = get();
    const key = type === 'hull' ? 'hullColors' : 'neonColors';
    if (inventory[key].includes(value as any)) return true;

    if (spendHydroTokens(cost)) {
      const nextInv = { ...inventory, [key]: [...inventory[key], value] };
      InventoryManager.save(nextInv);
      set({ inventory: nextInv });
      return true;
    }
    return false;
  },
}));
