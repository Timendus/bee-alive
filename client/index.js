import io from './socketio';

window.addEventListener('load', () => {

  const socket = io.game();
  let currentGame;


  /* Respond to UI events */

  const create = document.getElementById('create');
  create.addEventListener('click', () => {
    socket.emit('create');
  });

  const join = document.getElementById('join');
  join.addEventListener('submit', e => {
    const game = join.querySelector('input').value;
    socket.emit('join', game);
    e.preventDefault();
  });

  const games = document.querySelector('ul#games');
  games.addEventListener('click', e => {
    const game = e.target.closest('li').dataset.game;
    socket.emit('join', game);
  });

  // Messaging stuff

  const messages = document.getElementById('messages');
  const message  = document.getElementById('message');

  message.addEventListener('submit', e => {
    const input = message.querySelector('input');
    const msg = input.value;
    input.value = '';
    socket.emit('message', { game: currentGame, message: msg });
    e.preventDefault();
  });


  /* Respond to server events */

  socket.on('list', list => {
    games.innerHTML = list.map(game => `<li data-game='${game}'>${game}</li>`)
                          .join('');
  });

  socket.on('game-joined', game => {
    currentGame = game;
    document.getElementById('front-porch').classList.remove('active');
    document.getElementById('game').classList.add('active');
    document.querySelector('#game h2').innerHTML = `"Game" ${game}`;
  });

  socket.on('message', msg => {
    messages.innerHTML += '\n'+msg;
  });

  // Request game list

  socket.emit('list');


});
