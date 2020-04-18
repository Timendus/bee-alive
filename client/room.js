const io = require('socket.io-client');
const { NetworkClient } = require('../shared/network-client');
const { Simulator } = require("../shared/simulator");
const { SocketIOMessenger } = require("../shared/socketio-messenger");
const socket = io('/room');
const { BeeGame } = require('../shared/bee-game')

class Room {

  constructor({ roomId }) {
    this.roomId = roomId;
    this._messenger = new SocketIOMessenger(socket);
    this._simulator = new Simulator(new BeeGame());
    this._networkClient = new NetworkClient({
      messenger: this._messenger,
      simulator: this._simulator,
    });
    this._events = {
      'leave':       [],
      'chatMessage': []
    };

    this._attachServerEvents();
  }

  close() {
    this._networkClient.stop();
    this._messenger.close();
    socket.emit('leave', this.roomId);
    this._fireEvent('leave', this);
  }

  chatMessage(msg) {
    socket.emit('roomMessage', msg);
  }

  addEventListener(evnt, func) {
    if ( !Object.keys(this._events).includes(evnt) )
      throw new Error(`Invalid event: '${evnt}'`);

    this._events[evnt].push(func);
  }

  _fireEvent(evnt, ...params) {
    this._events[evnt].forEach(f => f(...params));
  }

  _attachServerEvents() {
    socket.on('roomMessage', msg =>
      this._fireEvent('chatMessage', msg));
  }

}

class Lobby {

  constructor() {
    this._currentRoom = null;
    this._rooms = [];
    this._players = [];
    this._events = {
      'join':        [],
      'leave':       [],
      'chatMessage': [],
      'roomList':    [],
      'players':     []
    };

    this._attachBrowserEvents();
    this._attachServerEvents();
    socket.emit('list'); // Request room list on load
    this._navigate();    // Trigger on page load
  }

  id() {
    return this._currentRoom;
  }

  players() {
    return this._players;
  }

  roomList() {
    return this._rooms;
  }

  addEventListener(evnt, func) {
    if ( !Object.keys(this._events).includes(evnt) )
      throw new Error(`Invalid event: '${evnt}'`);

    this._events[evnt].push(func);
  }

  create() {
    socket.emit('create');
  }

  join(id) {
    document.location.hash = id;
  }

  chatMessage(msg) {
    socket.emit('lobbyMessage', msg);
  }

  // "Internal" methods

  _fireEvent(evnt, ...params) {
    this._events[evnt].forEach(f => f(...params));
  }

  _attachBrowserEvents() {
    window.addEventListener('beforeunload', () => this._leaveRoom());
    window.addEventListener('hashchange', () => this._navigate());
  }

  _attachServerEvents() {
    socket.on('room-joined', roomId => {
      document.location.hash = roomId;
      const room = new Room({ roomId: roomId });
      this._currentRoom = room;
      this._fireEvent('join', room);
    });

    socket.on('room-created', roomId => {
      this.join(roomId);
    });

    socket.on('players', players => {
      this._players = players;
      this._fireEvent('players', players);
    });

    socket.on('list', list => {
      this._rooms = list;
      this._fireEvent('roomList', list);
    });

    socket.on('err', msg => {
      console.error(msg);
    });

    socket.on('lobbyMessage', msg => {
      this._fireEvent('chatMessage', msg);
    });
  }

  _leaveRoom() {
    if ( !this._currentRoom ) return;
    this._currentRoom.close();
  }

  _navigate() {
    let hash = window.location.hash;
    if ( hash.startsWith('#') ) hash = hash.substr(1);
    if ( hash == '' ) {
      this._leaveRoom();
    } else {
      // Go to this room
      socket.emit('join', hash);
    }
  }

}

module.exports = {
  Room,
  Lobby,
}
