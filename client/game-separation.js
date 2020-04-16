export default function gameSeparation(socket, joinCallback, leaveCallback) {

  let currentGame;

  const createButton = document.getElementById('create');
  const joinForm     = document.getElementById('join');
  const playersList  = document.getElementById('players');
  const gamesList    = document.getElementById('games');


  /* Respond to UI events */

  // Create and join actions

  createButton.addEventListener('click', () => {
    socket.emit('create');
  });

  joinForm.addEventListener('submit', e => {
    const game = join.querySelector('input').value;
    document.location.hash = game;
    e.preventDefault();
  });

  // Browser navigation stuff

  function leaveGame() {
    if ( !currentGame ) return;
    socket.emit('leave', currentGame);
    leaveCallback();
  }

  function navigate() {
    let hash = window.location.hash;
    if (hash.startsWith('#')) hash = hash.substr(1);
    if ( hash == '' ) {
      // Back to front porch "page"
      document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
      document.getElementById('front-porch').classList.add('active');
      leaveGame();
    } else {
      // Go to this game
      socket.emit('join', hash);
    }
  }

  window.addEventListener('beforeunload', () => leaveGame());
  window.addEventListener('hashchange', () => navigate());
  navigate(); // Also trigger on page load


  /* Respond to server events */

  socket.on('list', list => {
    gamesList.innerHTML = list.map(game => `<li><a href='#${game}'>${game}</a></li>`)
                              .join('');
  });

  socket.on('game-joined', game => {
    currentGame = game;
    document.location.hash = game;

    document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
    document.getElementById('game').classList.add('active');
    document.querySelector('#game h2').innerHTML = `"Game" ${game}`;
    document.getElementById('invite-link').innerHTML = `<a href='${document.location}'>${document.location}</a>`;
    socket.emit('players');

    joinCallback(game);
  });

  socket.on('players', players => {
    playersList.innerHTML = players.map(p => `<li>${p}</li>`)
                                   .join('');
  });

  socket.on('err', msg => {
    alert(msg);
  });

  // Request game list on first page load

  socket.emit('list');

  return () => currentGame;
}
