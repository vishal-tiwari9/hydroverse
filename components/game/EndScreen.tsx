'use client';
import React, { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScoreManager, PlayerScore } from '@/lib/scoreManager';

interface EndScreenProps {
  winner: string;
  winnerColor: string;
  onRematch: () => void;
  onLobby: () => void;
}

function TeamTable({ players, teamColor, teamLabel }: { players: PlayerScore[]; teamColor: string; teamLabel: string }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div style={{
      background: 'rgba(0,8,20,0.95)',
      border: `1px solid ${teamColor}44`,
      padding: 'clamp(10px, 2vw, 20px)', flex: 1,
      boxShadow: `0 0 20px ${teamColor}22`,
    }}>
      <div style={{
        fontFamily: "'Rajdhani',sans-serif",
        fontSize: 'clamp(11px, 1.8vw, 13px)', fontWeight: 700,
        letterSpacing: 4, color: teamColor, marginBottom: 10, textAlign: 'center',
        borderBottom: `1px solid ${teamColor}33`, paddingBottom: 8,
      }}>
        {teamLabel}
        <span style={{ marginLeft: 8, fontSize: 'clamp(14px, 2.2vw, 18px)' }}>
          {ScoreManager.teamScores[teamLabel.toLowerCase() as 'red' | 'blue']}
        </span>
        <span style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>PTS</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Share Tech Mono'" }}>
        <thead>
          <tr>
            {['PILOT', 'K', 'D', 'SC'].map((h) => (
              <th key={h} style={{
                fontSize: 'clamp(8px, 1.2vw, 9px)', letterSpacing: 2,
                color: `${teamColor}88`, padding: '3px 5px',
                borderBottom: `1px solid ${teamColor}22`, textAlign: 'left',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={p.id} style={{ background: i === 0 ? `${teamColor}10` : 'transparent' }}>
              <td style={{ fontSize: 'clamp(9px, 1.4vw, 11px)', padding: '5px 5px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: p.id === 'player' ? 'var(--cyan)' : 'rgba(255,255,255,0.75)' }}>
                {i === 0 ? '★ ' : ''}{p.name}{p.id === 'player' ? ' ◀' : ''}
              </td>
              <td style={{ fontSize: 'clamp(9px, 1.4vw, 11px)', padding: '5px 5px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#44ee88' }}>{p.kills}</td>
              <td style={{ fontSize: 'clamp(9px, 1.4vw, 11px)', padding: '5px 5px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#ff4466' }}>{p.deaths}</td>
              <td style={{ padding: '5px 5px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#ffcc00', fontFamily: "'Rajdhani'", fontSize: 'clamp(12px, 1.8vw, 15px)', fontWeight: 700 }}>{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EndScreen({ winner, winnerColor, onRematch, onLobby }: EndScreenProps) {
  const { settings, matchTimer, addHydroTokens } = useGameStore();
  const sorted = ScoreManager.getSorted();
  const isTDM = settings.mode === 'TDM';

  const rewardsProcessed = useRef(false);
  const rewards = ScoreManager.calculateRewards('player', settings.timeLimit - matchTimer);

  useEffect(() => {
    if (!rewardsProcessed.current) {
      addHydroTokens(rewards.hydroTokens);
      rewardsProcessed.current = true;
    }
  }, [addHydroTokens, rewards.hydroTokens]);

  const redPlayers  = sorted.filter((p) => p.team === 'red');
  const bluePlayers = sorted.filter((p) => p.team === 'blue');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,5,15,0.97)', backdropFilter: 'blur(12px)',
      padding: 'clamp(12px, 3vw, 32px)',
      overflowY: 'auto',
    }}>
      <div style={{ fontSize: 'clamp(8px, 1.2vw, 11px)', letterSpacing: 5, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
        {isTDM ? 'TEAM DEATHMATCH' : settings.mode === 'LBS' ? 'LAST BOAT STANDING' : 'MATCH COMPLETE'}
      </div>

      <div style={{
        fontFamily: "'Rajdhani',sans-serif",
        fontSize: 'clamp(28px, 6vw, 60px)', fontWeight: 700,
        letterSpacing: 'clamp(4px, 1.5vw, 10px)', color: winnerColor,
        textShadow: `0 0 40px ${winnerColor}88`,
        marginBottom: 4, textAlign: 'center',
      }}>
        {winner}
      </div>

      {/* Rewards Section */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 28,
        background: 'rgba(255,204,0,0.05)', border: '1px solid rgba(255,204,0,0.2)',
        padding: '12px 24px', borderRadius: 4, textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 4 }}>REWARD</div>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 20, fontWeight: 700, color: '#ffcc00' }}>
            +{rewards.hydroTokens} <span style={{ fontSize: 10 }}>HYDRO-TOKENS</span>
          </div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 4 }}>PROGRESS</div>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 20, fontWeight: 700, color: '#44ee88' }}>
            +{rewards.xp} <span style={{ fontSize: 10 }}>XP</span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 'clamp(7px, 1vw, 9px)', letterSpacing: 4, color: 'rgba(255,255,255,0.2)', marginBottom: 'clamp(14px, 2.5vw, 28px)' }}>
        FINAL STANDINGS
      </div>

      {isTDM ? (
        <div style={{
          display: 'flex', gap: 'clamp(8px, 1.5vw, 16px)',
          marginBottom: 'clamp(16px, 2.5vw, 32px)',
          width: '100%', maxWidth: 860,
        }}>
          <TeamTable players={redPlayers}  teamColor="#ff3344" teamLabel="RED"  />
          <TeamTable players={bluePlayers} teamColor="#4488ff" teamLabel="BLUE" />
        </div>
      ) : (
        <div style={{
          background: 'rgba(0,8,20,0.95)', border: '1px solid rgba(0,200,255,0.2)',
          padding: 'clamp(12px, 2vw, 24px)',
          width: '100%', maxWidth: 520,
          marginBottom: 'clamp(16px, 2.5vw, 32px)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Share Tech Mono'" }}>
            <thead>
              <tr>
                {['CAPTAIN', 'KILLS', 'DEATHS', 'SCORE'].map((h) => (
                  <th key={h} style={{
                    fontSize: 'clamp(8px, 1.2vw, 9px)', letterSpacing: 2,
                    color: 'rgba(0,200,255,0.4)', padding: '4px 8px',
                    borderBottom: '1px solid rgba(0,200,255,0.15)', textAlign: 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.id} style={{ background: i === 0 ? 'rgba(0,200,255,0.05)' : 'transparent' }}>
                  <td style={{ fontSize: 'clamp(9px, 1.4vw, 11px)', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: p.id === 'player' ? 'var(--cyan)' : 'rgba(255,255,255,0.75)' }}>
                    {i === 0 ? '👑 ' : ''}{p.name}
                  </td>
                  <td style={{ fontSize: 'clamp(9px, 1.4vw, 11px)', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#44ee88' }}>{p.kills}</td>
                  <td style={{ fontSize: 'clamp(9px, 1.4vw, 11px)', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ff4466' }}>{p.deaths}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ffcc00', fontFamily: "'Rajdhani'", fontSize: 'clamp(12px, 1.8vw, 16px)', fontWeight: 700 }}>{p.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 16px)' }}>
        <button onClick={onLobby} style={{
          fontFamily: "'Rajdhani',sans-serif",
          fontSize: 'clamp(10px, 1.5vw, 12px)', fontWeight: 700, letterSpacing: 4,
          padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 36px)',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
        }}>← LOBBY</button>
        <button onClick={onRematch} style={{
          fontFamily: "'Rajdhani',sans-serif",
          fontSize: 'clamp(10px, 1.5vw, 13px)', fontWeight: 700, letterSpacing: 'clamp(2px, 1vw, 6px)',
          padding: 'clamp(9px, 1.5vw, 13px) clamp(20px, 4vw, 44px)',
          background: 'transparent',
          border: `1px solid ${winnerColor}66`, color: winnerColor,
          cursor: 'pointer', clipPath: 'polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%)',
        }}>⊕ REMATCH</button>
      </div>
    </div>
  );
}
