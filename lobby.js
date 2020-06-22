const uuid = require('uuid').v1;
const _ = require('underscore');
const { TeamFlags } = require('./common.js');

module.exports = class Lobby {
	constructor({ io, host, createGame, closeLobby })
	{
		// super();
		this.io = io.of('/lobby');
		this.id = uuid();
		this.name = 'unnamed';
		this.status = 'PENDING';

		this.players = [];
		this.playerLimits = {
			min: 1,
			max: 2
		};
		// deprecated
		this.maxPlayers = this.playerLimits.max;
		this.host = host;

		this.teamFlags = TeamFlags.None;
		this.teams = [];

		this.countdown = 0;
		this.timeout = null;
		// this.gameId = undefined;
		this.callbacks = {
			createGame: createGame,
			closeLobby: closeLobby
		};
	}

	isEmpty()
	{
		return this.players.length === 0 || this.players.every(p => p.artifical);
	}

	isFull()
	{
		return this.playerLimits.max !== null && (this.players.length === this.playerLimits.max);
	}

	close()
	{
		this.players.forEach(p => {
			p.io.leave(this.id);
		});
		this.players = [];
		this.status = 'CLOSED';
		this.playerLimits.max = 0;
	}

	handleJoin(player)
	{
		// this.broadcast('lobby:player:joined', player.serialize());

		// join the socket room
		player.io.join(this.id);

		if ((this.teamFlags & TeamFlags.Required) === TeamFlags.Required)
		{
			const definedTeams = _.isEmpty(this.teams) === false;
			console.assert(definedTeams, `Lobby: Player teams must be defined for 'Required' team play`);
			if (definedTeams)
			{
				// Place the new player into the first available team
				const availableTeam = this.teams.find(t => {
					let ok = false;

					// If the team has no max players
					if (t.maxPlayers === null)
					{
						ok = true;
					}
					else
					{
						const members = this.players.filter(p => {
							return p.team === t.id;
						});

						ok = members.length < t.maxPlayers;
					}

					return ok;
				});

				if (availableTeam)
				{
					console.log(`Lobby: Player ${player.id} has jointed team ${availableTeam.id}`);
					player.team = availableTeam.id;
				}
				else
				{
					console.error(`Lobby: Failed to find free team for player ${player.id}`);
				}
			}
		}

		this.players.push(player);

		this.broadcast('lobby:update', this.serialize());
		console.log(`Lobby: Player ${player.id} joined lobby ${this.id}`);
	}

	handleLeave(playerId)
	{
		const index = this.players.findIndex(p => p.id === playerId);
		if (index !== -1)
		{
			const player = this.players[index];
			player.io.leave(this.id);

			this.players.splice(index, 1);
			this.broadcast('lobby:player:left', player.serialize());
			console.log(`Lobby: Player ${player.id} left lobby ${this.id}`);

			if (this.players.length <= 1)
			{
				this.players.forEach(p => {
					p.ready = false;
					this.broadcast('lobby:player:update', p.serialize());
				});
			}
		}

		if (this.isEmpty())
		{
			this.status = 'CLOSING';
			this.callbacks.closeLobby();
		}
	}

	kickPlayer(playerId)
	{
		this.handleLeave(playerId);
	}

	changeTeam(playerId, teamId)
	{
		console.log(`Lobby: changeTeam ${playerId}, ${teamId}`);
		const player = this.players.find(p => p.id === playerId);
		const team = this.teams.find(t => t.id === teamId);

		if (_.isEmpty(this.teams))
		{
			console.error(`Lobby: Lobby has no defined teams`);
		}
		else if (!player)
		{
			console.error(`Lobby: Player ${playerId} does not exist`);
		}
		else if (!team)
		{
			console.error(`Lobby: Selected team ${teamId} does not exist`);
		}
		else
		{
			// If the team can only have one player, assume swapping teams
			if (team.maxPlayers === 1)
			{
				const otherTeamPlayer = this.players.find(p => p.team === team.id);
				if (otherTeamPlayer)
				{
					otherTeamPlayer.team = player.team;
					console.log(`Lobby: Player ${otherTeamPlayer.id} has joined team ${player.team}`);
				}

				player.team = team.id;
				console.log(`Lobby: Player ${player.id} has joined team ${team.id}`);
			}
			else
			{
				// FIX ME - implement maxPlayers properly
				player.team = team.id;
				console.log(`Lobby: Player ${player.id} has joined team ${team.id}`);
			}

			this.broadcast('lobby:update', this.serialize());
		}
	}

	toggleReady(playerId)
	{
		const haveReadyPlayers = () => {
			return this.players.length >= this.playerLimits.min && this.players.every(p => p.ready);
		};

		const index = this.players.findIndex(p => p.id === playerId);
		if (index !== -1)
		{
			const player = this.players[index];

			player.ready = !player.ready;
			console.log(`Lobby: Player ${player.id} is ${!player.ready ? 'not ' : ''}ready`)
			this.broadcast('lobby:player:update', player.serialize());
		}

		if (haveReadyPlayers())
		{
			console.log("Lobby: All players are ready");
			this.status = 'STARTING';
			this.beginCountdown(() => {
				return (haveReadyPlayers())
			}).then(() => {
				if (haveReadyPlayers())
				{
					this.status = 'READY';
					const game = this.callbacks.createGame({ lobby: this });
					if (game)
					{
						this.broadcast('lobby:game', { id: game.id });
						this.callbacks.closeLobby();
					}
					else
					{
						console.error("Lobby: Failed to create game");
					}
				}
				else
				{
					this.status = 'PENDING';
					this.broadcast('lobby:update', this.serialize());
				}
			});
		}
		else
		{
			this.status = 'PENDING';
			this.countdown = 0;
			if (this.timeout)
			{
				clearTimeout(this.timeout);
			}

			this.broadcast('lobby:update', this.serialize());
		}
	}

	beginCountdown(check)
	{
		let time = Date.now();

		const DURATION = 3000;

		this.countdown = DURATION;
		const promise = new Promise((resolve, reject) => {
			const tick = () => {
				this.countdown = (DURATION - (Date.now() - time));

				if (this.countdown < 0)
				{
					this.countdown = 0;
					resolve();
				}
				else if (check())
				{
					setTimeout(tick, 250);
				}
				else
				{
					this.status = 'PENDING';
				}

				this.broadcast('lobby:update', this.serialize());
			}

			tick();
		});

		return promise;
	}

	broadcast(name, data)
	{
		this.io.to(this.id).emit(name, data);
	}

	serialize()
	{
		return {
			id: this.id,
			name: this.name,
			players: this.players.map((p) => p.serialize()),
			playerLimits: this.playerLimits,
			host: this.host,
			status: this.status,
			countdown: this.countdown
		};
	}
}
