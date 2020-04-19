class Input {
  constructor(canvasId = 'canvas') {
    this.state = {};
    this._canvas = document.getElementById(canvasId);

    if (!this._canvas) throw new Error('canvas element not found');
  }

  destroy() {
    this.removeListeners();
  }

  getInputName(key) {
    switch (key) {
      case 'w':
        return 'up';
      case 'a':
        return 'left';
      case 's':
        return 'down';
      case 'd':
        return 'right';
      default:
        return null;
    }
  }

  _handleKeyEvent(direction, e) {
    e.preventDefault();
    const currentDirection = this.state[e.key];
    if (currentDirection === direction) { return; }
    this.state[e.key] = direction;
    const keyName = this.getInputName(e.key);
    if (!keyName) { return; }
    this._room.networkClient.gameInput({
      key: keyName,
      direction
    });
  }

  attachListeners(room) {
    if (!room) throw new Error('room must be passed');

    this._room = room;


    this._canvas.addEventListener('keydown', this._handleKeyEvent.bind(this, 'down'));
    this._canvas.addEventListener('keyup', this._handleKeyEvent.bind(this, 'up'));
  }

  removeListeners() {
    if (this._handler) {
      this._canvas.removeEventListener(this._handler);
    }

    this._room = undefined;
  }
}

module.exports = Input;