const uuid = require('uuid').v1;
const _ = require('underscore');
const Player = require('./player');
const AI = require('./ai');

module.exports = class Game {
	constructor({ io, name, players, host, closeGame })
	{
		// super();
		this.io = io.of('/game');
		this.id = uuid();
		this.name = name;

		this.initHumanPlayer = options => new Player(options);
		this.initComputerPlayer = options => new AI(options);

		this.authorizedPlayers = players.map(p => _.omit(p, 'io'));
		this.players = [];
		this.maxPlayers = players.length;
		this.host = host;
		this.status = 'PENDING';
		this.callbacks = {
			closeGame: closeGame
		};

		console.log(`Game: ${this.id} initialized (${this.players.length})`);
	}

	initializeAIPlayers(players)
	{
		console.log(`Game: AI players are joining the game`);
		players.forEach(p => {
			let ok = false;
			if (p.artifical)
			{
				if (this.isAuthorized(p.id))
				{
					const ai = this.handleAIJoin(p);
					console.log(`Game: AI Player ${ai.id} has joined the game`);
					ok = true;
				}
				else
				{
					console.error(`Game: AI Player ${p.id} is not authorized`);
				}
			}
			else
			{
				console.debug(`Game: Waiting for player ${p.id} to join`);
			}

			return ok;
		});
		console.log(`Game: ${this.players.length} AI players have joined`);
	}

	isEmpty()
	{
		return this.players.length === 0;
	}

	isPlaying()
	{
		return this.status === 'PLAYING';
	}

	isAuthorized(playerId)
	{
		console.log(`Game: ${playerId}, ${this.players.length} / ${this.maxPlayers} [${_.pluck(this.authorizedPlayers, 'id')}]`);
		return (this.players.length < this.maxPlayers) && !!this.authorizedPlayers.find(auth => auth.id === playerId);
	}

	isReady()
	{
		let ready = false;
		if (this.authorizedPlayers.length === this.players.length)
		{
			console.log(`Game: All players have joined the game`);
			ready = true;
		}
		else
		{
			console.log(`Game: Waiting for ${this.authorizedPlayers.length - this.players.length} more player(s)`);
		}

		return ready;
	}

	// override to create game specialized player
	handleHumanJoin(details)
	{
		console.log(`Game: Human player ${details.id} is joining the game`);
		const auth = this.authorizedPlayers.find(auth => auth.id === details.id);
		console.assert(auth, `Game: Failed to find authorized player details for player ${details.id}`);
		_.extend(details, auth);

		const player = this.initHumanPlayer({ ...details, game: this });

		this.handleJoin(player);
		return player;
	}

	// override to create game specialized AI
	handleAIJoin(details)
	{
		console.log(`Game: AI player ${details.id} is joining the game`);
		const auth = this.authorizedPlayers.find(auth => auth.id === details.id);
		console.assert(auth, `Game: Failed to find authorized player details for player ${details.id}`);
		_.extend(details, auth);

		const player = this.initComputerPlayer({ ...details, game: this });
		this.handleJoin(player);
		return player;
	}

	handleJoin(player)
	{
		console.log(`Game: Player ${player.id} is joining the game`);
		console.assert(player instanceof Player, `Game: Invalid player class`);

		player.status = 'READY';
		this.broadcast('game:player:joined', player.serialize());

		// join the socket room
		player.io.join(this.id);
		this.players.push(player);

		if (this.onPlayerJoined)
		{
			this.onPlayerJoined(player);
		}

		player.send('game:update', this.serialize());

		console.log(`Game: Player ${player.id} joined game ${this.id}`);
	}

	begin()
	{
		this.status = 'PLAYING';
		this.broadcast('game:update', this.serialize());
	}

	end()
	{
		this.status = 'FINISHED';
	}

	handleLeave(playerId)
	{
		const index = this.players.findIndex(p => p.id === playerId);
		if (index !== -1)
		{
			const player = this.players[index];
			player.io.leave(this.id);

			this.players.splice(index, 1);
			this.broadcast('game:player:left', player.serialize());
			console.log(`Game: Player ${player.id} left game ${this.id}`);

			if (this.players.length <= 1)
			{
				this.players.forEach(p => {
					p.ready = false;
					this.broadcast('game:player:update', p.serialize());
				});
			}
		}

		if (this.isEmpty())
		{
			this.status = 'CLOSING';
			this.callbacks.closeGame();
		}
	}

	broadcast(name, data)
	{
		// Sends to all human players (shoud AI have a socket too?)
		this.io.to(this.id).emit(name, data);

		// AI players do not receive broadcast messages :(
		this.players.forEach(p => {
			if (p.artifical)
			{
				p.send(name, data);
			}
		})
	}

	serialize()
	{
		return {
			id: this.id,
			name: this.name,
			players: this.players.map((p) => p.serialize()),
			maxPlayers: this.maxPlayers,
			host: this.host,
			status: this.status
		};
	}
}