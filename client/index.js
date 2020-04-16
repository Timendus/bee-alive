import io from './socketio';
import gameSeparation from './game-separation';

window.addEventListener('load', () => {

  const messages    = document.getElementById('messages');
  const messageForm = document.getElementById('message');

  const socket = io.game();
  const currentGame = gameSeparation(socket, newGame => {
    messages.innerHTML = 'Messages here';
  });

  messageForm.addEventListener('submit', e => {
    const input = messageForm.querySelector('input');
    socket.emit('message', { game: currentGame(), message: input.value });
    input.value = '';
    e.preventDefault();
  });

  socket.on('message', msg => {
    messages.innerHTML += '\n'+msg;
  });

});
