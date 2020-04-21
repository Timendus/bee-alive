"use strict";
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
const framesPerSecond = 30;

const WAITING_FOR_READY = 0;
const PLAYING = 1;
const ROUND_FINISHED = 2;
const RESET = 3;

class BeeGame {
  init() {
    const seed = Math.floor(Math.random() * 99999);
    const random = new Random(seed);
    const state = {
      frame: 0,
      seed,
      gameplay: {
        state: WAITING_FOR_READY,
        remaining: gameDuration * framesPerSecond,
        winning: []
      },
      players: [],
      teams: teams,
      boids: [
        ...teams.flatMap(team =>
          createBoidSwarm({
            center: team.position,
            count: team.boidCount,
            teamId: team.id,
            random
          })
        ),
      ],
      randomBoids: [
        ...randomBoids(0, 10, gameDuration * framesPerSecond, random)
      ]
    };
    log.debug("Init state", { state });
    return state;
  }

  update(state, events) {
    state = events.reduce(handleEvent, state);
    let remaining;

    switch(state.gameplay.state) {

      case WAITING_FOR_READY:
        state = {
          ...state,
          frame: state.frame + 1,
          gameplay: {
            ...state.gameplay,
            state: state.players.some(p => !p.ready) ? WAITING_FOR_READY : PLAYING
          }
        };
        break;

      case PLAYING:
        remaining = state.gameplay.remaining - 1;
        state = {
          ...state,
          frame: state.frame + 1,
          gameplay: {
            ...state.gameplay,
            state: state.players.some(p => !p.ready) ? WAITING_FOR_READY :
                      remaining == 0 ? ROUND_FINISHED : PLAYING,
            remaining: remaining || 5 * framesPerSecond,
            winning: winningTeams(state.teams, state.boids)
          },
          players: state.players.map(player => updatePlayer(player)),
          boids: updateBoids(state.boids, { players: state.players })
                    .concat(newBoids(state.frame, state.randomBoids))
        };
        break;

      case ROUND_FINISHED:
        remaining = state.gameplay.remaining - 1;
        state = {
          ...state,
          frame: state.frame + 1,
          gameplay: {
            ...state.gameplay,
            state: remaining == 0 ? RESET : ROUND_FINISHED,
            remaining: remaining
          }
        };
        break;

      case RESET:
        const random = new Random(state.seed + state.frame);
        state = {
          ...state,
          frame: state.frame + 1,
          gameplay: {
            ...state.gameplay,
            state: PLAYING,
            remaining: gameDuration * framesPerSecond
          },
          players: state.players.map(player => ({
            ...player,
            position: teams[player.teamId].position
          })),
          boids: [
            ...teams.flatMap(team =>
              createBoidSwarm({
                center: team.position,
                count: team.boidCount,
                teamId: team.id,
                random
              })
            ),
          ],
          randomBoids: [
            ...randomBoids(state.frame, 10, gameDuration * framesPerSecond, random)
          ]
        }
        break;
    }

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

function createBoidSwarm({ center, count, teamId, random }) {
  const boids = [];
  for (let index = 0; index < count; index++) {
    let movement;
    if ( center ) {
      movement = boidsInACircle(index, count, center);
    } else {
      movement = boidsAllOverThePlace(random);
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

function boidsAllOverThePlace(random) {
  return {
    position: createV(random.nextInt(10, 1014), random.nextInt(10, 1014)),
    velocity: multiplyV(random.nextNormalizedVector(), random.nextFloat(0, 3))
  }
}

function newBoids(frame, randomBoids) {
  return randomBoids.filter(b => b.frame == frame);
}

function randomBoids(frame, numberOfBoids, frames, random) {
  const boids = [];
  for ( let i = 0; i < numberOfBoids; i++ ) {
    boids.push({
      frame: random.nextInt(frame, frame + frames),
      position: teams[random.nextInt(0,1)].position,
      velocity: multiplyV(random.nextNormalizedVector(), random.nextFloat(0, 3)),
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

  let newBoids = boids.map((boid) => updateBoid(boid, teamsObj[boid.teamId]));

  // ! Mutating function.
  setTeamsOfBoids(newBoids, players);

  return newBoids;
}

function setTeamsOfBoids(boids, players) {
  const teamIds = teams.map(team => team.id);
  const teamsObj = teamIds.map(teamId => ({
    boids: boids.filter(boid => boid.teamId === teamId),
    allies: players.filter(player => player.teamId === teamId),
  }));
  const { winner, loser } = duel(teamsObj);
  takeOverNearestBoid(winner, loser);
  takeOverNearestBoid(teamsObj[0], teamsObj[2]);
  takeOverNearestBoid(teamsObj[1], teamsObj[2]);
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
  const xCoords = team.boids.map(b => b.position.x).concat(team.allies.map(a => a.position.x));
  const yCoords = team.boids.map(b => b.position.y).concat(team.allies.map(a => a.position.y));
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
  if (winner.boids.length == 0 && winner.allies.length == 0) return;
  const winnerTeam = (winner.boids[0] || winner.allies[0]).teamId
  const center = teamCenter(winner);
  for (const boid of loser.boids) {
    const distance = distanceV(boid.position, center);
    if (distance >= takeOverDistance) {
      continue;
    }
    boid.teamId = winnerTeam;
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

function createPlayer({ id, teamId = null, name }) {
  const team = teams[teamId];
  const position = team.position;
  const velocity = zeroV;
  return {
    id: id,
    position,
    velocity,
    input: {},
    teamId,
    ready: false,
    name
  };
}

function handlePlayerEvent(players, event) {
  switch (event.type) {
    case "connect":
      return [...players, createPlayer({
        id: event.clientid,
        teamId: event.teamId || smallestTeam(players),
        name: event.clientName
      })];
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

function smallestTeam(players) {
  const team0 = players.filter(p => p.teamId === 0).length;
  const team1 = players.filter(p => p.teamId === 1).length;
  return team0 > team1 ? 1 : 0;
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

function alea(s0, s1, c) {
  return function aleaStep() {
    var t = 2091639 * s0 + c * 2.3283064365386963e-10;
    s0 = s1;
    return s1 = t - (c = t | 0);
  };
}

function aleaFromSeed(seed) {
  var s0, s1, h, n = 0xefc8249d, v;
  seed = 'X' + seed;
  for (var i = 0; i < 2; i++) {
    for (var j = 0; j < seed.length; j++) {
      n += seed.charCodeAt(j);
      h = 0.02519603282416938 * n;
      n = h >>> 0; h -= n; h *= n;
      n = h >>> 0; h -= n; n += h * 0x100000000;
    }
    v = (n >>> 0) * 2.3283064365386963e-10;
    if (i === 0) s0 = v; else s1 = v;
  }
  return alea(s0, s1, 1);
}

class Random {
  constructor(seed) {
    this.aleaStep = aleaFromSeed(seed);
  }

  /**
   * Return new pseudo-random value between 0 and 1
  */
  next() {
    return this.aleaStep();
  }

  nextInt(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  nextFloat(min = 0, max = 1) {
    return min + this.next() * (max - min);
  }

  nextNormalizedVector() {
    const angle = this.nextFloat(0, Math.PI * 2);
    return createV(
      Math.cos(angle),
      Math.sin(angle)
    )
  }
}

module.exports = {
  BeeGame,
};
