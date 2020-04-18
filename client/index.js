const { Lobby } = require('./room');
const Renderer = require('./renderer');

window.addEventListener('load', () => {

  const lobby = new Lobby();
  let room = null;

  const roomMessages  = document.getElementById('roomMessages');
  const roomChat      = document.getElementById('roomChat');
  const lobbyMessages = document.getElementById('lobbyMessages');
  const lobbyChat     = document.getElementById('lobbyChat');
  const createButton  = document.getElementById('create');
  const joinForm      = document.getElementById('join');
  const roomsList     = document.getElementById('games');
  const playersList   = document.getElementById('players');
  const renderer      = new Renderer();

  // Room events

  lobby.addEventListener('join', newRoom => {

    room = newRoom;
    console.log("Joined room", newRoom.roomId);

    // Show this room

    document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
    document.getElementById('game').classList.add('active');
    document.querySelector('#game h2').innerHTML = `Room ${newRoom.roomId}`;
    document.getElementById('invite-link').innerHTML = `<a href='${document.location}'>${document.location}</a>`;
    roomMessages.innerHTML = '';

    // Attach event handlers to room

    room.addEventListener('chatMessage', msg => {
      roomMessages.innerHTML += `${msg}\n`;
    });

    room.addEventListener('leave', () => {
      console.log("Left room", room.roomId);
      document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
      document.getElementById('front-porch').classList.add('active');
      renderer.stopRenderLoop();
    });

    // TODO: move this?
    renderer.setRenderCallback((progress, ctx) => {
      ctx.fillRect(10, 10, 30, 30);
    });
    renderer.startRenderLoop();
  });

  lobby.addEventListener('roomList', list => {
    roomsList.innerHTML = list.map(room => `<li><a class="room-link" href='#${room}'>${room}</a></li>`).join('');
  });

  lobby.addEventListener('chatMessage', msg => {
    lobbyMessages.innerHTML += `${msg}\n`;
  });

  // UI events

  createButton.addEventListener('click', () => lobby.create());

  joinForm.addEventListener('submit', e => {
    lobby.join(joinForm.querySelector('input').value);
    e.preventDefault();
  });

  lobbyChat.addEventListener('submit', e => {
    const input = lobbyChat.querySelector('input');
    lobby.chatMessage(input.value);
    input.value = '';
    e.preventDefault();
  });

  roomChat.addEventListener('submit', e => {
    const input = roomChat.querySelector('input');
    room.chatMessage(input.value);
    input.value = '';
    e.preventDefault();
  });

});
