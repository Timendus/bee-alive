const { v4: uuid } = require('uuid');
const { Simulator } = require('../../shared/simulator');
const { NetworkServer } = require('../../shared/network-server');
const { SocketIOMessenger } = require('../../shared/socketio-messenger');
const { BeeGame } = require('../../shared/bee-game')

class Room {
  constructor({ roomId }) {
    this.roomId = roomId;
    this._simulator = new Simulator(new BeeGame())
    this._networkServer = new NetworkServer(this._simulator)
  }

  joinSocket(socket) {
    this._client = this._networkServer.createClient(new SocketIOMessenger(socket));
    socket.join(this.roomId);
  }

  leaveSocket(socket) {
    socket.leave(this.roomId);
    this._networkServer.removeClient(this._client);
  }
}

module.exports = async io => {
  const rooms = {};

  io.on('connection', socket => {

    socket.on('create', async () => {
      const roomId = uuid().substring(0,6).toUpperCase();
      rooms[roomId] = new Room({ roomId })
      socket.join(roomId);
      console.log("Created room", roomId);

      socket.emit('room-created', roomId);
      io.emit('list', Object.keys(rooms));
    });

    socket.on('join', async roomId => {
      if (!rooms[roomId]) {
        socket.emit('err', 'Sorry, this room doesn\'t exist (anymore)');
        return;
      }
      const room = rooms[roomId];
      socket.emit('room-joined', roomId);
      room.joinSocket(socket);
    });

    socket.on('list', () => {
      socket.emit('list', Object.keys(rooms));
    });

    socket.on('leave', async roomId => {
      const room = rooms[roomId];
      if (!room) { return }
      room.leaveSocket(socket);
    });

    socket.on('roomMessage', message => {
      Object.keys(socket.rooms).forEach(room => {
        if ( Object.keys(rooms).includes(room) )
          io.to(room).emit('roomMessage', message);
      });
    });

    socket.on('lobbyMessage', message => {
      io.emit('lobbyMessage', message);
    });

  });
}
