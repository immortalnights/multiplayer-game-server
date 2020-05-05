const Game = require('./game');

module.exports = class TurnBasedGame extends Game {
	constructor(options)
	{
		super(options);
		// index of which players turn it is
		this.turn = undefined;

		console.log(`TurnBasedGame ${this.id} initialized`);
	}

	begin()
	{
		super.begin();
	}

	end()
	{
		super.end();
		this.turn = undefined;
	}

	whichPlayer()
	{
		return this.players[this.turn];
	}

	nextTurn()
	{
		let currentTurn = this.turn;

		if (this.status === 'PLAYING')
		{
			console.log("current player turn", currentTurn)

			if (currentTurn === undefined)
			{
				currentTurn = 0;
				console.debug("new player turn", currentTurn);
			}
			else
			{
				console.debug(currentTurn, this.players.length);

				++currentTurn;
				if (currentTurn >= this.players.length)
				{
					currentTurn = 0;
				}

				console.debug("new player turn", currentTurn);
			}

			this.turn = currentTurn;
			console.log(`It is now player ${this.whichPlayer().id} turn`)
		}

		return currentTurn;
	}

	serialize()
	{
		const data = super.serialize();
		if (this.turn !== undefined)
		{
			data.turn = this.whichPlayer().id;
		}
		return data;
	}
}
