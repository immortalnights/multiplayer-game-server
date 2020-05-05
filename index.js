const Server = require('./server');
const Game = require('./game');

const s = new Server({ createGame: (options) => { return new Game(options); } });
s.start(process.env.port || 3001);
