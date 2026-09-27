import { PlayerInventory } from './multiplayer';

const KEY = 'hydro_inventory_data';

export const InventoryManager = {
  load(): PlayerInventory {
    const defaults: PlayerInventory = { 
      engine: [0], rudder: [0], hull: [0], 
      hullColors: [0x0066cc], neonColors: [null] 
    };
    if (typeof window === 'undefined') return defaults;
    const saved = localStorage.getItem(KEY);
    try {
      return saved ? JSON.parse(saved) : defaults;
    } catch {
      return defaults;
    }
  },
  save(inv: PlayerInventory) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(inv));
  }
};