class BeeGame {
  init() {
    return {
      frame: 0
    }
  }

  update(state, events) {
    // Handle game state updating.
    return {
      ...state,
      frame: state.frame + 1,
    };
  }
}

module.exports = {
  BeeGame
}