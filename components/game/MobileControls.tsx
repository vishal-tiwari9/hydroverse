'use client';
import React, { useRef, useEffect, useCallback, useState } from 'react';

const DEAD_ZONE = 14;
const KNOB_MAX  = 42;

interface MobileControlsProps {
  keys: React.MutableRefObject<Record<string, boolean>>;
  /** When provided, shows a TALK button instead of FIRE/BOOST/WPN */
  onInteract?: () => void;
}

export default function MobileControls({ keys, onInteract }: MobileControlsProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const knobRef         = useRef<HTMLDivElement>(null);
  const joystickTouch   = useRef<number | null>(null);
  const originRef       = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const clearMove = useCallback(() => {
    keys.current['KeyW'] = false;
    keys.current['KeyS'] = false;
    keys.current['KeyA'] = false;
    keys.current['KeyD'] = false;
  }, [keys]);

  useEffect(() => {
    if (!isTouchDevice) return;
    const area = joystickAreaRef.current;
    if (!area) return;

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      if (joystickTouch.current !== null) return;
      const t = e.changedTouches[0];
      joystickTouch.current = t.identifier;
      const rect = area.getBoundingClientRect();
      originRef.current = {
        x: rect.left + rect.width  / 2,
        y: rect.top  + rect.height / 2,
      };
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (joystickTouch.current === null) return;
      const t = Array.from(e.changedTouches).find(t => t.identifier === joystickTouch.current);
      if (!t) return;

      const dx = t.clientX - originRef.current.x;
      const dy = t.clientY - originRef.current.y;
      const dist   = Math.sqrt(dx * dx + dy * dy);
      const capped = Math.min(dist, KNOB_MAX);
      const angle  = Math.atan2(dy, dx);
      const kx     = Math.cos(angle) * capped;
      const ky     = Math.sin(angle) * capped;

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
      }

      clearMove();
      if (Math.abs(dy) > DEAD_ZONE) {
        keys.current['KeyW'] = dy < 0;
        keys.current['KeyS'] = dy > 0;
      }
      if (Math.abs(dx) > DEAD_ZONE) {
        keys.current['KeyA'] = dx < 0;
        keys.current['KeyD'] = dx > 0;
      }
    };

    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      const released = Array.from(e.changedTouches).some(t => t.identifier === joystickTouch.current);
      if (!released) return;
      joystickTouch.current = null;
      clearMove();
      if (knobRef.current) {
        knobRef.current.style.transform = 'translate(-50%, -50%)';
      }
    };

    area.addEventListener('touchstart', onStart, { passive: false });
    area.addEventListener('touchmove',  onMove,  { passive: false });
    area.addEventListener('touchend',   onEnd,   { passive: false });
    area.addEventListener('touchcancel',onEnd,   { passive: false });
    return () => {
      area.removeEventListener('touchstart', onStart);
      area.removeEventListener('touchmove',  onMove);
      area.removeEventListener('touchend',   onEnd);
      area.removeEventListener('touchcancel',onEnd);
    };
  }, [isTouchDevice, clearMove, keys]);

  if (!isTouchDevice) return null;

  const pressKey   = (code: string) => (e: React.TouchEvent) => { e.preventDefault(); keys.current[code] = true; };
  const releaseKey = (code: string) => (e: React.TouchEvent) => { e.preventDefault(); keys.current[code] = false; };

  const cycleWeapon = (e: React.TouchEvent) => {
    e.preventDefault();
    keys.current['KeyE'] = true;
    setTimeout(() => { keys.current['KeyE'] = false; }, 80);
  };

  const interact = (e: React.TouchEvent) => {
    e.preventDefault();
    keys.current['KeyE'] = true;
    setTimeout(() => { keys.current['KeyE'] = false; }, 80);
    onInteract?.();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>

      {/* ── Left joystick ─────────────────────────────────────── */}
      <div
        ref={joystickAreaRef}
        style={{
          position: 'absolute', bottom: 44, left: 36,
          width: 130, height: 130, borderRadius: '50%',
          background: 'rgba(0,200,255,0.06)',
          border: '2px solid rgba(0,200,255,0.22)',
          pointerEvents: 'all', touchAction: 'none',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(0,200,255,0.12)' }} />
          <div style={{ position: 'absolute', height: '100%', width: 1, background: 'rgba(0,200,255,0.12)' }} />
        </div>
        <div
          ref={knobRef}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 52, height: 52, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(0,232,255,0.5), rgba(0,100,180,0.3))',
            border: '2px solid rgba(0,200,255,0.65)',
            boxShadow: '0 0 14px rgba(0,200,255,0.35)',
            pointerEvents: 'none',
          }}
        />
        <span style={arrowStyle('top')}>▲</span>
        <span style={arrowStyle('bottom')}>▼</span>
        <span style={arrowStyle('left')}>◄</span>
        <span style={arrowStyle('right')}>►</span>
      </div>

      {/* ── Right action buttons ──────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 44, right: 28,
        display: 'flex', flexDirection: 'column', gap: 12,
        alignItems: 'center', pointerEvents: 'all',
      }}>
        {onInteract ? (
          <ActionBtn
            label="TALK"
            color="#ffdd44"
            size={80}
            onTouchStart={interact}
            onTouchEnd={() => {}}
          />
        ) : (
          <>
            <ActionBtn
              label="FIRE"
              color="#ff3355"
              size={80}
              onTouchStart={pressKey('Space')}
              onTouchEnd={releaseKey('Space')}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <ActionBtn
                label="BOOST"
                color="#00e8d8"
                size={58}
                onTouchStart={pressKey('ShiftLeft')}
                onTouchEnd={releaseKey('ShiftLeft')}
              />
              <ActionBtn
                label="WPN"
                color="#ffdd44"
                size={58}
                onTouchStart={cycleWeapon}
                onTouchEnd={() => {}}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function arrowStyle(side: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute', fontSize: 9,
    color: 'rgba(0,200,255,0.35)', lineHeight: 1,
  };
  if (side === 'top')    return { ...base, top: 5,    left: '50%', transform: 'translateX(-50%)' };
  if (side === 'bottom') return { ...base, bottom: 5, left: '50%', transform: 'translateX(-50%)' };
  if (side === 'left')   return { ...base, left: 6,   top: '50%',  transform: 'translateY(-50%)' };
  return                        { ...base, right: 6,  top: '50%',  transform: 'translateY(-50%)' };
}

function ActionBtn({
  label, color, size = 70, onTouchStart, onTouchEnd,
}: {
  label: string; color: string; size?: number;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd:   (e: React.TouchEvent) => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onTouchStart={(e) => { setPressed(true);  onTouchStart(e); }}
      onTouchEnd={(e)   => { setPressed(false); onTouchEnd(e);   }}
      onTouchCancel={(e)=> { setPressed(false); onTouchEnd(e);   }}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: pressed ? `${color}38` : `${color}12`,
        border:     `2px solid ${color}${pressed ? 'cc' : '44'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, letterSpacing: 1.5,
        color: `${color}${pressed ? 'ff' : '77'}`,
        fontFamily: "'Share Tech Mono', monospace",
        boxShadow: pressed ? `0 0 18px ${color}55` : 'none',
        userSelect: 'none', touchAction: 'none',
        transition: 'background 0.04s, border-color 0.04s, color 0.04s',
      }}
    >
      {label}
    </div>
  );
}
