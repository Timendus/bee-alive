const { Lobby } = require('./room');
const Renderer = require('./renderer');
const Input = require('./input');
const Textures = require('./textures');

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
  const input         = new Input('canvas');
  const gameSize      = 1024;
  const renderer      = new Renderer({ gameSize });

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
      roomMessages.scrollTop = roomMessages.scrollHeight;
    });

    room.addEventListener('leave', () => {
      console.log("Left room", room.roomId);
      document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
      document.getElementById('front-porch').classList.add('active');
      renderer.stopRenderLoop();
      input.removeListeners();
    });

    // TODO: move this?
    renderer.setRenderCallback((progress, ctx, scale) => {
      const simulator = room.simulator;
      const gameState = simulator.getCurrentState();

      const playerSize = Math.max(5, 25 * scale);

      for (const player of gameState.players) {
        ctx.drawImage(Textures.player, player.position.x * scale, player.position.y * scale, playerSize, playerSize);
      }
    });
    renderer.startRenderLoop();
    input.attachListeners(room);
  });

  lobby.addEventListener('roomList', list => {
    roomsList.innerHTML = list.map(room => `<li><a class="room-link" href='#${room}'>${room}</a></li>`).join('');
  });

  lobby.addEventListener('chatMessage', msg => {
    lobbyMessages.innerHTML += `${msg}\n`;
    lobbyMessages.scrollTop = lobbyMessages.scrollHeight;
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
