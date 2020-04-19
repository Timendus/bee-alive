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

const teams = [{
  id: 0,
  position: createV(64, 512),
}, {
  id: 1,
  position: createV(1024 - 64, 512)
}];

class BeeGame {
  init() {
    const state = {
      frame: 0,
      players: [],
      teams: teams,
      boids: [
        ...teams.flatMap(team =>
          createBoidSwarm({
            center: team.position,
            count: 10,
            teamId: team.id,
          })
        ),
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
      boids: updateBoids(state.boids, { players: state.players }),
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

const maxSpeed = 1000;
const maxForce = 0.01;

function createBoidSwarm({ center, count, teamId }) {
  const boids = [];
  for (let index = 0; index < count; index++) {
    const angle = (Math.PI * 2) * index / count;
    const direction = createV(
      Math.cos(angle),
      Math.sin(angle)
    );
    const position = addV(center, multiplyV(direction, 50));
    const velocity = multiplyV(perpendicularClockwiseV(direction), 1);
    boids.push({
      position,
      velocity,
      teamId,
    })
  }
  return boids;
}

function updatePlayer(player) {
  const movement = normalizeV({
    x: (player.input['right'] ? 1 : 0) - (player.input['left'] ? 1 : 0),
    y: (player.input['down'] ? 1 : 0) - (player.input['up'] ? 1 : 0),
  });

  const speed = 1;
  let velocity = addV(player.velocity, multiplyV(player.velocity, -0.1));
  velocity = addV(velocity, multiplyV(movement, speed));

  return {
    ...player,
    position: roundV(addV(player.position, velocity)),
    velocity: roundV(velocity),
  }
}

function updateBoids(boids, { players }) {
  // We interpret players as 'other surrounding' boids as well.
  const entities = boids.concat(players);
  const teamIds = [0, 1];
  const teams = teamIds.map(teamId => {
    const teamEntities = entities.filter(boid => boid.teamId === teamId);
    const teamPlayers = players.filter(player => player.teamId === teamId);
    const center = teamEntities.length && multiplyV(teamEntities.reduce(addV, zeroV), 1 / teamEntities.length);
    const spread = teamEntities.length && teamEntities.map(entity => distanceV(center, entity.position)).reduce((total, distance) => total + distance, 0);
    return {
      id: teamId,
      entities: teamEntities,
      players: teamPlayers,
      center,
      spread
    };
  });

  return boids.map((boid) => updateBoid(boid, { myTeam: teams[boid.teamId], enemyTeam: teams[(boid.teamId + 1) % 2] }));
}

function getSeparation(boid, boids) {
  const desiredSeparation = 10;
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

function getAlignment(boid, boids, { neighborDistance }) {
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
  let steer = substractV(sum, boid.velocity);
  steer = limitV(steer, maxForce);
  return steer;
}

function getCohesion(boid, boids, { neighborDistance }) {
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

function getPlayerAttraction(boid, players) {
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestPlayer = null;
  for (const player of players) {
    const distance = distanceV(boid.position, player.position);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPlayer = player;
    }
  }

  if (!closestPlayer) { return zeroV; }
  const player = closestPlayer;

  const difference = substractV(player.position, boid.position);
  const distance = lengthV(difference);
  const directionTowardPlayer = normalizeV(difference);
  const clockwise = perpendicularClockwiseV(directionTowardPlayer);

  return [
    multiplyV(directionTowardPlayer, 0.01 * distance),
    multiplyV(clockwise, 0.01),
    // multiplyV(player.velocity, 0.001),
  ].reduce(addV, zeroV);
}

function updateBoid(boid, { myTeam, enemyTeam }) {
  const { entities, players } = myTeam;
  const separationV = getSeparation(boid, entities, { desiredSeparation: 20 });
  const alignmentV = getAlignment(boid, entities, { neighborDistance: 50 });
  const cohesionV = getCohesion(boid, entities, { neighborDistance: 100 });
  const playerAttractionV = getPlayerAttraction(boid, players);
  let acceleration = [
    multiplyV(separationV, 0.000015),
    multiplyV(alignmentV,  0.000001),
    multiplyV(cohesionV,   0.000001),
    multiplyV(playerAttractionV, 1),
  ].reduce(addV, zeroV);

  // Drag
  acceleration = addV(acceleration, multiplyV(boid.velocity, -0.05));

  const teamLosing = myTeam.spread < enemyTeam.spread;
  const boidLosing = teamLosing && enemyTeam.entities.some(entity => distanceV(boid.position, entity.position) < 200);
  const teamId = boidLosing ? enemyTeam.id : myTeam.id;

  return {
    ...boid,
    teamId,
    position: roundV(addV(boid.position, boid.velocity)),
    velocity: roundV(addV(boid.velocity, acceleration)),
  };
}

const zeroV = { x: 0, y: 0 };

function roundV(v) {
  return {
    x: Math.round(v.x * 1000) / 1000,
    y: Math.round(v.y * 1000) / 1000,
  }
}

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

function perpendicularClockwiseV(v) {
  return {
    x: v.y,
    y: -v.x,
  }
}

function perpendicularCounterClockwiseV(v) {
  return {
    x: -v.y,
    y: v.x,
  }
}

function limitV(v, limit) {
  const length = lengthV(v);
  return length > limit ? multiplyV(v, 1 / limit) : v;
}

function handleEvent(state, event) {
  if (event.type === 'game-input') {
    console.log({ frame: state.frame, input: event.input })
  }
  return {
    ...state,
    players: handlePlayerEvent(state.players, event),
  };
}

function createPlayer({ id, teamId = null }) {
  teamId = teamId || (id % teams.length)
  const team = teams[teamId];
  const position = team.position;
  const velocity = zeroV;
  return { id: id, position, velocity, input: {}, teamId };
}

function handlePlayerEvent(players, event) {
  switch (event.type) {
    case "connect":
      return [...players, createPlayer({ id: event.clientid, teamId: event.teamId })]
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
