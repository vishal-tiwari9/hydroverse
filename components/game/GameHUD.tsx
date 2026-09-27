'use client';
import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { WEAPONS } from '@/lib/weapons';
import { ScoreManager } from '@/lib/scoreManager';
import type { AIBoat } from '@/lib/aiBoat';

interface GameHUDProps {
  aiBoats: AIBoat[];
  playerWorldPos: { x: number; z: number } | null;
  onReturnLobby: () => void;
}

export default function GameHUD({ aiBoats, playerWorldPos, onReturnLobby }: GameHUDProps) {
  const { player, matchTimer, settings, killFeed } = useGameStore();
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const [showScores, setShowScores] = useState(false);
  // VR detection and prompt are handled globally in HydroApp's VRDetector component

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.code === 'Tab') { e.preventDefault(); setShowScores(true); } };
    const onUp   = (e: KeyboardEvent) => { if (e.code === 'Tab') setShowScores(false); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  const mins = Math.floor(matchTimer / 60);
  const secs = Math.floor(matchTimer % 60);
  const timerDanger = matchTimer < 30;

  // Draw minimap
  useEffect(() => {
    const c = minimapRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const cx = 70, cy = 70, sc = 0.33;
    ctx.clearRect(0, 0, 140, 140);
    ctx.fillStyle = 'rgba(0,4,12,0.95)';
    ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,200,255,0.1)'; ctx.lineWidth = 1;
    [28, 52, 68].forEach((r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); });
    // AI boats
    aiBoats.forEach((b) => {
      if (!b.alive) return;
      ctx.fillStyle = b.team === 'blue' ? '#4488ff' : '#ff2244';
      ctx.beginPath();
      ctx.arc(cx + b.mesh.position.x * sc, cy + b.mesh.position.z * sc, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    // Player
    if (playerWorldPos) {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(cx + playerWorldPos.x * sc, cy + playerWorldPos.z * sc, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,200,255,0.18)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 69, 0, Math.PI * 2); ctx.stroke();
  });

  const weapon = WEAPONS[player.weaponIdx] || WEAPONS[0];


  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>

      {/* ── Top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'flex-start',
      }}>
        <div style={{
          background: 'var(--panel)', borderBottom: '1px solid var(--border)',
          padding: '8px 22px', textAlign: 'center', borderRight: '1px solid var(--border)',
          clipPath: 'polygon(0 0,100% 0,100% 100%,12px 100%)', paddingLeft: 30,
        }}>
          <div style={{ fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,0.35)' }}>
            {settings.mode === 'TDM' ? 'RED' : settings.mode === 'LBS' ? 'ENEMIES' : 'SCORE'}
          </div>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 22, fontWeight: 700, color: '#ff4466', lineHeight: 1, textShadow: '0 0 12px rgba(255,50,80,0.6)' }}>
            {settings.mode === 'TDM' ? ScoreManager.teamScores.red : settings.mode === 'LBS' ? aiBoats.filter((b) => b.alive).length : ScoreManager.players['player']?.score ?? 0}
          </div>
        </div>

        {settings.mode !== 'LBS' && (
          <div style={{
            background: 'rgba(0,10,20,0.9)', border: '1px solid rgba(0,200,255,0.3)',
            borderTop: 'none', padding: '6px 26px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Rajdhani'", fontSize: 26, fontWeight: 700, lineHeight: 1,
              color: timerDanger ? '#ff3344' : 'var(--cyan)',
              animation: timerDanger ? 'blink 0.5s infinite' : 'none',
            }}>
              {mins}:{secs.toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: 8, letterSpacing: 3, color: 'rgba(0,200,255,0.4)' }}>MATCH TIME</div>
          </div>
        )}

        <div style={{
          background: 'var(--panel)', borderBottom: '1px solid var(--border)',
          padding: '8px 22px', textAlign: 'center', borderLeft: '1px solid var(--border)',
          clipPath: 'polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%)', paddingRight: 30,
        }}>
          <div style={{ fontSize: 8, letterSpacing: 3, color: 'rgba(255,255,255,0.35)' }}>
            {settings.mode === 'TDM' ? 'BLUE' : 'ALIVE'}
          </div>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 22, fontWeight: 700, color: '#44aaff', lineHeight: 1, textShadow: '0 0 12px rgba(50,150,255,0.6)' }}>
            {settings.mode === 'TDM' ? ScoreManager.teamScores.blue : aiBoats.filter((b) => b.alive).length}
          </div>
        </div>
      </div>

      {/* ── Kill feed ── */}
      <div style={{
        position: 'absolute', top: 84, right: 18,
        display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 270,
      }}>
        {killFeed.map((k) => (
          <div key={k.id} style={{
            background: 'rgba(0,8,18,0.85)',
            borderLeft: `2px solid ${k.cls === 'red' ? '#ff3344' : k.cls === 'gold' ? '#ffcc00' : k.cls === 'powerup' ? '#ffcc00' : 'var(--cyan)'}`,
            padding: '5px 10px', fontSize: 10,
            color: 'rgba(255,255,255,0.75)', animation: 'kfFade 3.5s forwards',
          }}>
            {k.msg}
          </div>
        ))}
      </div>

      {/* ── Crosshair ── */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 22, height: 22 }}>
        <svg viewBox="0 0 22 22" style={{ width: '100%', height: '100%' }}>
          <circle cx="11" cy="11" r="4" fill="none" stroke="rgba(0,232,216,0.8)" strokeWidth="1.5" />
          <line x1="11" y1="0" x2="11" y2="6" stroke="rgba(0,232,216,0.8)" strokeWidth="1.5" />
          <line x1="11" y1="16" x2="11" y2="22" stroke="rgba(0,232,216,0.8)" strokeWidth="1.5" />
          <line x1="0" y1="11" x2="6" y2="11" stroke="rgba(0,232,216,0.8)" strokeWidth="1.5" />
          <line x1="16" y1="11" x2="22" y2="11" stroke="rgba(0,232,216,0.8)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* ── Bottom HUD ── */}
      <div style={{
        position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 14, alignItems: 'flex-end',
      }}>
        {/* Health */}
        <PanelBox label="HULL" value={Math.round(player.health)} color={player.health > 50 ? '#00ff88' : player.health > 25 ? '#ffaa00' : '#ff3355'} pct={player.health} />
        {/* Ammo */}
        <PanelBox label="AMMO" value={Math.round(player.ammo)} color="#ffdd44" pct={player.ammo} />
        {/* Speed */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)', padding: '9px 16px',
          clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 8, letterSpacing: 3, color: 'rgba(0,200,255,0.45)', marginBottom: 3 }}>SPD</div>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 20, fontWeight: 700, color: 'var(--cyan)' }}>
            {Math.abs(Math.round(player.speed * 3))}<span style={{ fontSize: 11 }}>KT</span>
          </div>
        </div>
      </div>

      {/* ── Boost ring ── */}
      <div style={{ position: 'absolute', bottom: 22, left: 22, width: 76, height: 76 }}>
        <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(0,200,255,0.12)" strokeWidth="4" />
          <circle
            cx="38" cy="38" r="32" fill="none"
            stroke={player.boost < 20 ? '#ff3355' : 'var(--cyan)'}
            strokeWidth="4"
            strokeDasharray={201}
            strokeDashoffset={201 * (1 - player.boost / 100)}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Rajdhani'", fontSize: 15, fontWeight: 700, color: 'var(--cyan)' }}>{Math.round(player.boost)}</span>
          <span style={{ fontSize: 7, letterSpacing: 2, color: 'rgba(0,200,255,0.4)' }}>BOOST</span>
        </div>
      </div>

      {/* ── Minimap ── */}
      <div style={{
        position: 'absolute', bottom: 22, right: 22, width: 140, height: 140,
        background: 'rgba(0,5,15,0.9)', border: '1px solid rgba(0,200,255,0.25)',
        borderRadius: '50%', overflow: 'hidden',
      }}>
        <canvas ref={minimapRef} width={140} height={140} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* ── Active power-ups ── */}
      {player.activePowerups.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 155, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          {player.activePowerups.map((p) => {
            const secs = Math.ceil((p.expiresAt - Date.now()) / 1000);
            return (
              <div key={p.type} style={{
                background: 'rgba(0,0,0,0.82)',
                border: `1px solid ${p.cssColor}88`,
                padding: '4px 12px',
                display: 'flex', alignItems: 'center', gap: 6,
                clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)',
                boxShadow: `0 0 10px ${p.cssColor}44`,
              }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <span style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10, letterSpacing: 2, fontWeight: 700,
                  color: p.cssColor, textShadow: `0 0 6px ${p.cssColor}`,
                }}>{p.label}</span>
                <span style={{
                  fontFamily: "'Rajdhani'", fontSize: 14, fontWeight: 700,
                  color: secs <= 3 ? '#ff3344' : 'rgba(255,255,255,0.6)',
                  minWidth: 20, textAlign: 'right',
                }}>{secs}s</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Active weapon ── */}
      <div style={{
        position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,10,20,0.85)', border: '1px solid rgba(0,200,255,0.25)',
        padding: '5px 16px', fontSize: 10, letterSpacing: 2, color: 'var(--cyan)',
        clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)',
        display: 'flex', gap: 14, alignItems: 'center',
      }}>
        <span style={{ fontSize: 20 }}>{weapon.icon}</span>
        <span style={{ fontFamily: "'Rajdhani'", fontSize: 14, fontWeight: 700 }}>{weapon.name}</span>
        <span style={{ color: 'rgba(0,200,255,0.55)', fontSize: 9 }}>
          {weapon.ammoType === 'heat' ? 'HEAT' : `${weapon.maxAmmo} RDS`}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9 }}>Q/E SWITCH</span>
      </div>

      {/* ── Dead/Respawn overlay ── */}
      {player.dead && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255,0,50,0.4) 100%)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 11, letterSpacing: 5, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            VESSEL DESTROYED
          </div>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 72, fontWeight: 700, color: '#ff3344', textShadow: '0 0 30px rgba(255,30,60,0.8)', animation: 'blink 0.5s infinite' }}>
            ☠
          </div>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 13, letterSpacing: 4, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
            RESPAWNING...
          </div>
        </div>
      )}

      {/* ── Shield vignette ── */}
      {player.shielded && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,170,255,0.25) 100%)',
          boxShadow: 'inset 0 0 40px rgba(0,170,255,0.3)',
          animation: 'blink 2s infinite',
        }} />
      )}

      {/* ── Hit vignette ── */}
      {player.health < 30 && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,0,50,0.35) 100%)',
          animation: 'blink 0.8s infinite',
        }} />
      )}

      {/* ── Controls hint (keyboard only) ── */}
      {!isTouch && (
        <div style={{
          position: 'absolute', top: 72, left: 18, fontSize: 9,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px',
          color: 'rgba(255,255,255,0.25)',
        }}>
          {[
            ['W/S','THROTTLE'], ['A/D','STEER'], ['SPACE','FIRE'],
            ['SHIFT','BOOST'], ['Q/E','WEAPON'], ['TAB','SCORES'],
          ].map(([k, v]) => (
            <span key={k}>
              <span style={{ background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.2)', padding: '1px 5px', color: 'var(--cyan)', marginRight: 5, fontSize: 8, borderRadius: 2 }}>{k}</span>
              {v}
            </span>
          ))}
        </div>
      )}

      {/* ── Scores overlay (TAB) ── */}
      {showScores && (() => {
        const scores = ScoreManager.getSorted();
        return (
          <div style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,4,12,0.82)', zIndex: 60, pointerEvents: 'none',
          }}>
            <div style={{
              background: 'rgba(0,8,20,0.97)', border: '1px solid rgba(0,200,255,0.3)',
              minWidth: 420, padding: '28px 36px',
              clipPath: 'polygon(16px 0,100% 0,calc(100% - 16px) 100%,0 100%)',
            }}>
              <div style={{
                fontFamily: "'Share Tech Mono', monospace", fontSize: 11,
                letterSpacing: 5, color: 'var(--cyan)', marginBottom: 18, textAlign: 'center',
              }}>
                SCOREBOARD
              </div>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px',
                fontSize: 9, letterSpacing: 3, color: 'rgba(0,200,255,0.45)',
                borderBottom: '1px solid rgba(0,200,255,0.15)', paddingBottom: 8, marginBottom: 8,
              }}>
                <span>PILOT</span>
                <span style={{ textAlign: 'center' }}>KILLS</span>
                <span style={{ textAlign: 'center' }}>DEATHS</span>
                <span style={{ textAlign: 'center' }}>SCORE</span>
              </div>
              {scores.map((s, i) => (
                <div key={s.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px',
                  padding: '7px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  fontFamily: "'Rajdhani'", fontSize: 16, fontWeight: 700,
                  color: s.id === 'player' ? 'var(--cyan)' : 'rgba(255,255,255,0.75)',
                  background: i === 0 ? 'rgba(255,220,0,0.06)' : 'transparent',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i === 0 && <span style={{ color: '#ffcc00', fontSize: 12 }}>▲</span>}
                    {s.name}
                    {s.id === 'player' && <span style={{ fontSize: 9, color: 'rgba(0,200,255,0.5)', letterSpacing: 2 }}>YOU</span>}
                  </span>
                  <span style={{ textAlign: 'center', color: '#ff6688' }}>{s.kills}</span>
                  <span style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>{s.deaths}</span>
                  <span style={{ textAlign: 'center', color: '#ffcc00' }}>{s.score}</span>
                </div>
              ))}
              <div style={{
                marginTop: 18, fontSize: 9, letterSpacing: 3,
                color: 'rgba(255,255,255,0.2)', textAlign: 'center',
              }}>
                HOLD TAB TO VIEW
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Return to lobby ── */}
      <button
        onClick={onReturnLobby}
        style={{
          position: 'absolute', top: 72, right: 18,
          fontFamily: "'Share Tech Mono'", fontSize: 9, letterSpacing: 3,
          padding: '5px 12px', background: 'transparent',
          border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', pointerEvents: 'all',
        }}
      >
        ← LOBBY
      </button>

    </div>
  );
}

function PanelBox({ label, value, color, pct }: { label: string; value: number; color: string; pct: number }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      padding: '9px 16px', width: 150,
      clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)',
    }}>
      <div style={{ fontSize: 8, letterSpacing: 3, color: 'rgba(0,200,255,0.45)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Rajdhani'", fontSize: 22, fontWeight: 700, color: 'var(--cyan)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 5 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.2s', boxShadow: `0 0 8px ${color}88` }} />
      </div>
    </div>
  );
}
