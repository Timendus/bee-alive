const log = require("./log");

const eventTypePriority = {
  'connect': 1,
  'game-input': 2,
  'disconnect': 99
};
function compare(va,vb) {
  if (va === undefined) {
    if (vb === undefined) { return 0; }
    return 1;
  } else if (vb === undefined) {
    return -1;
  }
  return (va > vb) ? 1 : (vb > va ? -1 : 0);
}

class BeeGame {
  init() {
    const state = {
      frame: 0,
      players: [],
      boids: [
        { position: { x: 101, y: 100 }, velocity: { x: 0, y: 1 } },
        { position: { x: 100, y: 100 }, velocity: { x: 0, y: 0.5 } },
      ],
    };
    log.debug("Init state", { state });
    return state;
  }

  update(state, events) {
    state = events.reduce(handleEvent, state)
    state = {
      ...state,
      frame: state.frame + 1,
      players: state.players.map(player => updatePlayer(player)),
      boids: updateBoids(state.boids),
    };
    log.debug("Update state", { state, events });
    return state;
  }

  compareEvents(ea, eb) {
    if(!eventTypePriority[ea.type] || !eventTypePriority[eb.type]) {
      throw new Error(`${ea.type} is not a known event type`);
    }
    return compare(eventTypePriority[ea.type], eventTypePriority[eb.type])
      || compare(ea.clientid, eb.clientid)
      || compare(ea.input && ea.input.key, eb.input && eb.input.key)
      || compare(ea.input && ea.input.direction, eb.input && eb.input.direction)
      || compare(ea.name, eb.name);
  }
}

const maxSpeed = 2;
const maxForce = 0.03;

function updatePlayer(player) {
  return {
    ...player,
    position: addV(player.position, {
      x: (player.input['right'] ? 1 : 0) - (player.input['left'] ? 1 : 0),
      y: (player.input['down'] ? 1 : 0) - (player.input['up'] ? 1 : 0),
    })
  }
}

function updateBoids(boids) {
  return boids.map((boid) => updateBoid(boid, boids));
}

function getSeparation(boid, boids) {
  const desiredSeparation = 25;
  let count = 0;
  let steer = zeroV;
  for (const other of boids) {
    if (other === boid) {
      continue;
    }
    const distance = distanceV(boid.position, other.position);
    if (distance >= desiredSeparation) {
      continue;
    }
    const diff = multiplyV(
      normalizeV(substractV(boid.position, other.position)),
      1 / distance
    );
    steer = addV(steer, diff);
    count++;
  }
  if (count === 0) {
    return zeroV;
  }
  steer = multiplyV(steer, 1 / count);
  return limitV(multiplyV(normalizeV(steer), maxSpeed), maxForce);
}

function getAlignment(boid, boids) {
  const neighborDistance = 50;
  let sum = zeroV;
  let count = 0;
  for (const other of boids) {
    if (other === boid) {
      continue;
    }
    const distance = distanceV(boid.position, other.position);
    if (distance >= neighborDistance) {
      continue;
    }
    sum = addV(sum, other.velocity);
    count++;
  }
  if (count === 0) {
    return zeroV;
  }
  sum = multiplyV(sum, 1 / count);
  sum = normalizeV(sum);
  sum = multiplyV(sum, maxSpeed);
  steer = substractV(sum, boid.velocity);
  steer = limitV(steer, maxForce);
  return steer;
}

function getCohesion(boid, boids) {
  const neighborDistance = 50;
  let sum = zeroV;
  let count = 0;
  for (const other of boids) {
    if (other === boid) {
      continue;
    }
    const distance = distanceV(boid.position, other.position);
    if (distance >= neighborDistance) {
      continue;
    }
    sum = addV(sum, other.position);
    count++;
  }
  if (count === 0) {
    return zeroV;
  }
  sum = multiplyV(sum, 1 / count);

  let desired = substractV(sum, boid.position);
  desired = normalizeV(desired);
  desired = multiplyV(desired, maxSpeed);

  let steer = substractV(desired, boid.velocity);
  steer = limitV(steer, maxForce);
  return steer;
}

function updateBoid(boid, boids) {
  const separationV = getSeparation(boid, boids);
  const alignmentV = getAlignment(boid, boids);
  const cohesionV = getCohesion(boid, boids);
  const acceleration = [
    multiplyV(separationV, 1.5),
    multiplyV(alignmentV, 1.0),
    multiplyV(cohesionV, 1.0),
  ].reduce(addV, zeroV);
  return {
    ...boid,
    position: addV(boid.position, boid.velocity),
    velocity: addV(boid.velocity, acceleration),
  };
}

const zeroV = { x: 0, y: 0 };

function createV(x, y) {
  return { x, y };
}

function addV(v1, v2) {
  return {
    x: v1.x + v2.x,
    y: v1.y + v2.y,
  };
}

function substractV(v1, v2) {
  return {
    x: v1.x - v2.x,
    y: v1.y - v2.y,
  };
}

function distanceV(v1, v2) {
  return lengthV(substractV(v1, v2));
}

function multiplyV(v, f) {
  return { x: v.x * f, y: v.y * f };
}

function lengthV(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalizeV(v) {
  const length = lengthV(v);
  return length > 0 ? multiplyV(v, 1 / length) : zeroV;
}

function limitV(v, limit) {
  const length = lengthV(v);
  return length > limit ? multiplyV(v, 1 / limit) : v;
}

function handleEvent(state, event) {
  return {
    ...state,
    players: handlePlayerEvent(state.players, event),
  };
}

function handlePlayerEvent(players, event) {
  switch (event.type) {
    case "connect":
      return [...players, { id: event.clientid, position: zeroV, input: {} }];
    case "disconnect":
      return players.filter((player) => player.id !== event.clientid);
    case "game-input":
      return players.map((player) =>
        event.clientid === player.id
          ? handlePlayerInput(player, event.input)
          : player
      );
    default:
      return players;
  }
}

function handlePlayerInput(player, input) {
  return {
    ...player,
    input: {
      ...player.input,
      [input.key]: input.direction === 'down',
    }
  };
}

module.exports = {
  BeeGame,
};
