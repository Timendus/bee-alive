class Input {
  constructor(canvasId = 'canvas') {
    this._canvas = document.getElementById(canvasId);

    if (!this._canvas) throw new Error('canvas element not found');
  }

  destroy() {
    this.removeListeners();
  }

  handleInput(e) {
    e.preventDefault();
    let gameInput;
    switch (e.key) {
      case 'w':
        gameInput = 'up';
        break;
      case 'a':
        gameInput = 'left';
        break;
      case 's':
        gameInput = 'down';
        break;
      case 'd':
        gameInput = 'right';
        break;
    }

    if (gameInput) {
      this._room.networkClient.gameInput(gameInput);
    }
  }

  attachListeners(room) {
    if (!room) throw new Error('room must be passed');

    this._room = room;

    this._handler = e => this.handleInput(e);
    this._canvas.addEventListener('keydown', this._handler);
  }

  removeListeners() {
    if (this._handler) {
      this._canvas.removeEventListener(this._handler);
    }

    this._room = undefined;
  }
}

module.exports = Input;