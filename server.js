const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// ── In-memory room store ──────────────────────────────────────
// rooms: Map<roomCode, { mode, players: Map<socketId, PlayerInfo> }>
const rooms = new Map();
// Pending deletion timers — gives reconnecting players a grace period
const roomDeleteTimers = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function roomSnapshot(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return [];
  return [...room.players.values()];
}

// ── Boot ──────────────────────────────────────────────────────
app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : '*';

  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
    // Allow both transports so polling clients (Vercel preview) can connect too
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    let currentRoom = null;

    // ── Create room ─────────────────────────────────────────
    socket.on('room:create', ({ name = 'PILOT', settings, customization } = {}) => {
      const code = genCode();
      rooms.set(code, { players: new Map(), settings, matchStart: null });

      currentRoom = code;
      socket.join(code);

      const player = { id: socket.id, name, x: 0, z: 0, ry: 0, health: 100, dead: false, customization };
      rooms.get(code).players.set(socket.id, player);

      console.log(`[room] created ${code} by ${name} (${socket.id})`);

      socket.emit('room:joined', {
        roomCode: code,
        playerId: socket.id,
        players: [],          // no other players yet
        settings,
      });
    });

    // ── Join room ───────────────────────────────────────────
    socket.on('room:join', ({ roomCode, name = 'PILOT', customization } = {}) => {
      const code = roomCode?.toUpperCase?.();
      const room = rooms.get(code);

      if (!room) {
        console.log(`[room] join failed — code "${code}" not found. Active rooms: [${[...rooms.keys()].join(', ')}]`);
        socket.emit('room:error', { message: 'Room not found. Check the code and try again.' });
        return;
      }

      console.log(`[room] ${name} joined ${code} (${socket.id})`);

      // Cancel any pending room deletion from a previous disconnect
      if (roomDeleteTimers.has(code)) {
        clearTimeout(roomDeleteTimers.get(code));
        roomDeleteTimers.delete(code);
      }

      currentRoom = code;
      socket.join(code);

      const existing = [...room.players.values()];
      const player = { id: socket.id, name, x: 0, z: 0, ry: 0, health: 100, dead: false, customization };
      room.players.set(socket.id, player);

      // Tell joiner who's already here
      socket.emit('room:joined', {
        roomCode: code,
        playerId: socket.id,
        players: existing,
        settings: room.settings,
      });

      // Broadcast full player list to everyone in room (including joiner)
      // so no one falls out of sync if they missed an event
      const allPlayers = [...room.players.values()];
      const roomSockets = io.sockets.adapter.rooms.get(code);
      console.log(`[room] ${code} now has ${allPlayers.length} player(s), notifying ${roomSockets?.size ?? 0} socket(s)`);
      io.to(code).emit('room:players', allPlayers);
    });

    // ── Update Customization (Mid-lobby) ────────────────────
    socket.on('room:update_customization', (customization) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (player) {
        player.customization = customization;
        io.to(currentRoom).emit('room:players', [...room.players.values()]);
      }
    });

    // ── Start Match ──────────────────────────────────────────
    socket.on('room:start', () => {
      if (!currentRoom) return;
      // Notify everyone in the room (including sender) to switch scene
      io.to(currentRoom).emit('room:started');
    });

    // ── Position / health sync (client sends ~20 Hz) ────────
    socket.on('game:state', (state) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (player) Object.assign(player, state);
      // Start the authoritative match clock on the first game:state received
      if (!room.matchStart) room.matchStart = Date.now();
      const serverElapsed = (Date.now() - room.matchStart) / 1000;
      // Relay to everyone else in the room, including elapsed time for timer sync
      socket.to(currentRoom).emit('game:state', { id: socket.id, ...state, serverElapsed });
    });

    // ── Shoot event (for remote visuals) ────────────────────
    socket.on('game:shoot', (data) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('game:shoot', { fromId: socket.id, ...data });
    });

    // ── Powerup Pickup Sync ─────────────────────────────────
    socket.on('game:powerup_collected', ({ powerupId }) => {
      if (!currentRoom) return;
      // Broadcast to everyone so the powerup is removed from their scene
      io.to(currentRoom).emit('game:powerup_collected', { powerupId, by: socket.id });
    });

    // ── Hit relay — shooter detected hit, tells victim ──────
    socket.on('game:hit', ({ toId, damage }) => {
      if (!currentRoom) return;
      io.to(toId).emit('game:hit', { fromId: socket.id, damage });
    });

    // ── Kill broadcast ───────────────────────────────────────
    socket.on('game:kill', ({ victimId, victimName }) => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      const killer = room?.players.get(socket.id);
      io.to(currentRoom).emit('game:kill', {
        killerId: socket.id,
        killerName: killer?.name ?? 'UNKNOWN',
        victimId,
        victimName,
      });
    });

    // ── Disconnect ───────────────────────────────────────────
    socket.on('disconnect', () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room) return;
      room.players.delete(socket.id);
      socket.to(currentRoom).emit('room:player_left', { playerId: socket.id });
      const remaining = [...room.players.values()];
      io.to(currentRoom).emit('room:players', remaining);
      if (room.players.size === 0) {
        // Grace period: wait 30s before deleting, so the creator can rejoin after
        // a brief disconnect (hot reload, network blip, etc.)
        console.log(`[room] ${currentRoom} empty — will delete in 5 min unless someone rejoins`);
        const timer = setTimeout(() => {
          if (rooms.get(currentRoom)?.players.size === 0) {
            rooms.delete(currentRoom);
            console.log(`[room] ${currentRoom} deleted (empty timeout)`);
          }
          roomDeleteTimers.delete(currentRoom);
        }, 5 * 60_000);
        roomDeleteTimers.set(currentRoom, timer);
      }
    });
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
