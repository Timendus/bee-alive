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
  boidCount: 4
}, {
  id: 1,
  position: createV(1024 - 64, 512),
  boidCount: 4
}, {
  id: 2,
  position: false,
  boidCount: 10
}];

const gameDuration = 30; // seconds

class BeeGame {
  init() {
    const state = {
      frame: 0,
      remaining: gameDuration * 30,
      playing: false,
      winning: [],
      players: [],
      teams: teams,
      boids: [
        ...teams.flatMap(team =>
          createBoidSwarm({
            center: team.position,
            count: team.boidCount,
            teamId: team.id,
          })
        ),
      ],
      randomBoids: [
        ...randomBoids(10, gameDuration * 30)
      ]
    };
    log.debug("Init state", { state });
    return state;
  }

  update(state, events) {
    state = events.reduce(handleEvent, state)
    const playing = areWePlaying(state);
    state = {
      ...state,
      frame: state.frame + 1,
      remaining: playing ? state.remaining - 1 : state.remaining,
      playing: playing,
      winning: winningTeams(state.teams, state.boids),
      players: !playing ? state.players : state.players.map(player => updatePlayer(player)),
      boids: !playing ? state.boids : updateBoids(state.boids, { players: state.players })
                                      .concat(newBoids(state.frame, state.randomBoids)),
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

function areWePlaying(state) {
  if (state.players.some(p => !p.ready))
    return false;
  return state.remaining > 1;
}

function createBoidSwarm({ center, count, teamId }) {
  const boids = [];
  for (let index = 0; index < count; index++) {
    let movement;
    if ( center ) {
      movement = boidsInACircle(index, count, center);
    } else {
      movement = boidsAllOverThePlace();
    }

    boids.push({
      position: movement.position,
      velocity: movement.velocity,
      teamId,
    });
  }
  return boids;
}

function boidsInACircle(index, count, center) {
  const angle = (Math.PI * 2) * index / count;
  const direction = createV(
    Math.cos(angle),
    Math.sin(angle)
  );
  return {
    position: addV(center, multiplyV(direction, 50)),
    velocity: multiplyV(perpendicularClockwiseV(direction), 1)
  };
}

function boidsAllOverThePlace() {
  return {
    position: createV(random(10, 1014), random(10, 1014)),
    velocity: randomV(),
  }
}

// Note: only for use in init function!
// Otherwise we're not deterministic
function random(min, max) {
  return min + Math.floor(Math.random() * Math.floor(max + 1 - min));
}

function newBoids(frame, randomBoids) {
  return randomBoids.filter(b => b.frame == frame);
}

function randomBoids(numberOfBoids, frames) {
  const boids = [];
  for ( let i = 0; i < numberOfBoids; i++ ) {
    boids.push({
      frame: random(0, frames),
      position: teams[random(0,1)].position,
      velocity: randomV(),
      teamId: teams[2].id
    });
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
    position: keepInCanvas(floorV(addV(player.position, velocity))),
    velocity: floorV(velocity),
  }
}

function keepInCanvas(position) {
  return {
    x: Math.max(10, Math.min(1014, position.x)),
    y: Math.max(10, Math.min(1014, position.y))
  };
}

function winningTeams(teams, boids) {
  let max = 0;
  let winners = [];
  teams.forEach(team => {
    const numBoids = boids.filter(boid => boid.teamId == team.id).length;
    if ( numBoids == max ) {
      winners.push(team);
    }
    if ( numBoids > max ) {
      max = numBoids;
      winners = [team];
    }
  });
  return winners;
}

function updateBoids(boids, { players }) {
  // We interpret players as 'other surrounding' boids as well.
  const boidsAndPlayers = boids.concat(players);
  const teamIds = teams.map(team => team.id);
  const teamsObj = teamIds.map(teamId => ({
    boids: boidsAndPlayers.filter(boid => boid.teamId === teamId),
    allies: players.filter(player => player.teamId === teamId),
  }));

  const { winner, loser } = duel(teamsObj);
  takeOverNearestBoid(winner, loser);
  takeOverNearestBoid(teamsObj[0], teamsObj[2]);
  takeOverNearestBoid(teamsObj[1], teamsObj[2]);

  return boids.map((boid) => updateBoid(boid, teamsObj[boid.teamId]));
}

function duel(teams) {
  if ( teamSpread(teams[0]) > teamSpread(teams[1]) ) {
    return {
      winner: teams[1],
      loser: teams[0]
    };
  } else {
    return {
      winner: teams[0],
      loser: teams[1]
    };
  }
}

function teamSpread(team) {
  const xCoords = team.boids.map(b => b.position.x);
  const yCoords = team.boids.map(b => b.position.y);
  const boundingBox = {
    width: Math.max(...xCoords) - Math.min(...xCoords),
    height: Math.max(...yCoords) - Math.min(...yCoords)
  };
  boundingBox.surface = boundingBox.width * boundingBox.height;
  return boundingBox.surface;
}

function teamCenter(team) {
  let xCoords, yCoords;
  if ( team.allies.length > 0 ) {
    xCoords = team.allies.map(a => a.position.x);
    yCoords = team.allies.map(a => a.position.y);
  } else {
    xCoords = team.boids.map(b => b.position.x);
    yCoords = team.boids.map(b => b.position.y);
  }

  return {
    x: xCoords.reduce((sum, x) => sum + x, 0) / xCoords.length,
    y: yCoords.reduce((sum, y) => sum + y, 0) / yCoords.length
  }
}

function takeOverNearestBoid(winner, loser) {
  // TODO: don't take over all boids ;)
  const takeOverDistance = 200;
  if (winner.boids.length == 0) return;
  const center = teamCenter(winner);
  for (const boid of loser.boids) {
    const distance = distanceV(boid.position, center);
    if (distance >= takeOverDistance) {
      continue;
    }
    boid.teamId = winner.boids[0].teamId;
  }
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

function updateBoid(boid, { boids, allies }) {
  const separationV = getSeparation(boid, boids, { desiredSeparation: 20 });
  const alignmentV = getAlignment(boid, boids, { neighborDistance: 50 });
  const cohesionV = getCohesion(boid, boids, { neighborDistance: 100 });
  const playerAttractionV = getPlayerAttraction(boid, allies);
  let acceleration = [
    multiplyV(separationV, 0.000015),
    multiplyV(alignmentV,  0.000001),
    multiplyV(cohesionV,   0.000001),
    multiplyV(playerAttractionV, 1),
  ].reduce(addV, zeroV);

  // Drag
  acceleration = addV(acceleration, multiplyV(boid.velocity, -0.05));

  return {
    ...boid,
    position: keepInCanvas(floorV(addV(boid.position, boid.velocity))),
    velocity: floorV(addV(boid.velocity, acceleration)),
  };
}

const zeroV = { x: 0, y: 0 };

// Note: only for use in init function!
// Otherwise we're not deterministic
function randomV() {
  return {
    x: random(-3,3),
    y: random(-3,3)
  }
}

function floorV(v) {
  return {
    x: Math.floor(v.x * 1000) / 1000,
    y: Math.floor(v.y * 1000) / 1000,
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
  return {
    ...state,
    players: handlePlayerEvent(state.players, event),
  };
}

function createPlayer({ id, teamId = null }) {
  teamId = teamId || (id % 2)
  const team = teams[teamId];
  const position = team.position;
  const velocity = zeroV;
  return {
    id: id,
    position,
    velocity,
    input: {},
    teamId,
    ready: false
  };
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
    ready: (input.key == 'ready' && input.direction == 'up') ? !player.ready : player.ready,
    input: {
      ...player.input,
      [input.key]: input.direction === 'down',
    }
  };
}

module.exports = {
  BeeGame,
};
