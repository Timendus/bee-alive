const Textures = require('./textures');

const WAITING_FOR_READY = 0;
const PLAYING = 1;
const ROUND_FINISHED = 2;

module.exports = frame => {
  drawBackground(frame);

  if ( frame.state.gameplay.state == ROUND_FINISHED )
    return drawFinishedState(frame, frame.state.gameplay.winning, frame.state.boids);

  drawRemainingTime(frame, frame.state.gameplay.remaining);
  drawHives(frame, frame.state.teams);
  drawBoids(frame, frame.state.boids);
  drawPlayers(frame, frame.state.players);

  if ( frame.state.gameplay.state == WAITING_FOR_READY )
    drawInstruction(frame);
}

function drawBackground(frame) {
  frame.ctx.drawImage(Textures.background, 0, 0, 1024 * frame.scale, 1024 * frame.scale);
}

function drawFinishedState(frame, winning, boids) {
  // Really ugly, but compact ;)
  const winningText = winning.length > 1 ? "It's a Tie!" :
    winning[0].id == 0 ? "The Blue Team Won!" :
                         "The Purple Team Won!";

  const teamAscore = boids.filter(b => b.teamId == 0).length;
  const teamBscore = boids.filter(b => b.teamId == 1).length;
  const scoreText = teamAscore > teamBscore ? `With ${teamAscore} against ${teamBscore} bees` :
                                              `With ${teamBscore} against ${teamAscore} bees`

  frame.ctx.textAlign = 'center';
  frame.ctx.font = '48px Indie Flower';
  frame.ctx.fillText(winningText, 512 * frame.scale, 430 * frame.scale);
  frame.ctx.font = '30px Indie Flower';
  frame.ctx.fillText(scoreText, 512 * frame.scale, 490 * frame.scale);
  const time = new Date((frame.state.gameplay.remaining + 30) * 1000 / 30).toISOString().substr(18, 1);
  frame.ctx.fillText(`New round in ${time}`, 512 * frame.scale, 540 * frame.scale);
}

function drawInstruction(frame) {
  frame.ctx.textAlign = 'center';
  frame.ctx.font = '48px Indie Flower';
  frame.ctx.fillText("Press R when you're ready!", 512 * frame.scale, 380 * frame.scale);
  frame.ctx.font = '30px Indie Flower';
  frame.ctx.fillText("Use the WSAD keys to move around", 512 * frame.scale, 460 * frame.scale);
  frame.ctx.fillText("and claim all the worker bees!", 512 * frame.scale, 520 * frame.scale);

  let ycoord = 600;
  frame.state.players.forEach(player => {
    frame.ctx.fillText(`${player.name}: ${player.ready ? 'Ready!' : 'Not ready'}`, 512 * frame.scale, ycoord * frame.scale);
    ycoord += 50;
  });
}

function drawRemainingTime(frame, remaining) {
  frame.ctx.textAlign = 'center';
  frame.ctx.font = '48px Indie Flower';
  const time = new Date((remaining + 30) * 1000 / 30).toISOString().substr(17, 2);
  frame.ctx.fillText(time, 512 * frame.scale, 50 * frame.scale);
}

function drawHives(frame, teams) {
  const hiveSize = Math.max(10, 100 * frame.scale);
  for (const team of teams) {
    if ( !Textures.teams[team.id].hive ) continue;
    frame.ctx.drawImage(Textures.teams[team.id].hive, team.position.x * frame.scale - hiveSize / 2, team.position.y * frame.scale - hiveSize / 2, hiveSize, hiveSize);
  }
}

function drawBoids(frame, boids) {
  const boidSize = Math.max(5, 35 * frame.scale);
  for (const boid of boids) {
    // here come dat boid
    frame.ctx.drawImage(Textures.teams[boid.teamId].boid, boid.position.x * frame.scale - boidSize / 2, boid.position.y * frame.scale - boidSize / 2, boidSize, boidSize);
  }
}

function drawPlayers(frame, players) {
  const playerSize = Math.max(10, 70 * frame.scale);
  for (const player of players) {
    const angle = Math.atan2(player.velocity.x, -player.velocity.y);
    const x = player.position.x * frame.scale;
    const y = player.position.y * frame.scale;
    frame.ctx.save();
    frame.ctx.translate(x, y);
    frame.ctx.rotate(angle);
    frame.ctx.translate(-x, -y);
    frame.ctx.drawImage(Textures.teams[player.teamId].player, x - playerSize / 2, y - playerSize / 2, playerSize, playerSize);
    frame.ctx.restore();
  }
}
