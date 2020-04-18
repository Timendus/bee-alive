class Renderer {
  constructor({
    canvasWrapperId = 'canvas-wrapper',
    canvasId = 'canvas',
    gameSize = 1024
  }) {
    this._canvasWrapper = document.getElementById(canvasWrapperId);
    this._canvas = document.getElementById(canvasId);
    this._gameSize = gameSize;

    if (!this._canvasWrapper) throw new Error('canvas wrapper element not found');
    if (!this._canvas) throw new Error('canvas element not found');

    this._observeResize();
    this._ctx = this._canvas.getContext('2d');
    this._rendering = false;
  }

  _updateSize() {
    const w = this._canvasWrapper.clientWidth;
    const h = this._canvasWrapper.clientHeight;

    const size = w > h ? h : w;

    this._width = size;
    this._height = size;

    this._scale = size / this._gameSize;

    this._canvas.setAttribute('width', this._width);
    this._canvas.setAttribute('height', this._height);
  }

  _observeResize() {
    this._resizeObserver = new ResizeObserver(() => {
      this._updateSize();
    });

    this._resizeObserver.observe(this._canvasWrapper);
  }

  setRenderCallback(cb) {
    this._cb = cb;
  }

  startRenderLoop() {
    if (this._rendering === false) {
      this._rendering = true;

      window.requestAnimationFrame(this.render.bind(this));
    } else {
      console.error('render loop was already started');
    }
  }

  stopRenderLoop() {
    if (this._rendering === true) {
      this._rendering = false;
    } else {
      console.error('no render loop was running');
    }
  }

  render(timestamp) {
    if (!this._start) {
      this._start = timestamp;
    }

    let progress = timestamp - this._start;

    this._ctx.clearRect(0, 0, this._width, this._height);

    // do the work
    if (this._cb) {
      this._cb(progress, this._ctx, this._scale);
    }

    if (this._rendering) {
      window.requestAnimationFrame(this.render.bind(this));
    } else {
      this._start = undefined;
    }
  }

  destroy() {
    this.stopRenderLoop();
    this._resizeObserver.disconnect();
  }
}

module.exports = Renderer;