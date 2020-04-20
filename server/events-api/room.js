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

  joinSocket(socket, name) {
    const client = this._networkServer.createClient(new SocketIOMessenger(socket), name);
    socket.networkClient = client;
    socket.join(this.roomId);
  }

  leaveSocket(socket) {
    if (!socket.networkClient) {
      throw new Error('The socket does not have a client');
    }
    socket.leave(this.roomId);
    this._networkServer.removeClient(socket.networkClient);
  }

  close() {
    this._networkServer.close();
  }
}

module.exports = async io => {

  const rooms = {};
  const playerNames = {};

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
      room.joinSocket(socket, playerName(socket.id));
      updatePlayerList(roomId);
    });

    socket.on('init', () => {
      socket.emit('list', Object.keys(rooms));
      updateLobbyPlayerList();
    });

    socket.on('leave', async roomId => {
      leave(socket, roomId);
    });

    socket.on('disconnect', () => {
      Object.keys(socket.rooms)
            .forEach(roomId => leave(socket, roomId));
    })

    socket.on('roomMessage', message => {
      message = htmlEntities(message);
      Object.keys(socket.rooms).forEach(room => {
        if ( Object.keys(rooms).includes(room) )
          io.to(room).emit('roomMessage', {
            client:   socket.id,
            userName: playerName(socket.id),
            message
          });
      });
    });

    socket.on('lobbyMessage', message => {
      message = htmlEntities(message);
      io.emit('lobbyMessage', {
        client:   socket.id,
        userName: playerName(socket.id),
        message
      });
    });

    socket.on('setName', async name => {
      name = htmlEntities(name);
      playerNames[socket.id] = name;
      Object.keys(socket.rooms).forEach(roomId => {
        updatePlayerList(roomId);
      });
    });

  });

  async function leave(socket, roomId) {
    const room = rooms[roomId];
    if (!room) { return }
    room.leaveSocket(socket);
    updatePlayerList(roomId);

    const players = await playersInroom(room.roomId);
    if ( players.length === 0 ) {
      room.close();
      delete rooms[room.roomId];           // Remove this room from the list
      io.emit('list', Object.keys(rooms)); // Tell everyone the room has disappeared
      console.log("Cleaned up room", room.roomId);
    }
  }

  // Tell everyone in this room who the players are
  async function updatePlayerList(roomId) {
    const players = await playersInroom(roomId);
    io.to(roomId).emit('players', players);
    updateLobbyPlayerList()
  }

  async function updateLobbyPlayerList() {
    const players = playersInLobby();
    io.emit('lobbyPlayers', players);
  }

  function playerName(socketId) {
    return playerNames[socketId] ||
      "Anonymous Player " + socketId.substr(-3).toUpperCase();
  }

  function htmlEntities(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function playersInroom(room) {
    return new Promise((resolve, reject) => {
      io.in(room).clients((error, clients) => {
        if (error) reject(error);
        resolve(clients.map(c => ({
          client: c,
          userName: playerName(c)
        })));
      });
    });
  }

  function playersInLobby() {
    return Object.values(io.connected)
                 .map(client => ({
      client: client.id,
      userName: playerName(client.id),
      inRoom: Object.keys(client.rooms).length > 1
    }));
  }

}
