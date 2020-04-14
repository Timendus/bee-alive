import io from 'socket.io-client';

const game = io('/game');

export default {
  game: () => game
}
