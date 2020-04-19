const { Lobby } = require('./room');
const Renderer = require('./renderer');
const Input = require('./input');
const draw = require('./draw');

function drawImage(ctx, image, x, y, scale, rotation){
  ctx.setTransform(scale, 0, 0, scale, x, y); // sets scale and origin
  ctx.rotate(rotation);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
}

window.addEventListener('load', () => {

  const lobby = new Lobby();
  let room = null;

  const roomMessages     = document.getElementById('roomMessages');
  const roomChat         = document.getElementById('roomChat');
  const lobbyMessages    = document.getElementById('lobbyMessages');
  const lobbyChat        = document.getElementById('lobbyChat');
  const createButton     = document.getElementById('create');
  const joinForm         = document.getElementById('join');
  const roomsList        = document.getElementById('games');
  const playersList      = document.getElementById('players');
  const lobbyPlayersList = document.getElementById('lobbyPlayers');
  const userName         = document.getElementById('user-name');
  const input            = new Input('canvas');
  const gameSize         = 1024;
  const renderer         = new Renderer({ gameSize });

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

    room.addEventListener('players', players => {
      playersList.innerHTML = players.map(p => `<li>${p.userName}</li>`)
                                     .join('');
    });

    room.addEventListener('chatMessage', msg => {
      roomMessages.innerHTML += `
        <div class="chat-message${ msg.me? ' mine' : ''}">
          <p class="message">${msg.message}</p>
          <p class="name">${msg.userName}</p>
        </div>\n
      `;
      roomMessages.scrollTop = roomMessages.scrollHeight;
    });

    room.addEventListener('leave', () => {
      console.log("Left room", room.roomId);
      document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
      document.getElementById('front-porch').classList.add('active');
      renderer.stopRenderLoop();
      input.removeListeners();
    });

    renderer.setRenderCallback((progress, ctx, scale) =>
      draw({progress, ctx, scale, simulator: room.simulator}));

    renderer.startRenderLoop();
    input.attachListeners(room);
  });

  lobby.addEventListener('roomList', list => {
    roomsList.innerHTML = list.map(room => `<li><a class="room-link" href='#${room}'>${room}</a></li>`).join('');
  });

  lobby.addEventListener('players', players => {
    lobbyPlayersList.innerHTML = players.map(p => `<li>${p.userName}${p.inRoom ? '<span>(in a game)</span>' : ''}</li>`)
                                        .join('');
  });

  lobby.addEventListener('chatMessage', msg => {
    lobbyMessages.innerHTML += `
      <div class="chat-message${ msg.me? ' mine' : ''}">
        <p class="message">${msg.message}</p>
        <p class="name">${msg.userName}</p>
      </div>\n
    `;
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

  userName.addEventListener('submit', e => {
    lobby.setName(userName.querySelector('input').value);
    document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
    document.getElementById('front-porch').classList.add('active');
    e.preventDefault();
  });

});
