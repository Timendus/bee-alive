import Room from './room';

window.addEventListener('load', () => {

  const messages    = document.getElementById('messages');
  const messageForm = document.getElementById('message');

  const room = new Room();

  room.addEventListener('join', id => {
    console.log("Joined room", id);
    messages.innerHTML = 'Messages here';
  });

  room.addEventListener('leave', id => {
    console.log("Left room", id);
  });

  room.addEventListener('message', msg => {
    console.log("Received message:", msg);
    messages.innerHTML += '\n'+msg;
  });

  messageForm.addEventListener('submit', e => {
    const input = messageForm.querySelector('input');
    room.broadcast(input.value);
    input.value = '';
    e.preventDefault();
  });

});
