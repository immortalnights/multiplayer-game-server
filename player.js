const uuid = require('uuid').v1;

module.exports = class Player {
	constructor(options)
	{
		this.id = options.id;
		this.io = options.io;
		this.team = options.team;
		this.ready = false;
	}

	on(name, callback)
	{
		return this.io.on(name, callback);
	}

	send(name, data)
	{
		return this.io.emit(name, data);
	}

	serialize()
	{
		return {
			id: this.id,
			team: this.team,
			ready: this.ready
		};
	}
};