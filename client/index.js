const { Lobby } = require('./room');

window.addEventListener('load', () => {

  const lobby = new Lobby();

  const messages     = document.getElementById('messages');
  const messageForm  = document.getElementById('message');
  const createButton = document.getElementById('create');
  const joinForm     = document.getElementById('join');
  const roomsList    = document.getElementById('games');
  const playersList  = document.getElementById('players');

  // Room events

  lobby.addEventListener('join', room => {
    console.log("Joined room", id);
    document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
    document.getElementById('game').classList.add('active');
    document.querySelector('#game h2').innerHTML = `Room ${id}`;
    document.getElementById('invite-link').innerHTML = `<a href='${document.location}'>${document.location}</a>`;
    messages.innerHTML = 'Messages here';
  });

  lobby.addEventListener('leave', id => {
    console.log("Left room", id);
    document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
    document.getElementById('front-porch').classList.add('active');
  });

  lobby.addEventListener('roomList', list => {
    roomsList.innerHTML = list.map(room => `<li><a href='#${room}'>${room}</a></li>`)
                              .join('');
  });

  // room.addEventListener('players', players => {
  //   playersList.innerHTML = players.map(p => `<li>${p}</li>`)
  //                                  .join('');
  // });

  // UI events

  createButton.addEventListener('click', () => lobby.create());

  joinForm.addEventListener('submit', e => {
    lobby.join(joinForm.querySelector('input').value);
    e.preventDefault();
  });

  messageForm.addEventListener('submit', e => {
    const input = messageForm.querySelector('input');
    room.broadcast(input.value);
    input.value = '';
    e.preventDefault();
  });

});
