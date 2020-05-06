const _ = require('underscore');

module.exports = {
	findWinningPaths: (paths, token) => {
		const winningPaths = paths.filter(p => {
			const tokens = _.compact(_.pluck(p, 'token'));
			return tokens.length === p.length - 1 && tokens.every(t => t === token);
		});

		// console.debug("Winning Paths")
		// console.debug(pathArrayToString(winningPaths));
		return winningPaths;
	},

	findBlockingPaths: (paths, token) => {
		const blockingPaths = paths.filter(p => {
			const tokens = _.compact(_.pluck(p, 'token'));
			return tokens.length === p.length - 1 && tokens.every(t => t !== token);
		});

		// console.debug("Blocking Paths")
		// console.debug(pathArrayToString(blockingPaths));
		return blockingPaths;
	}
};