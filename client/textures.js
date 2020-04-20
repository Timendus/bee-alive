const team0 = {
  player: new Image(),
  boid: new Image(),
  hive : new Image()
}
team0.player.src = 'images/team1_bee.png';
team0.boid.src = 'images/team1_boid.png';
team0.hive.src = 'images/team1_hive.png';

const team1 = {
  player: new Image(),
  boid: new Image(),
  hive : new Image()
}
team1.player.src = 'images/team2_bee.png';
team1.boid.src = 'images/team2_boid.png';
team1.hive.src = 'images/team2_hive.png';

const shared = {
  background: new Image()
};
shared.background.src = 'images/background.png';

module.exports = {
  team0,
  team1,
  shared
};
