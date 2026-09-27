export type PartCategory = 'engine' | 'rudder' | 'hull';

export interface PartInfo {
  level: number;
  label: string;
  cost: number;
}

export const PART_UPGRADES: Record<PartCategory, PartInfo[]> = {
  engine: [
    { level: 0, label: 'STOCK',   cost: 0 },
    { level: 1, label: 'STREET',  cost: 650 },
    { level: 2, label: 'PRO',     cost: 1500 },
    { level: 3, label: 'EXTREME', cost: 3500 },
  ],
  rudder: [
    { level: 0, label: 'STOCK',   cost: 0 },
    { level: 1, label: 'STREET',  cost: 400 },
    { level: 2, label: 'PRO',     cost: 1100 },
    { level: 3, label: 'EXTREME', cost: 2600 },
  ],
  hull: [
    { level: 0, label: 'STOCK',   cost: 0 },
    { level: 1, label: 'STREET',  cost: 800 },
    { level: 2, label: 'PRO',     cost: 1800 },
    { level: 3, label: 'EXTREME', cost: 4500 },
  ]
};

export const SELL_PERCENT = 0.5;