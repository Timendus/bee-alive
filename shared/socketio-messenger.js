class SocketIOMessenger {
  constructor(socket) {
    this.socket = socket;
    this._messageHandler = this.handleMessage.bind(this);
    this._closeHandler = this.handleClose.bind(this);
    this.socket.on('message', this._messageHandler);
    this.socket.on('close', this._closeHandler);
  }

  handleMessage(message) {
    this.onmessage(message);
  }

  handleClose() {
    this.close();
  }

  send(message) {
    this.socket.emit('message', message);
  }

  close() {
    if ( this.onclose ) this.onclose();
    this.socket.off('message', this._messageHandler);
    this.socket.off('close', this._closeHandler);
  }
}

module.exports = {
  SocketIOMessenger
}
