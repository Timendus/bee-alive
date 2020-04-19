const Textures = require('./textures');

module.exports = (progress, ctx, scale, simulator) => {
  const gameState = simulator.getCurrentState();
  const playerSize = Math.max(10, 70 * scale);
  const boidSize = Math.max(5, 35 * scale);

  ctx.drawImage(Textures.shared.background, 0, 0, 1024 * scale, 1024 * scale);

  ctx.font = '48px Indie Flower';
  ctx.textAlign = 'center';

  if ( gameState.finished ) {
    // Really ugly, but compact ;)
    const winningText = gameState.winning.length > 1 ? "It's a Tie!" :
      gameState.winning[0].id == 0 ? "The Blue Team Won!" :
                                     "The Purple Team Won!";

    // Draw game result to screen and quit
    ctx.fillText(winningText, 512 * scale, 450 * scale);
    ctx.font = '30px Indie Flower';
    ctx.fillText("Press ... some key? ... to play again!", 512 * scale, 520 * scale);
    return;
  }

  const time = new Date((gameState.remaining + 30) * 1000 / 30).toISOString().substr(17, 2);
  ctx.fillText(time, 512 * scale, 50 * scale);

  for (const team of gameState.teams) {
    ctx.drawImage(Textures[`team${team.id}`].hive, team.position.x * scale - playerSize / 2, team.position.y * scale - playerSize / 2, playerSize, playerSize);
  }

  for (const boid of gameState.boids) {
    // here come dat boid
    ctx.drawImage(Textures[`team${boid.teamId}`].boid, boid.position.x * scale - boidSize / 2, boid.position.y * scale - boidSize / 2, boidSize, boidSize);
  }

  for (const player of gameState.players) {
    const angle = Math.atan2(player.velocity.x, -player.velocity.y);
    const x = player.position.x * scale;
    const y = player.position.y * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(-x, -y);
    ctx.drawImage(Textures[`team${player.teamId}`].player, x - playerSize / 2, y - playerSize / 2, playerSize, playerSize);
    ctx.restore();
  }
}
