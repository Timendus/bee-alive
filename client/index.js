import io from './socketio';
import Room from './room';

window.addEventListener('load', () => {

  const messages    = document.getElementById('messages');
  const messageForm = document.getElementById('message');

  const socket = io.room();
  const room = new Room(socket);

  room.addEventListener('join', () => {
    messages.innerHTML = 'Messages here';
  });

  messageForm.addEventListener('submit', e => {
    const input = messageForm.querySelector('input');
    console.log(room.currentRoom());
    socket.emit('message', { room: room.currentRoom(), message: input.value });
    input.value = '';
    e.preventDefault();
  });

  socket.on('message', msg => {
    messages.innerHTML += '\n'+msg;
  });

});
