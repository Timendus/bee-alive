const express    = require('express');
const app        = express();
const server     = require('http').Server(app);
const io         = require('socket.io')(server);
const session    = require('express-session');
const bodyParser = require('body-parser');
const eventAPI   = require('./events-api');
const config     = require('../package.json').configuration;

if ( config.server.verbose )
  console.log(`Starting server at port ${config.server.port}`);

// Request logging middleware
app.use((req, res, next) => {
  if ( !config.server.verbose ) return next();
  const client = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`Received ${req.method} request for ${req.url} from ${client}`);
  next();
});

// Actually listen to stuff
app.use(express.static('public')); // Statically host files in ./public
eventAPI(io);                      // Mount events API using socket.io
  // Traditional REST APIs can go here too,
  // but I don't think we'll need them.

// Start server
server.listen(config.server.port, () =>
  console.log(`Server is listening on port ${config.server.port}`));
