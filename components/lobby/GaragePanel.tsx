'use client';
import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { connectSocket } from '@/lib/socket';
import { PART_UPGRADES, SELL_PERCENT, PartCategory, PartInfo } from '@/lib/partData';
import type { PlayerCustomization } from '@/lib/multiplayer';

const NEON_COLORS = [
  { name: 'NONE', value: null, cost: 0 },
  { name: 'CYAN', value: 0x00e8d8, cost: 400 },
  { name: 'LAVA', value: 0xff4400, cost: 750 },
  { name: 'LIME', value: 0x44ee88, cost: 750 },
  { name: 'PURPLE', value: 0xcc44ff, cost: 1200 },
];

const HULL_COLORS = [
  { name: 'OCEAN', value: 0x0066cc, cost: 0 },
  { name: 'STEALTH', value: 0x222222, cost: 1800 },
  { name: 'CRIMSON', value: 0xcc1133, cost: 950 },
  { name: 'GOLD', value: 0xffcc00, cost: 4500 },
  { name: 'FOREST', value: 0x228833, cost: 950 },
];

export default function GaragePanel({ onClose }: { onClose: () => void }) {
  const { 
    playerCustomization, setPlayerCustomization, isOnline, 
    hydroTokens, inventory, purchasePart, sellPart, purchaseVisual 
  } = useGameStore();

  const [staged, setStaged] = useState<PlayerCustomization>({ ...playerCustomization });

  const totalCost = useMemo(() => {
    let cost = 0;
    // Hull Color cost
    const h = HULL_COLORS.find(c => c.value === staged.primaryColor);
    if (h && !inventory.hullColors.includes(h.value)) cost += h.cost;
    // Neon cost
    const n = NEON_COLORS.find(c => c.value === staged.neonColor);
    if (n && !inventory.neonColors.includes(n.value as any)) cost += n.cost;
    // Part costs
    (['engine', 'rudder'] as const).forEach(cat => {
      const level = staged.partUpgrades[cat];
      if (!inventory[cat].includes(level)) {
        cost += PART_UPGRADES[cat].find(p => p.level === level)?.cost || 0;
      }
    });
    return cost;
  }, [staged, inventory]);

  const handleApply = () => {
    if (hydroTokens < totalCost) return;

    // 1. Purchase visuals
    const h = HULL_COLORS.find(c => c.value === staged.primaryColor);
    if (h && !inventory.hullColors.includes(h.value)) purchaseVisual('hull', h.value, h.cost);
    const n = NEON_COLORS.find(c => c.value === staged.neonColor);
    if (n && !inventory.neonColors.includes(n.value as any)) purchaseVisual('neon', n.value as any, n.cost);

    // 2. Purchase parts
    (['engine', 'rudder'] as const).forEach(cat => {
      const level = staged.partUpgrades[cat];
      if (!inventory[cat].includes(level)) purchasePart(cat, level);
    });

    // 3. Commit customization
    setPlayerCustomization(staged);
    if (isOnline) {
      const socket = connectSocket();
      socket?.emit('room:update_customization', staged);
    }
    onClose();
  };

  const stage = (patch: any) => {
    setStaged(prev => ({ ...prev, ...patch }));
  };

  const boxStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
  };

  return (
    <div style={boxStyle}>
      <div style={{
        background: 'rgba(0,8,20,0.95)', border: '2px solid #ffcc00',
        padding: '40px', minWidth: 450, boxShadow: '0 0 50px rgba(255,204,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
          <div>
            <div style={{ fontFamily: "'Rajdhani'", fontSize: 32, fontWeight: 700, color: '#ffcc00', letterSpacing: 6, marginBottom: 4 }}>
              HYDRO-GARAGE
            </div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: 'rgba(255,255,255,0.3)' }}>
              VESSEL CUSTOMIZATION & TUNING
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 2 }}>BALANCE</div>
            <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 18, color: '#ffcc00' }}>
              {hydroTokens} <span style={{ fontSize: 10 }}>TOKENS</span>
            </div>
          </div>
        </div>

        {/* Hull Color Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: '#ffcc00', letterSpacing: 3, marginBottom: 12 }}>HULL COLOR</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {HULL_COLORS.map(c => (
              <button 
                key={c.name}
                onClick={() => stage({ primaryColor: c.value })}
                style={{
                  flex: 1, padding: '8px', fontSize: 10, cursor: 'pointer',
                  background: staged?.primaryColor === c.value ? '#ffcc0022' : 'transparent',
                  border: `1px solid ${staged?.primaryColor === c.value ? '#ffcc00' : 'rgba(255,255,255,0.1)'}`,
                  color: staged?.primaryColor === c.value ? '#ffcc00' : 'white',
                  display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center'
                }}
              >
                <span>{c.name}</span>
                {!inventory.hullColors.includes(c.value) && c.cost > 0 && (
                  <span style={{ fontSize: 8, opacity: 0.6 }}>{c.cost} HT</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Neon Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: '#ffcc00', letterSpacing: 3, marginBottom: 12 }}>NEON UNDERGLOW</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {NEON_COLORS.map(c => (
              <button 
                key={c.name}
                onClick={() => stage({ neonColor: c.value, glowIntensity: c.value ? 2 : 0 })}
                style={{
                  flex: 1, padding: '8px', fontSize: 10, cursor: 'pointer',
                  background: staged?.neonColor === c.value ? '#ffcc0022' : 'transparent',
                  border: `1px solid ${staged?.neonColor === c.value ? '#ffcc00' : 'rgba(255,255,255,0.1)'}`,
                  color: staged?.neonColor === c.value ? '#ffcc00' : 'white',
                  display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center'
                }}
              >
                <span>{c.name}</span>
                {!inventory.neonColors.includes(c.value as any) && c.cost > 0 && (
                  <span style={{ fontSize: 8, opacity: 0.6 }}>{c.cost} HT</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Performance Parts */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: '#ffcc00', letterSpacing: 3, marginBottom: 12 }}>PERFORMANCE UPGRADES</div>
          <UpgradeRow
            label="ENGINE (SPEED)"
            category="engine"
            equipped={staged?.partUpgrades?.engine ?? 0}
            inventory={inventory.engine}
            onEquip={(l) => stage({ partUpgrades: { ...(staged?.partUpgrades || {}), engine: l }})}
            onBuy={(l) => stage({ partUpgrades: { ...(staged?.partUpgrades || {}), engine: l }})}
            onSell={(l) => sellPart('engine', l)}
          />
          <UpgradeRow
            label="RUDDER (HANDLING)"
            category="rudder"
            equipped={staged?.partUpgrades?.rudder ?? 0}
            inventory={inventory.rudder}
            onEquip={(l) => stage({ partUpgrades: { ...(staged?.partUpgrades || {}), rudder: l }})}
            onBuy={(l) => stage({ partUpgrades: { ...(staged?.partUpgrades || {}), rudder: l }})}
            onSell={(l) => sellPart('rudder', l)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.4)',
            fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', letterSpacing: 4,
          }}>
            CANCEL
          </button>
          <button 
            disabled={hydroTokens < totalCost}
            onClick={handleApply} 
            style={{
              flex: 2, padding: '12px', background: hydroTokens < totalCost ? '#333' : '#ffcc00', color: 'black',
              fontWeight: 700, border: 'none', cursor: hydroTokens < totalCost ? 'not-allowed' : 'pointer', letterSpacing: 4,
              clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
            }}
          >
            {totalCost > 0 ? `PURCHASE & APPLY (${totalCost} HT)` : 'APPLY UPGRADES'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UpgradeRow({ 
  label, 
  category, 
  equipped, 
  inventory, 
  onEquip, 
  onBuy, 
  onSell 
}: { 
  label: string, 
  category: PartCategory, 
  equipped: number, 
  inventory: number[],
  onEquip: (l: number) => void,
  onBuy: (l: number) => void,
  onSell: (l: number) => void
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>{label}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].map(i => {
            const isOwned = inventory.includes(i);
            const isEquipped = equipped === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => isOwned ? onEquip(i) : onBuy(i)}
                style={{
                  width: 32, height: 10, cursor: 'pointer',
                  background: isEquipped ? '#ffcc00' : isOwned ? '#ffcc0044' : 'rgba(255,255,255,0.05)',
                  border: isEquipped ? '1px solid #ffcc00' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.1s'
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Info/Action Context */}
      <div style={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {hovered !== null && (() => {
          const info = PART_UPGRADES[category][hovered];
          const isOwned = inventory.includes(hovered);
          const isEquipped = equipped === hovered;

          if (isEquipped && hovered > 0) {
            return (
              <button 
                onClick={(e) => { e.stopPropagation(); onSell(hovered); }}
                style={{ background: 'transparent', border: 'none', color: '#ff3344', fontSize: 9, cursor: 'pointer', fontWeight: 700, letterSpacing: 1 }}
              >
                SELL FOR {Math.floor(info.cost * SELL_PERCENT)} HT
              </button>
            );
          }
          if (!isOwned) return <span style={{ fontSize: 9, color: '#ffcc00', letterSpacing: 1 }}>{info.label}: {info.cost} HT</span>;
          if (isOwned && !isEquipped) return <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>EQUIP {info.label}</span>;
          return null;
        })()}
      </div>
    </div>
  );
}