const team0 = {
  player: new Image(),
  boid: new Image()
}
team0.player.src = 'images/team1_bee.png';
team0.boid.src = 'images/team1_boid.png';

const team1 = {
  player: new Image(),
  boid: new Image()
}
team1.player.src = 'images/team2_bee.png';
team1.boid.src = 'images/team2_boid.png';

module.exports = {
  team0,
  team1
};