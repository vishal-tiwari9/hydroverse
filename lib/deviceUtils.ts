/**
 * Returns a WebGL device pixel ratio appropriate for the current screen.
 * Mobile devices are capped at 1.5 to keep GPU load manageable on smaller screens.
 * Desktop is capped at 2 (retina) — going higher has no visible benefit.
 */
export function adaptiveDpr(): number {
  if (typeof window === 'undefined') return 1;
  const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0;
  return Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
}
