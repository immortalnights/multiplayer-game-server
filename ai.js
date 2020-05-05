const Player = require('./player');

class AIEventIO
{
	on()
	{
		// Handle game event
		console.debug("Lobby:AISocket:on");
	}

	emit()
	{
		// Send game event
		console.debug("Lobby:AISocket:emit");
	}

	join()
	{
		// No-op for AI players
		console.debug("Lobby:AISocket:join");
	}

	leave()
	{
		// No-op for AI players
		console.debug("Lobby:AISocket:leave");
	}
};


module.exports = class AI extends Player {
	constructor(details)
	{
		super({ ...details, io: null });
		this.io = new AIEventIO();
		this.artifical = true
		this.ready = true;
	}

	serialize()
	{
		const data = super.serialize();
		data.artifical = this.artifical;
		return data;
	}
}