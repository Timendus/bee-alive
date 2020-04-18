const io = require('socket.io-client');
const socket = io('/room');

module.exports = class Room {

  constructor() {
    this._currentRoom = null;
    this._rooms = [];
    this._players = [];
    this._events = {
      'join':     [],
      'leave':    [],
      'message':  [],
      'roomList': [],
      'players':  []
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

  broadcast(message) {
    socket.emit('message', {
      room: this._currentRoom,
      message
    });
  }

  create() {
    socket.emit('create');
  }

  join(id) {
    document.location.hash = id;
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
    socket.on('room-joined', room => {
      this._currentRoom = room;
      document.location.hash = room;
      this._fireEvent('join', room);
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

    socket.on('message', msg => {
      this._fireEvent('message', msg);
    });
  }

  _leaveRoom() {
    if ( !this._currentRoom ) return;
    socket.emit('leave', this._currentRoom);
    this._fireEvent('leave', this._currentRoom);
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
