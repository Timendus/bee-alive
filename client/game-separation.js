export default class GameSeparation {

  constructor(socket) {
    this._socket = socket;
    this._currentGame = null;
    this._events = {
      'join':         [],
      'leave':        []
    };

    this._attachUIEvents();
    this._attachServerEvents();
    this._navigate(); // Trigger on page load
  }

  currentGame() {
    return this._currentGame;
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
      const game = join.querySelector('input').value;
      document.location.hash = game;
      e.preventDefault();
    });

    window.addEventListener('beforeunload', () => this._leaveGame());
    window.addEventListener('hashchange', () => this._navigate());
  }

  _attachServerEvents() {
    const playersList  = document.getElementById('players');
    const gamesList    = document.getElementById('games');

    this._socket.on('game-joined', game => {
      this._currentGame = game;
      document.location.hash = game;

      document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
      document.getElementById('game').classList.add('active');
      document.querySelector('#game h2').innerHTML = `"Game" ${game}`;
      document.getElementById('invite-link').innerHTML = `<a href='${document.location}'>${document.location}</a>`;

      this._fireEvent('join', game);
    });

    this._socket.on('players', players => {
      playersList.innerHTML = players.map(p => `<li>${p}</li>`)
                                     .join('');
    });

    this._socket.on('list', list => {
      gamesList.innerHTML = list.map(game => `<li><a href='#${game}'>${game}</a></li>`)
                                .join('');
    });

    this._socket.on('err', msg => {
      alert(msg);
    });

    // Request game list on first page load
    this._socket.emit('list');
  }

  _leaveGame() {
    if ( !this._currentGame ) return;
    this._socket.emit('leave', this._currentGame);
    this._fireEvent('leave', this._currentGame);
  }

  _navigate() {
    let hash = window.location.hash;
    if ( hash.startsWith('#') ) hash = hash.substr(1);
    if ( hash == '' ) {
      // Back to front porch "page"
      document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
      document.getElementById('front-porch').classList.add('active');
      this._leaveGame();
    } else {
      // Go to this game
      this._socket.emit('join', hash);
    }
  }

}
