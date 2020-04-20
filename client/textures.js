module.exports = {
  teams: {

    // These are the player-controlled teams
    0: {
      player: image('images/team1_bee.png'),
      boid:   image('images/team1_boid.png'),
      hive:   image('images/team1_hive.png')
    },
    1: {
      player: image('images/team2_bee.png'),
      boid:   image('images/team2_boid.png'),
      hive:   image('images/team2_hive.png')
    },

    // These are the neutral boids
    2: {
      boid:   image('images/neutral_boid.png')
    }
  },

  background: image('images/background.png')
}

function image(url) {
  const img = new Image();
  img.src = url;
  return img;
}
