const { v4: uuid } = require('uuid');

module.exports = async io => {

  let games = [];

  io.on('connection', socket => {

    socket.on('create', async () => {
      const game = uuid().substring(0,6).toUpperCase();
      games.push(game);
      socket.join(game);
      console.log("Created game", game);

      // Tell client it joined this new game
      socket.emit('game-joined', game);

      // Tell everyone the new game exists
      io.emit('list', games);

      // Tell everyone in this game who the players are
      io.in(game).emit('players', await playersInGame(game));
    });

    socket.on('join', async game => {
      if ( !games.includes(game) ) {
        return socket.emit('err', 'Sorry, this game doesn\'t exist (anymore)');
      }

      socket.join(game);

      // Tell client it joined this existing game
      socket.emit('game-joined', game);

      // Tell everyone in this game who the players are
      io.in(game).emit('players', await playersInGame(game));
    });

    socket.on('list', () => {
      socket.emit('list', games);
    });

    socket.on('leave', async game => {
      socket.leave(game);

      // Tell everyone in this game who the players are
      const players = await playersInGame(game);
      io.in(game).emit('players', players);

      if ( games.includes(game) && players.length == 0 ) {
        games.splice(games.indexOf(game), 1);
        // Tell everyone the game has disappeared
        io.emit('list', games);
        console.log("Cleaned up game", game);
      }
    });

    socket.on('message', ({game, message}) => {
      io.to(game).emit('message', message);
    });

  });

  function playersInGame(game) {
    return new Promise((resolve, reject) => {
      io.in(game).clients((error, clients) => {
        if (error) reject(error);
        resolve(clients);
      });
    });
  }
}
