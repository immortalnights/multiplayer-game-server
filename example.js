const Server = require('./server');
const Game = require('./echogame');

const port = process.env.port || 3001;

console.log(`Starting example game server on port ${port}`);
const s = new Server({ createGame: (options) => { return new Game(options); } });
s.start(port);
