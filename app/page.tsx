'use client';
import dynamic from 'next/dynamic';

// Canvas must be client-only (no SSR for WebGL)
const HydroApp = dynamic(() => import('@/components/HydroApp'), { ssr: false });

export default function Page() {
  return <HydroApp />;
}
