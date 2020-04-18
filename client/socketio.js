import io from 'socket.io-client';

const room = io('/room');

export default {
  room: () => room
}
