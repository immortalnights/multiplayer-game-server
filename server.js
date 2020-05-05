const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const Player = require('./player');
const AI = require('./ai');
const Lobby = require('./lobby');
const uuid = require('uuid').v1;

const PRETTIFY_JSON_RESPONSES = true;

module.exports = class Server {
	constructor(options)
	{
		if (!options || options.createGame)
		{
			console.error("Missing createGame callback");
		}

		this.createLobby = (options && options.createLobby) ? options.createLobby : options => { console.warn("Using default Lobby"); return new Lobby(options) };
		this.createGame = (options && options.createGame) ? options.createGame : options => { console.error("Game has not been specified"); };
		this.lobbies = [];
		this.games = [];
	}

	start(port)
	{
		this.initializeExpresServer();
		this.initializeSocketServer();
		server.listen(port, () => { console.log(`Server running on localhost:${port}`); });
	}

	initializeExpresServer()
	{
		const sendJSONReply = function(res, json, status = 200) {
			if (PRETTIFY_JSON_RESPONSES)
			{
				res.setHeader('Content-Type', 'application/json');
				res.status(status).send(JSON.stringify(json, null, 4));
			}
			else
			{
				res.status(status).json(json);
			}
		}

		app.put('/api/register?', (req, res) => {
			sendJSONReply(res, { userId: uuid() });
		});

		app.get('/api/lobby/:id?', (req, res) => {
			const lobbyId = req.params.id;
			if (lobbyId)
			{
				const lobby = this.lobbies.find((l) => l.id === lobbyId);
				if (lobby)
				{
					sendJSONReply(res, lobby.serialize());
				}
				else
				{
					sendJSONReply(res, { error: `Lobby '${lobbyId}' not found`}, 404);
				}
			}
			else
			{
				sendJSONReply(res, this.lobbies.map(lobby => lobby.serialize()));
			}
		});

		app.post('/api/lobby', (req, res) => {
			const userId = req.get('X-USER-ID');
			if (!userId)
			{
				sendJSONReply(res, { message: "Missing user ID" }, 400);
			}
			else
			{
				res.setHeader('Content-Type', 'application/json');

				const createGame = ({ lobby }) => {
					console.assert(lobby);

					const options = { io, players: lobby.players.map(p => p), host: lobby.host, closeGame: () => {} }
					const game = this.createGame(options);
					if (game)
					{
						game.initializeAIPlayers(lobby.players);
						this.games.push(game);
					}
					return game;
				};

				const close = () => {
					const index = this.lobbies.findIndex(l => { return l.isEmpty(); });
					if (index !== -1)
					{
						let removed = this.lobbies.splice(index, 1);
						removed.forEach(l => { l.close(); });
					}
				};

				const lobby = this.createLobby({ io, host: userId, createGame, closeLobby: close });

				this.lobbies.push(lobby);

				res.send(JSON.stringify(lobby.serialize()));
			}
		});

		app.get('/api/Game/:id?', (req, res) => {
			const gameID = req.params.id;
			if (gameID)
			{
				const game = this.games.find((l) => l.id === gameID);
				if (game)
				{
					sendJSONReply(res, game.serialize());
				}
				else
				{
					sendJSONReply(res, { error: `Game '${gameID}' not found`}, 404);
				}
			}
			else
			{
				sendJSONReply(res, { error: "Invalid request" }, 400);
			}
		});
	}

	initializeSocketServer()
	{
		io.set('transports', ['websocket']);

		io.of('/lobby').use((socket, next) => {
			const userID = socket.handshake.query.user;
			const lobbyID = socket.handshake.query.lobby;
			const lobby = this.lobbies.find(l => l.id === lobbyID);

			if (!userID)
			{
				console.error(`Missing user ID`);
				next(new Error(`Missing user ID`));
			}
			else if (!lobby)
			{
				console.error(`Lobby ${lobbyID} does not exist`);
				next(new Error(`Lobby ${lobbyID} does not exist`));
			}
			else
			{
				console.log("join", lobby.status, lobby.isFull())
				if (lobby.status === 'PENDING' && lobby.isFull() === false)
				{
					console.log(`Lobby ${lobby.id} exists`);
					next();
				}
				else
				{
					console.error(`Cannot join lobby, incorrect state`, lobby.status);
					next(new Error(`Lobby ${lobbyID} is locked`));
				}
			}
		});

		io.of('/lobby').on('connection', (client) => {
			console.log(`client ${client.id} connected to lobby channel`);

			const userID = client.handshake.query.user;
			const lobbyID = client.handshake.query.lobby;
			const lobby = this.lobbies.find(l => l.id === lobbyID);

			if (lobby)
			{
				const player = new Player({ id: userID, io: client });
				// inform the player who they are
				player.send('lobby:registered', player.serialize());

				lobby.handleJoin(player);

				if (lobby.host === userID)
				{
					player.on('lobby:addAIOpponent', () => {
						if (lobby.host !== player.id)
						{
							console.error(`Player ${player.id} tried to add an AI player, but is not the host`);
						}
						else if (lobby.isFull())
						{
							console.error(`Cannot add AI player, lobby is full`);
						}
						else
						{
							const ai = new AI({ id: uuid() });
							lobby.handleJoin(ai);
						}
					});

					player.on('lobby:kickPlayer', ({ playerId }) => {
						lobby.kickPlayer(playerId);
					});

					player.on('lobby:selectTeam', ({ team, playerId }) => {
						lobby.changeTeam(playerId, team);
					});
				}
				player.on('lobby:toggleReady', () => {
					lobby.toggleReady(player.id);
				});

				player.on('error', (client) => {
					console.error("Client socket error!");
				});

				player.on('disconnect', () => {
					lobby.handleLeave(player.id);

					console.log(`client '${client.id}' disconnected from lobby channel`);
				});
			}
			else
			{
				throw new Error("Cannot connect to lobby");
			}
		});

		io.of('/lobby').on('error', (socket) => {
			console.error("Socket error!");
		});

		io.of('/game').use((socket, next) => {
			const userID = socket.handshake.query.user;
			const gameID = socket.handshake.query.game;
			const game = this.games.find(g => g.id === gameID);

			if (!userID)
			{
				console.error(`Missing user ID`);
				next(new Error(`Missing user ID`));
			}
			else if (!game)
			{
				console.error(`Game ${gameID} does not exist`);
				next(new Error(`Game ${gameID} does not exist`));
			}
			else if (!game.isAuthorized(userID))
			{
				console.error(`Player ${userID} is not authorized to join game ${gameID}`);
				next(new Error(`Player ${userID} is not authorized to join game ${gameID}`));
			}
			else
			{
				console.log(`Game ${game.id} exists`);
				next();
			}
		});

		io.of('/game').on('connection', (client) => {
			console.log(`client ${client.id} connected to game channel`);

			const userID = client.handshake.query.user;
			const gameID = client.handshake.query.game;
			const game = this.games.find(g => g.id === gameID);

			if (game)
			{
				const player = game.handleHumanJoin({ id: userID, io: client });

				player.on('error', (client) => {
					console.error("Client socket error!");
				});

				player.on('disconnect', () => {
					game.handleLeave(player.id);

					console.log(`client '${client.id}' disconnected from game channel`);
				});

				if (game.isReady())
				{
					setTimeout(() => {
						game.begin();
					});
				}
			}
			else
			{
				throw new Error("Cannot connect to game (not found)");
			}
		});

		io.of('/game').on('error', (socket) => {
			console.error("Socket error!");
		});
	}
}