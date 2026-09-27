// All sounds synthesized via Web Audio API — no external files needed

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let engineGain: GainNode | null = null;
let engineOsc1: OscillatorNode | null = null;
let engineOsc2: OscillatorNode | null = null;
let engineRunning = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function out() { getCtx(); return masterGain!; }

function play(fn: (c: AudioContext, out: GainNode) => void) {
  try { fn(getCtx(), out()); } catch (_) {}
}

export const SFX = {
  startEngine() {
    try {
      const c = getCtx();
      if (engineRunning) return;
      engineRunning = true;
      engineGain = c.createGain();
      engineGain.gain.value = 0;
      engineGain.connect(out());
      engineOsc1 = c.createOscillator();
      engineOsc1.type = 'sawtooth';
      engineOsc1.frequency.value = 55;
      const lp1 = c.createBiquadFilter();
      lp1.type = 'lowpass'; lp1.frequency.value = 280;
      engineOsc1.connect(lp1); lp1.connect(engineGain);
      engineOsc2 = c.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 82;
      const lp2 = c.createBiquadFilter();
      lp2.type = 'lowpass'; lp2.frequency.value = 200;
      const g2 = c.createGain(); g2.gain.value = 0.4;
      engineOsc2.connect(lp2); lp2.connect(g2); g2.connect(engineGain);
      engineOsc1.start(); engineOsc2.start();
    } catch (_) {}
  },

  updateEngine(speedRatio: number, boosting: boolean) {
    if (!engineGain || !engineOsc1) return;
    try {
      const t = getCtx().currentTime;
      engineGain.gain.setTargetAtTime(0.05 + speedRatio * 0.35, t, 0.15);
      engineOsc1.frequency.setTargetAtTime(48 + speedRatio * (boosting ? 180 : 110), t, 0.12);
      engineOsc2?.frequency.setTargetAtTime(48 * 1.5 + speedRatio * (boosting ? 270 : 165), t, 0.12);
    } catch (_) {}
  },

  stopEngine() {
    try { engineOsc1?.stop(); engineOsc2?.stop(); } catch (_) {}
    engineOsc1 = null; engineOsc2 = null; engineRunning = false;
  },

  shoot(weaponId: string) {
    play((c, out) => {
      const t = c.currentTime;
      switch (weaponId) {
        case 'machinegun': {
          const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
          const src = c.createBufferSource(); src.buffer = buf;
          const g = c.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 800;
          src.connect(hp); hp.connect(g); g.connect(out); src.start(t); break;
        }
        case 'homing': {
          const o = c.createOscillator(); o.type = 'sine';
          o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.25);
          const g = c.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3); break;
        }
        case 'freeze': {
          const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(2000, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.4);
          const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(2600, t); o2.frequency.exponentialRampToValueAtTime(500, t + 0.4);
          const g = c.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          o.connect(g); o2.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t + 0.4); o2.stop(t + 0.4); break;
        }
        default: {
          const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.12);
          const g = c.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.12);
        }
      }
    });
  },

  explosion(size = 1) {
    play((c, out) => {
      const t = c.currentTime, dur = 0.4 + size * 0.5;
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 0.8);
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); g.gain.setValueAtTime(0.7 * size, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 350;
      src.connect(lp); lp.connect(g); g.connect(out); src.start(t);
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(18, t + dur * 0.6);
      const og = c.createGain(); og.gain.setValueAtTime(0.5 * size, t); og.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6);
      o.connect(og); og.connect(out); o.start(t); o.stop(t + dur * 0.6);
    });
  },

  hit() {
    play((c, out) => {
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.18);
      const g = c.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.18);
    });
  },

  pickup(type: string) {
    play((c, out) => {
      const t = c.currentTime;
      const freqs: Record<string, number[]> = { health: [523, 659, 784], ammo: [440, 554, 659], boost: [392, 494, 587] };
      (freqs[type] || freqs.health).forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = c.createGain(); g.gain.setValueAtTime(0, t + i * 0.08); g.gain.linearRampToValueAtTime(0.2, t + i * 0.08 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
        o.connect(g); g.connect(out); o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.15);
      });
    });
  },

  splash() {
    play((c, out) => {
      const t = c.currentTime;
      const buf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.2) * 0.6;
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
      src.connect(lp); lp.connect(g); g.connect(out); src.start(t);
    });
  },

  step() {
    play((c, out) => {
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120 + Math.random() * 40, t);
      const g = c.createGain(); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.08);
    });
  },

  alarm() {
    play((c, out) => {
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(440, t + 0.5);
      const g = c.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.linearRampToValueAtTime(0, t + 0.5);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.5);
    });
  },
};
