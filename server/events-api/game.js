const { v4: uuid } = require('uuid');

module.exports = async io => {

  let games = [];

  io.on('connection', socket => {

    socket.on('create', config => {
      const game = uuid();
      games.push(game);
      socket.join(game);
      socket.emit('game-joined', game);
      console.log("Created game", game);
    });

    socket.on('join', game => {
      socket.join(game);
      socket.emit('game-joined', game);
    });

    socket.on('list', () => {
      socket.emit('list', games);
    });

    socket.on('leave', game => {
      socket.leave(game);
      io.in(game).clients((error, clients) => {
        if (error) throw error;
        if ( games.includes(game) && clients.length == 0 ) {
          games.splice(games.indexOf(game), 1);
          console.log("Cleaned up game", game);
        }
      });
    });

    socket.on('message', ({game, message}) => {
      io.to(game).emit('message', message);
    });

  });

}
