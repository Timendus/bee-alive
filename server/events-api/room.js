const { v4: uuid } = require('uuid');

module.exports = async io => {

  let rooms = [];

  io.on('connection', socket => {

    socket.on('create', async () => {
      const room = uuid().substring(0,6).toUpperCase();
      rooms.push(room);
      socket.join(room);
      console.log("Created room", room);

      // Tell client it joined this new room
      socket.emit('room-joined', room);

      // Tell everyone the new room exists
      io.emit('list', rooms);

      // Tell everyone in this room who the players are
      const players = await playersInroom(room);
      io.to(room).emit('players', players);
    });

    socket.on('join', async room => {
      if ( !rooms.includes(room) ) {
        socket.emit('err', 'Sorry, this room doesn\'t exist (anymore)');
        return;
      }

      socket.join(room);

      // Tell client it joined this existing room
      socket.emit('room-joined', room);

      // Tell everyone in this room who the players are
      const players = await playersInroom(room);
      io.to(room).emit('players', players);
    });

    socket.on('list', () => {
      socket.emit('list', rooms);
    });

    socket.on('leave', async room => {
      socket.leave(room);

      // Tell everyone in this room who the players are
      const players = await playersInroom(room);
      io.to(room).emit('players', players);

      if ( rooms.includes(room) && players.length == 0 ) {
        rooms.splice(rooms.indexOf(room), 1); // Remove this room from the list
        io.emit('list', rooms);               // Tell everyone the room has disappeared
        console.log("Cleaned up room", room);
      }
    });

    socket.on('message', ({room, message}) => {
      io.to(room).emit('message', message);
    });

  });

  function playersInroom(room) {
    return new Promise((resolve, reject) => {
      io.in(room).clients((error, clients) => {
        if (error) reject(error);
        resolve(clients);
      });
    });
  }
}
