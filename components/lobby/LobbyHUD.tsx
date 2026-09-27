'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { NPC_DEFS, NpcDef } from './NpcBoats';
import type { GameMode } from '@/store/gameStore';
import OnlinePanel from './OnlinePanel';
import GaragePanel from './GaragePanel';
import InventoryPanel from './InventoryPanel';

interface LobbyHUDProps {
  nearNpcId: string | null;
}

export default function LobbyHUD({ nearNpcId }: LobbyHUDProps) {
  const { setSettings, startMatch, settings, hydroTokens } = useGameStore();
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const [showGarage, setShowGarage] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [typedText, setTypedText] = useState('');
  const prevNpcId = useRef<string | null>(null);
  const typeTimer = useRef<NodeJS.Timeout | null>(null);

  const npc = nearNpcId ? NPC_DEFS.find((n) => n.id === nearNpcId) : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyI') {
        setShowInventory(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // When NPC changes, type out dialogue
  useEffect(() => {
    if (nearNpcId !== prevNpcId.current) {
      prevNpcId.current = nearNpcId;
      setDialogueIdx(0);
      setShowPanel(false);
    }
    if (!npc) { setTypedText(''); return; }

    const text = npc.greeting[dialogueIdx % npc.greeting.length];
    setTypedText('');
    let i = 0;
    if (typeTimer.current) clearInterval(typeTimer.current);
    typeTimer.current = setInterval(() => {
      i++;
      setTypedText(text.slice(0, i));
      if (i >= text.length) clearInterval(typeTimer.current!);
    }, 30);
    return () => { if (typeTimer.current) clearInterval(typeTimer.current); };
  }, [npc, dialogueIdx, nearNpcId]);

  const handleInteract = () => {
    if (!npc) return;
    const nextIdx = dialogueIdx + 1;
    if (nextIdx >= npc.greeting.length) {
      if (npc.openOnline) {
        setShowOnline(true);
      } else if (npc.openGarage) {
        setShowGarage(true);
      } else {
        setShowPanel(true);
      }
    } else {
      setDialogueIdx(nextIdx);
    }
  };

  const handleLaunch = () => {
    if (!npc) return;
    if (npc.openOnline) { setShowOnline(true); return; }
    setSettings({ mode: npc.mode as GameMode });
    startMatch();
  };

  return (
    <>
      {showOnline && <OnlinePanel onClose={() => setShowOnline(false)} />}
      {showGarage && <GaragePanel onClose={() => setShowGarage(false)} />}
      {showInventory && <InventoryPanel onClose={() => setShowInventory(false)} />}

      {/* Bottom controls hint */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 16, alignItems: 'center', zIndex: 100, pointerEvents: 'none',
      }}>
        {(['W','A','S','D'] as const).map((k) => (
          <div key={k} style={{
            background: 'rgba(0,10,20,0.85)', border: '1px solid rgba(0,200,255,0.3)',
            padding: '4px 10px', fontSize: 12, color: 'var(--cyan)', fontFamily: "'Share Tech Mono'",
          }}>{k}</div>
        ))}
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 3 }}>NAVIGATE</span>
        {npc && (
          <>
            <div style={{
              background: 'rgba(0,200,255,0.15)', border: '1px solid rgba(0,200,255,0.5)',
              padding: '4px 14px', fontSize: 12, color: 'var(--cyan)', fontFamily: "'Share Tech Mono'",
              animation: 'blink 1.2s infinite',
            }}>E</div>
            <span style={{ color: 'rgba(0,200,255,0.7)', fontSize: 10, letterSpacing: 3 }}>TALK</span>
          </>
        )}
      </div>

      {/* NPC dialogue */}
      {npc && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          width: 500, zIndex: 100,
        }}>
          {/* Mode title bar */}
          <div style={{
            background: 'rgba(0,4,12,0.92)', border: `1px solid ${npcColor(npc)}`,
            borderBottom: 'none', padding: '6px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            clipPath: 'polygon(10px 0,100% 0,100% 100%,0 100%)',
          }}>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 16, fontWeight: 700, color: npcColor(npc), letterSpacing: 4 }}>
              {npc.label}
            </span>
            <span style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.3)' }}>
              {npc.subtitle}
            </span>
          </div>

          {/* Dialogue text */}
          <div style={{
            background: 'rgba(0,4,12,0.95)', border: `1px solid ${npcColor(npc)}`,
            padding: '14px 18px 10px',
            clipPath: 'polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)',
          }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, minHeight: 24, fontFamily: "'Share Tech Mono'" }}>
              <span style={{ color: npcColor(npc), marginRight: 8 }}>▶</span>
              {typedText}
              <span style={{ animation: 'blink 0.8s infinite', color: npcColor(npc) }}>█</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.25)' }}>
                [{dialogueIdx + 1}/{npc.greeting.length}]
              </span>
              <button
                onClick={handleInteract}
                style={{
                  fontFamily: "'Share Tech Mono'", fontSize: 10, letterSpacing: 3,
                  padding: '4px 16px', background: 'transparent',
                  border: `1px solid ${npcColor(npc)}`, color: npcColor(npc),
                  cursor: 'pointer', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)',
                }}
              >
                {dialogueIdx + 1 >= npc.greeting.length ? 'LAUNCH ▶' : 'NEXT ▶'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode launch panel */}
      {showPanel && npc && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: 'rgba(0,6,18,0.97)', border: `2px solid ${npcColor(npc)}`,
            padding: '36px 48px', minWidth: 420, textAlign: 'center',
            boxShadow: `0 0 60px ${npcColor(npc)}44`,
          }}>
            <div style={{
              fontFamily: "'Rajdhani',sans-serif", fontSize: 11, letterSpacing: 8,
              color: 'rgba(255,255,255,0.3)', marginBottom: 8,
            }}>GAME MODE</div>
            <div style={{
              fontFamily: "'Rajdhani',sans-serif", fontSize: 48, fontWeight: 700,
              letterSpacing: 8, color: npcColor(npc), marginBottom: 4,
            }}>{npc.label}</div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: 'rgba(255,255,255,0.3)', marginBottom: 32 }}>
              {npc.subtitle}
            </div>

            {/* Settings */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 32, justifyContent: 'center' }}>
              <SettingGroup label="BOTS" options={['3','5','7']} value={String(settings.bots)}
                onChange={(v) => setSettings({ bots: Number(v) as any })} />
              <SettingGroup label="DIFFICULTY" options={['CADET','VETERAN','ACE']} value={settings.difficulty}
                onChange={(v) => setSettings({ difficulty: v as any })} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowPanel(false)} style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: 12, letterSpacing: 4,
                padding: '11px 28px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
              }}>CANCEL</button>
              <button onClick={handleLaunch} style={{
                fontFamily: "'Rajdhani',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 6,
                padding: '12px 40px', background: `${npcColor(npc)}22`,
                border: `1px solid ${npcColor(npc)}`, color: npcColor(npc),
                cursor: 'pointer', clipPath: 'polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%)',
              }}>⊕ LAUNCH MATCH</button>
            </div>
          </div>
        </div>
      )}

      {/* Top logo */}
      <div style={{
        position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', zIndex: 100,
      }}>
        <div className="logo-text" style={{ fontSize: 32, letterSpacing: 12, pointerEvents: 'none' }}>HYDROVERSE</div>
        <div style={{ fontSize: 25, letterSpacing: 6, color: 'rgb(0, 0, 0)', marginTop: 2, pointerEvents: 'none' }}>
          APPROACH A VESSEL TO SELECT GAME MODE
        </div>

      </div>

      {/* Persistent Wallet & Inventory Access */}
      <div style={{
        position: 'fixed', top: 24, right: 32,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', zIndex: 500
      }}>
        <div style={{
          background: 'rgba(0,8,20,0.85)', border: '1px solid #ffcc0044',
          padding: '10px 20px', textAlign: 'right',
          clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 2 }}>WALLET</div>
          <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 18, color: '#ffcc00', textShadow: '0 0 10px rgba(255,204,0,0.3)' }}>
            {hydroTokens?.toLocaleString() ?? 0} <span style={{ fontSize: 10 }}>HT</span>
          </div>
        </div>

        <button 
          onClick={() => setShowInventory(true)}
          style={{
            background: 'rgba(0,200,255,0.1)', border: '1px solid rgba(0,200,255,0.3)',
            color: 'var(--cyan)', padding: '6px 14px', fontSize: 10, cursor: 'pointer',
            fontFamily: "'Share Tech Mono'", letterSpacing: 2
          }}
        >
          INVENTORY [I]
        </button>
      </div>
    </>
  );
}

function npcColor(npc: NpcDef): string {
  const map: Record<string, string> = {
    ffa: '#ff3344', tdm: '#4488ff', lbs: '#44ee88', garage: '#ffcc00',
  };
  return map[npc.id] || '#00e8d8';
}

function SettingGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(0,200,255,0.4)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 5 }}>
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} style={{
            fontFamily: "'Share Tech Mono'", fontSize: 10, padding: '4px 12px',
            background: o === value ? 'rgba(0,200,255,0.15)' : 'transparent',
            border: `1px solid ${o === value ? 'var(--cyan)' : 'rgba(0,200,255,0.2)'}`,
            color: o === value ? 'var(--cyan)' : 'rgba(0,200,255,0.4)',
            cursor: 'pointer',
          }}>{o}</button>
        ))}
      </div>
    </div>
  );
}
