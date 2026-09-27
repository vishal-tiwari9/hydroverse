import { io, Socket } from 'socket.io-client';

// Resolved once at module load (build-time inlined by Next.js for NEXT_PUBLIC_ vars)
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? '';

/**
 * True only when a real socket server is reachable:
 *  - Explicit env var set (production / staging)
 *  - Running on localhost (custom server.js handles both Next + Socket.io)
 */
export function isSocketConfigured(): boolean {
  if (SOCKET_URL) return true;
  if (typeof window === 'undefined') return false;
  return true;
}

let _socket: Socket | null = null;

function resolveUrl(): string {
  if (SOCKET_URL) return SOCKET_URL;
  // Only reached on localhost — same-origin custom server
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(resolveUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      reconnectionDelay: 1500,
      timeout: 6000,
    });
  }
  return _socket;
}

/**
 * Connect and return the socket.
 * Returns null (no-op) when no server is configured — callers don't need to
 * guard with isSocketConfigured() themselves.
 */
export function connectSocket(): Socket | null {
  if (!isSocketConfigured()) return null;
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
