'use client';
import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { PART_UPGRADES, PartCategory } from '@/lib/partData';

export default function InventoryPanel({ onClose }: { onClose: () => void }) {
  const { inventory, playerCustomization } = useGameStore();

  const boxStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,10,0.85)', backdropFilter: 'blur(12px)',
  };

  const categories: PartCategory[] = ['engine', 'rudder', 'hull'];

  return (
    <div style={boxStyle} onClick={onClose}>
      <div 
        style={{
          background: 'rgba(0,12,24,0.98)', border: '1px solid rgba(0,200,255,0.3)',
          padding: '40px', minWidth: 500, boxShadow: '0 0 40px rgba(0,0,0,0.5)',
          clipPath: 'polygon(20px 0, 100% 0, calc(100% - 20px) 100%, 0 100%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "'Rajdhani'", fontSize: 24, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 6, marginBottom: 4 }}>
          VESSEL INVENTORY
        </div>
        <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 32 }}>
          OWNED HARDWARE & REGISTERED PARTS
        </div>

        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' }}>
              {cat} MODULES
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PART_UPGRADES[cat].map(part => {
                const isOwned = inventory[cat].includes(part.level);
                const isEquipped = playerCustomization?.partUpgrades?.[cat] === part.level;
                
                if (!isOwned) return null;

                return (
                  <div key={part.level} style={{
                    background: isEquipped ? 'rgba(0,200,255,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isEquipped ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}`,
                    padding: '10px 16px', borderRadius: 4, minWidth: 100,
                    display: 'flex', flexDirection: 'column', gap: 4
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isEquipped ? 'var(--cyan)' : 'white' }}>
                      {part.label}
                    </div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>
                      {isEquipped ? 'INSTALLED' : 'IN STORAGE'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button onClick={onClose} style={{
          marginTop: 20, width: '100%', padding: '12px', background: 'transparent', 
          color: 'rgba(255,255,255,0.5)', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', 
          cursor: 'pointer', letterSpacing: 4, fontSize: 10
        }}>
          CLOSE [I]
        </button>
      </div>
    </div>
  );
}