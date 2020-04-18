class BeeGame {
  init() {
    return {
      frame: 0,
      players: [],
    };
  }

  update(state, events) {
    return events.reduce(updateState, { ...state, frame: state.frame + 1 });
  }
}

function updateState(state, event) {
  return {
    ...state,
    players: updatePlayers(state.players, event),
  };
}

function updatePlayers(players, event) {
  switch (event.type) {
    case "connect":
      return [...players, { id: event.clientid, x: 0, y: 0 }];
    case "disconnect":
      return players.filter((player) => player.id !== event.clientid);
    case "game-input":
      return players.map((player) =>
        event.clientid === player.clientid
          ? updatePlayerInput(player, input)
          : player
      );
    default:
      return players;
  }
}

function updatePlayerInput(player, input) {
  return {
    ...player,
    x: player.x + (input === "left" ? -1 : input === "right" ? 1 : 0),
    y: player.y + (input === "up" ? -1 : input === "down" ? 1 : 0),
  };
}

module.exports = {
  BeeGame,
};
