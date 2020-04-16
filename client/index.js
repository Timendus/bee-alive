import io from './socketio';
import GameSeparation from './game-separation';

window.addEventListener('load', () => {

  const messages    = document.getElementById('messages');
  const messageForm = document.getElementById('message');

  const socket = io.game();
  const gameSep = new GameSeparation(socket);

  gameSep.addEventListener('join', () => {
    messages.innerHTML = 'Messages here';
  });

  messageForm.addEventListener('submit', e => {
    const input = messageForm.querySelector('input');
    console.log(gameSep.currentGame());
    socket.emit('message', { game: gameSep.currentGame(), message: input.value });
    input.value = '';
    e.preventDefault();
  });

  socket.on('message', msg => {
    messages.innerHTML += '\n'+msg;
  });

});
