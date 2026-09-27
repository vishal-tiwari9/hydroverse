'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import LobbyScene from './lobby/LobbyScene';
import GameScene from './game/GameScene';

export default function HydroApp() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#1a0800' }}>
      <div className="scanlines" />
      <Suspense fallback={<LoadingScreen />}>
        {screen === 'lobby' ? <LobbyScene /> : <GameScene />}
      </Suspense>
      <RotatePrompt />
    </div>
  );
}

// ── Portrait-mode overlay for mobile ─────────────────────────
function RotatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const check = () => {
      setShow(window.innerHeight > window.innerWidth);
    };

    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,4,12,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
    }}>
      {/* Rotating phone icon */}
      <div style={{ fontSize: 72, animation: 'rotatePhone 2s ease-in-out infinite' }}>
        📱
      </div>
      <div style={{
        fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700,
        letterSpacing: 6, color: 'var(--cyan)', textAlign: 'center',
        textShadow: '0 0 20px rgba(0,232,216,0.6)',
      }}>
        ROTATE DEVICE
      </div>
      <div style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 11, letterSpacing: 3,
        color: 'rgba(255,255,255,0.4)', textAlign: 'center',
        lineHeight: 1.8,
      }}>
        HYDROVERSE REQUIRES<br />LANDSCAPE ORIENTATION
      </div>
      <style>{`
        @keyframes rotatePhone {
          0%, 100% { transform: rotate(0deg); }
          40%       { transform: rotate(90deg); }
          60%       { transform: rotate(90deg); }
        }
      `}</style>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #cc4400, #1a0800)',
    }}>
      <div className="logo-text" style={{ fontSize: 'clamp(48px,8vw,100px)', letterSpacing: 14 }}>
        HYDROVERSE
      </div>
      <div style={{ color: 'rgba(0,200,255,0.5)', fontSize: 10, letterSpacing: 6, marginTop: 16 }}>
        LOADING SYSTEMS...
      </div>
    </div>
  );
}
