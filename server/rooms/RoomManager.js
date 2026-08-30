const Room = require('./Room');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars (0,O,1,I)

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // code -> Room
  }

  generateCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom() {
    const code = this.generateCode();
    const room = new Room(code, this.io);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get((code || '').toUpperCase());
  }

  removeRoom(code) {
    const room = this.rooms.get(code);
    if (room) {
      room.destroy();
      this.rooms.delete(code);
    }
  }

  findRoomBySocket(socketId) {
    for (const room of this.rooms.values()) {
      if (room.getPlayer(socketId)) return room;
    }
    return null;
  }

  // Periodic cleanup of stale/empty rooms (safety net, memory only)
  cleanupStale() {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      const allDisconnected = room.players.length > 0 && room.players.every(p => !p.connected);
      const tooOld = now - room.createdAt > 1000 * 60 * 60; // 1 hour
      if (allDisconnected || tooOld) {
        this.removeRoom(code);
      }
    }
  }
}

module.exports = RoomManager;
