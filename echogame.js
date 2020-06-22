const Game = require('./game');

module.exports = class EchoGame extends Game {
	onPlayerJoined(player)
	{
		console.log(`onPlayerJoined ${player.id}`);
	}

	begin()
	{
		console.log(`begin`);
		super.begin();
	}
};
