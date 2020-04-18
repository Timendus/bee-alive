export default class Room {

  constructor(socket) {
    this._socket = socket;
    this._currentRoom = null;
    this._events = {
      'join':         [],
      'leave':        []
    };

    this._attachUIEvents();
    this._attachServerEvents();
    this._navigate(); // Trigger on page load
  }

  currentRoom() {
    return this._currentRoom;
  }

  addEventListener(evnt, func) {
    if ( !Object.keys(this._events).includes(evnt) )
      throw new Error(`Invalid event: '${evnt}'`);

    this._events[evnt].push(func);
  }

  _fireEvent(evnt, ...params) {
    this._events[evnt].forEach(f => f(...params));
  }

  _attachUIEvents() {
    const createButton = document.getElementById('create');
    const joinForm     = document.getElementById('join');

    createButton.addEventListener('click', () => {
      this._socket.emit('create');
    });

    joinForm.addEventListener('submit', e => {
      const room = join.querySelector('input').value;
      document.location.hash = room;
      e.preventDefault();
    });

    window.addEventListener('beforeunload', () => this._leaveRoom());
    window.addEventListener('hashchange', () => this._navigate());
  }

  _attachServerEvents() {
    const playersList  = document.getElementById('players');
    const roomsList    = document.getElementById('games');

    this._socket.on('room-joined', room => {
      this._currentRoom = room;
      document.location.hash = room;

      document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
      document.getElementById('game').classList.add('active');
      document.querySelector('#game h2').innerHTML = `Room ${room}`;
      document.getElementById('invite-link').innerHTML = `<a href='${document.location}'>${document.location}</a>`;

      this._fireEvent('join', room);
    });

    this._socket.on('players', players => {
      playersList.innerHTML = players.map(p => `<li>${p}</li>`)
                                     .join('');
    });

    this._socket.on('list', list => {
      roomsList.innerHTML = list.map(room => `<li><a href='#${room}'>${room}</a></li>`)
                                .join('');
    });

    this._socket.on('err', msg => {
      alert(msg);
    });

    // Request room list on first page load
    this._socket.emit('list');
  }

  _leaveRoom() {
    if ( !this._currentRoom ) return;
    this._socket.emit('leave', this._currentRoom);
    this._fireEvent('leave', this._currentRoom);
  }

  _navigate() {
    let hash = window.location.hash;
    if ( hash.startsWith('#') ) hash = hash.substr(1);
    if ( hash == '' ) {
      // Back to front porch "page"
      document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
      document.getElementById('front-porch').classList.add('active');
      this._leaveRoom();
    } else {
      // Go to this room
      this._socket.emit('join', hash);
    }
  }

}
