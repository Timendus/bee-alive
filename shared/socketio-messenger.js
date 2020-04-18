class SocketIOMessenger {
  constructor(socket) {
    this.socket = socket;
    this.socket.on('message', this.handleMessage.bind(this));
    this.socket.on('close', this.handleClose.bind(this));
  }

  handleMessage(message) {
    this.onmessage(message);
  }

  handleClose() {
    this.onclose();
  }

  send(message) {
    this.socket.emit('message', message);
  }

  close() {
    this.socket.close();
  }
}

module.exports = {
  SocketIOMessenger
}