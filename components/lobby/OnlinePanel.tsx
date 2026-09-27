'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { connectSocket, disconnectSocket, isSocketConfigured } from '@/lib/socket';
import type { RoomJoinedPayload } from '@/lib/multiplayer';
import type { GameMode } from '@/store/gameStore';

interface OnlinePanelProps {
  onClose: () => void;
}

type View = 'menu' | 'create' | 'join' | 'waiting';

export default function OnlinePanel({ onClose }: OnlinePanelProps) {
  const { 
    playerName, 
    setPlayerName, 
    setRemotePlayer, 
    startOnlineMatch, 
    settings, 
    setSettings,
    playerCustomization 
  } = useGameStore();
  
  const [view, setView]         = useState<View>('menu');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers]   = useState<{ id: string; name: string }[]>([]);
  const [error, setError]       = useState('');
  const [myId, setMyId]         = useState('');
  const myIdRef                 = useRef('');

  // Connect socket when panel opens, clean up on close
  useEffect(() => {
    if (!isSocketConfigured()) {
      setError(
        'Online PvP needs a game server.\n' +
        'Set NEXT_PUBLIC_SOCKET_URL to your Socket.io server URL, or run locally with npm run dev.'
      );
      return;
    }

    const socket = connectSocket();
    if (!socket) return; // isSocketConfigured() already handled above, safety guard

    socket.on('connect_error', () => {
      setError('Could not reach the game server. Check your connection or server URL.');
      disconnectSocket();
    });

    socket.on('room:joined', (payload: RoomJoinedPayload) => {
      setRoomCode(payload.roomCode);
      setMyId(payload.playerId);
      myIdRef.current = payload.playerId;
      setError('');
      payload.players.forEach((p) => setRemotePlayer(p.id, p));
      if (payload.settings) setSettings(payload.settings);
      setPlayers(payload.players.map((p) => ({ id: p.id, name: p.name })));
      setView('waiting');
    });

    socket.on('room:players', (allPlayers: any[]) => {
      // Full authoritative list from server — filter out self
      const others = allPlayers.filter((p) => p.id !== myIdRef.current);
      others.forEach((p) => setRemotePlayer(p.id, p));
      setPlayers(others.map((p) => ({ id: p.id, name: p.name })));
    });

    socket.on('room:player_left', ({ playerId }: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });

    socket.on('room:error', ({ message }: { message: string }) => {
      setError(message);
    });

    // Listen for host starting the game
    socket.on('room:started', () => {
      startOnlineMatch(roomCode, myIdRef.current);
    });

    return () => {
      socket.off('connect_error');
      socket.off('room:joined');
      socket.off('room:player_joined');
      socket.off('room:player_left');
      socket.off('room:error');
      socket.off('room:started');
    };
  }, [setRemotePlayer]);

  const handleCreate = () => {
    if (!playerName.trim()) { setError('Enter a pilot name first.'); return; }
    setError('');
    const socket = connectSocket();
    if (!socket) return;
    socket.emit('room:create', { name: playerName.trim(), settings, customization: playerCustomization });
  };

  const handleJoin = () => {
    if (!playerName.trim()) { setError('Enter a pilot name first.'); return; }
    if (joinCode.trim().length !== 4) { setError('Room code must be 4 characters.'); return; }
    setError('');
    const socket = connectSocket();
    if (!socket) return;
    socket.emit('room:join', { 
      roomCode: joinCode.trim().toUpperCase(), 
      name: playerName.trim(),
      customization: playerCustomization 
    });
  };

  const handleLaunch = () => {
    // Tell server to start the match for everyone
    const socket = connectSocket();
    socket?.emit('room:start');
  };

  const handleCancel = () => {
    disconnectSocket();
    setView('menu');
    setRoomCode('');
    setPlayers([]);
    setError('');
    onClose();
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 300,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
  };

  const boxStyle: React.CSSProperties = {
    background: 'rgba(0,6,18,0.97)',
    border: '2px solid rgba(0,200,255,0.5)',
    padding: '40px 52px',
    minWidth: 440,
    boxShadow: '0 0 60px rgba(0,200,255,0.2)',
  };

  const label: React.CSSProperties = {
    fontFamily: "'Rajdhani',sans-serif",
    fontSize: 11, letterSpacing: 8,
    color: 'rgba(0,200,255,0.45)', marginBottom: 6, display: 'block',
  };

  const input: React.CSSProperties = {
    width: '100%', background: 'rgba(0,200,255,0.06)',
    border: '1px solid rgba(0,200,255,0.3)', color: 'var(--cyan)',
    fontFamily: "'Share Tech Mono'", fontSize: 15,
    padding: '9px 14px', outline: 'none',
    boxSizing: 'border-box', letterSpacing: 3,
  };

  const btnPrimary = (color = 'var(--cyan)'): React.CSSProperties => ({
    fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
    fontSize: 13, letterSpacing: 5,
    padding: '12px 36px',
    background: `${color}22`,
    border: `1px solid ${color}`,
    color,
    cursor: 'pointer',
    clipPath: 'polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%)',
    flex: 1,
  });

  const btnSecondary: React.CSSProperties = {
    fontFamily: "'Rajdhani',sans-serif",
    fontSize: 12, letterSpacing: 4,
    padding: '11px 28px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
  };

  // ── Name field (shared across all views) ──────────────────
  const nameField = (
    <div style={{ marginBottom: 24 }}>
      <span style={label}>PILOT NAME</span>
      <input
        style={input}
        maxLength={16}
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
        placeholder="ENTER NAME"
      />
    </div>
  );

  const MODES: { id: GameMode; label: string; sub: string; color: string }[] = [
    { id: 'FFA', label: 'FFA',  sub: 'FREE FOR ALL',       color: '#ff3344' },
    { id: 'TDM', label: 'TDM',  sub: 'TEAM DEATHMATCH',    color: '#4488ff' },
    { id: 'LBS', label: 'LBS',  sub: 'LAST BOAT STANDING', color: '#44ee88' },
  ];

  // ── Views ─────────────────────────────────────────────────
  if (view === 'menu') {
    const activeColor = MODES.find((m) => m.id === settings.mode)?.color ?? 'var(--cyan)';
    return (
      <div style={panelStyle}>
        <div style={boxStyle}>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 36, fontWeight: 700, letterSpacing: 8, color: 'var(--cyan)', marginBottom: 4 }}>
            ONLINE PvP
          </div>
          <div style={{ fontSize: 9, letterSpacing: 4, color: 'rgba(0,200,255,0.35)', marginBottom: 28 }}>
            REAL PLAYERS — NO BOTS
          </div>

          {/* Mode selector */}
          <div style={{ marginBottom: 24 }}>
            <span style={label}>GAME MODE</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {MODES.map((m) => {
                const active = settings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSettings({ mode: m.id })}
                    style={{
                      flex: 1, padding: '10px 4px',
                      background: active ? `${m.color}22` : 'transparent',
                      border: `1px solid ${active ? m.color : 'rgba(255,255,255,0.12)'}`,
                      color: active ? m.color : 'rgba(255,255,255,0.35)',
                      cursor: 'pointer', textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 4 }}>{m.label}</div>
                    <div style={{ fontFamily: "'Share Tech Mono'", fontSize: 8, letterSpacing: 2, marginTop: 2, opacity: 0.7 }}>{m.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {nameField}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button style={btnPrimary(activeColor)} onClick={() => { handleCreate(); }}>
              ⊕ CREATE ROOM
            </button>
            <button style={btnPrimary('#ffdd44')} onClick={() => setView('join')}>
              → JOIN ROOM
            </button>
          </div>
          <button style={{ ...btnSecondary, width: '100%' }} onClick={onClose}>
            CANCEL
          </button>
          {error && <ErrorBox message={error} />}
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div style={panelStyle}>
        <div style={boxStyle}>
          <div style={{ fontFamily: "'Rajdhani'", fontSize: 28, fontWeight: 700, letterSpacing: 6, color: '#ffdd44', marginBottom: 28 }}>
            JOIN ROOM
          </div>
          {nameField}
          <div style={{ marginBottom: 24 }}>
            <span style={label}>ROOM CODE</span>
            <input
              style={{ ...input, fontSize: 28, letterSpacing: 12, textAlign: 'center' }}
              maxLength={4}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXX"
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={btnSecondary} onClick={() => setView('menu')}>← BACK</button>
            <button style={{ ...btnPrimary('#ffdd44'), flex: 2 }} onClick={handleJoin}>
              CONNECT
            </button>
          </div>
          {error && <ErrorBox message={error} />}
        </div>
      </div>
    );
  }

  // ── Waiting lobby ─────────────────────────────────────────
  return (
    <div style={panelStyle}>
      <div style={boxStyle}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: 'rgba(0,200,255,0.4)', marginBottom: 6 }}>ROOM CODE</div>
        <div style={{
          fontFamily: "'Rajdhani'", fontSize: 56, fontWeight: 700,
          letterSpacing: 16, color: 'var(--cyan)',
          textShadow: '0 0 30px rgba(0,200,255,0.5)', marginBottom: 4,
        }}>
          {roomCode}
        </div>
        <div style={{ fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>
          SHARE THIS CODE WITH YOUR CREW
        </div>

        {/* Active mode badge */}
        {(() => {
          const m = MODES.find((x) => x.id === settings.mode);
          return m ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `1px solid ${m.color}55`, background: `${m.color}11`,
              padding: '4px 14px', marginBottom: 24,
            }}>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 5, color: m.color }}>{m.label}</span>
              <span style={{ fontSize: 8, letterSpacing: 3, color: `${m.color}99` }}>{m.sub}</span>
            </div>
          ) : null;
        })()}

        {/* Player list */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: 'rgba(0,200,255,0.4)', marginBottom: 10 }}>
            PILOTS IN ROOM ({players.length + 1})
          </div>
          {/* Self */}
          <PlayerRow name={playerName} isYou />
          {/* Others */}
          {players.map((p) => <PlayerRow key={p.id} name={p.name} />)}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button style={btnSecondary} onClick={handleCancel}>LEAVE</button>
          <button style={{ ...btnPrimary('#44ee88'), flex: 2 }} onClick={handleLaunch}>
            ⚓ LAUNCH MATCH
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Any player can launch — opponents join mid-match too
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      marginTop: 14, padding: '10px 14px',
      background: 'rgba(255,50,80,0.08)',
      border: '1px solid rgba(255,50,80,0.4)',
    }}>
      {message.split('\n').map((line, i) => (
        <div key={i} style={{ color: '#ff5568', fontSize: 11, letterSpacing: 1, lineHeight: 1.7 }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function PlayerRow({ name, isYou = false }: { name: string; isYou?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 12px', marginBottom: 5,
      background: isYou ? 'rgba(0,200,255,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isYou ? 'rgba(0,200,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: isYou ? 'var(--cyan)' : 'rgba(255,255,255,0.3)' }} />
      <span style={{ fontFamily: "'Share Tech Mono'", fontSize: 13, color: isYou ? 'var(--cyan)' : 'rgba(255,255,255,0.7)', letterSpacing: 2 }}>
        {name}
      </span>
      {isYou && <span style={{ marginLeft: 'auto', fontSize: 8, letterSpacing: 3, color: 'rgba(0,200,255,0.5)' }}>YOU</span>}
    </div>
  );
}
