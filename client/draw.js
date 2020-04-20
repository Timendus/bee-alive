const Textures = require('./textures');

module.exports = frame => {
  drawBackground(frame);

  if ( frame.state.finished )
    return drawFinishedState(frame, frame.state.winning);

  drawRemainingTime(frame, frame.state.remaining);
  drawHives(frame, frame.state.teams);
  drawBoids(frame, frame.state.boids);
  drawPlayers(frame, frame.state.players);
}

function drawBackground(frame) {
  frame.ctx.drawImage(Textures.shared.background, 0, 0, 1024 * frame.scale, 1024 * frame.scale);
}

function drawFinishedState(frame, winning) {
  // Really ugly, but compact ;)
  const winningText = winning.length > 1 ? "It's a Tie!" :
    winning[0].id == 0 ? "The Blue Team Won!" :
                         "The Purple Team Won!";

  frame.ctx.textAlign = 'center';
  frame.ctx.font = '48px Indie Flower';
  frame.ctx.fillText(winningText, 512 * frame.scale, 450 * frame.scale);
  frame.ctx.font = '30px Indie Flower';
  frame.ctx.fillText("Press ... some key? ... to play again!", 512 * frame.scale, 520 * frame.scale);
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
    frame.ctx.drawImage(Textures[`team${team.id}`].hive, team.position.x * frame.scale - hiveSize / 2, team.position.y * frame.scale - hiveSize / 2, hiveSize, hiveSize);
  }
}

function drawBoids(frame, boids) {
  const boidSize = Math.max(5, 35 * frame.scale);
  for (const boid of boids) {
    // here come dat boid
    frame.ctx.drawImage(Textures[`team${boid.teamId}`].boid, boid.position.x * frame.scale - boidSize / 2, boid.position.y * frame.scale - boidSize / 2, boidSize, boidSize);
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
    frame.ctx.drawImage(Textures[`team${player.teamId}`].player, x - playerSize / 2, y - playerSize / 2, playerSize, playerSize);
    frame.ctx.restore();
  }
}
