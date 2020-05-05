const _ = require('underscore');
const Vector2D = require('./vector2d');

class Grid
{
	constructor(options)
	{
		if (options instanceof Array)
		{
			// console.debug("Import", options);
			this.data = options.map(r => r.map(c => c ? c : ''));
			this.width = this.data[0].length;
			this.height = this.data.length;
		}
		else if (options.length === 9)
		{
			// console.debug("Import", options);
			const parts = options.split('').map(c => c !== ' ' ? c : '');
			this.data = [parts.slice(0, 3), parts.slice(3, 6), parts.slice(6, 9)];
			this.width = this.data[0].length;
			this.height = this.data.length;
		}
		else
		{
			if (options instanceof Object)
			{
				this.width = options.x || options.width;
				this.height = options.y || options.height;
			}
			else
			{
				this.width = arguments[0];
				this.height = arguments[1];
			}

			this.data = this.initializeCells(this.width, this.height);
		}

		this.center = { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };
		this.corners = [
			{ x: 0, y: 0 },
			{ x: this.width - 1, y: 0 },
			{ x: 0, y: this.height - 1 },
			{ x: this.width - 1, y: this.height - 1 },
		];
		this.directions = [
			// { x: -0, y: -1 },
			{ x: +1, y: -1 },
			{ x: +1, y: -0 },
			{ x: +1, y: +1 },
			{ x: -0, y: +1 }
			// { x: -1, y: +1 },
			// { x: -1, y: -0 },
			// { x: -1, y: -1 }
		];
	}

	initializeCells(width, height)
	{
		const data = [];

		// build the grid
		for (let y = 0; y < height; y++)
		{
			const row = []
			for (let x = 0; x < width; x++)
			{
				row.push('');
			}

			data.push(row);
		}

		return data;
	}

	toArray()
	{
		const values = [];
		for (let y = 0; y < this.data.length; y++)
		{
			for (let x = 0; x < this.data[0].length; x++)
			{
				values.push(this.data[y][x]);
			}
		}

		return values;
	}

	serialize()
	{
		const values = [];
		for (let y = 0; y < this.height; y++)
		{
			for (let x = 0; x < this.width; x++)
			{
				values.push(this.at({ x, y }) || ' ');
			}
		}

		return values.join('');
	}

	toCell(location)
	{
		return (location.x + location.y * this.height);
	}

	toLocation(cell)
	{
		return new Vector2D(cell % this.height, Math.floor(cell / this.height));
	}

	isValid(location)
	{
		return location && (location.x >= 0 && location.x < this.width && location.y >= 0 && location.y < this.height);
	}

	isEqual(other, options={})
	{
		console.assert(other instanceof Grid, "Unexpected value for `other`");

		// console.debug("This");
		this.display();
		// console.debug("Other");
		other.display();

		const isEqual = (a, b) => {
			if (a.length !== b.length)
			{
				console.debug("Different row count");
			}
			else
			{
				return a.every((r, ri) => {
					if (r.length !== b[ri].length)
					{
						console.debug("Different column count on row", ri);
					}
					else
					{
						return r.every((c, ci) => {
							const bc = b[ri][ci];
							// console.debug(ci, ri, c, bc, options.normalize, !!c, !!bc);
							return options.normalize ? !!c === !!bc : c === bc;
						});
					}
				});
			}
		};

		let equal = isEqual(this.data, other.data);

		if (options.rotate)
		{
			let rotation;
			for (rotation = 0; rotation < 4 && equal === false; rotation++)
			{
				console.debug("Rotating");
				this.rotate(90);
				equal = isEqual(this.data, other.data);
			}
		}

		// let equal = _.isEqual(this.data, other.data);

		// if (!equal)
		// {
		// 	if (options.normalize)
		// 	{
		// 		const a = new Grid(this.data.map(r => r.map(c => c ? 1 : 0)));
		// 		const b = new Grid(other.data.map(r => r.map(c => c ? 1 : 0)));
		// 		equal = a.isEqual(b, _.omit(options, 'normalize'));
		// 	}
		// 	else if (options.rotate)
		// 	{
		// 		equal = this.isEqual(other);

		// 		let rotation;
		// 		for (rotation = 0; rotation < 4 && equal === false; rotation++)
		// 		{
		// 			this.rotate(90);
		// 			equal = this.isEqual(other);
		// 		}
		// 	}
		// }

		return equal;
	}

	reset()
	{
		this.data = this.initializeCells(this.width, this.height);
	}

	clone()
	{
		const c = new Grid(this.width, this.height);
		c.data = this.data.map(row => [ ...row ]);
		return c;
	}

	rotate(degrees=90)
	{
		const valid = (degrees > 0 && degrees % 90) === 0;
		console.assert(valid, "Can only rotate by 90 degree increments");

		if (valid)
		{
			while (degrees > 0)
			{
				// Rotate...
				// this.data = Grid.rotate(this.data);
				const clone = this.clone();

				clone.data[0][0] = this.data[2][0];
				clone.data[0][1] = this.data[1][0];
				clone.data[0][2] = this.data[0][0];

				clone.data[1][0] = this.data[2][1];
				clone.data[1][1] = this.data[1][1];
				clone.data[1][2] = this.data[0][1];

				clone.data[2][0] = this.data[2][2];
				clone.data[2][1] = this.data[1][2];
				clone.data[2][2] = this.data[0][2];

				this.data = clone.data;

				degrees = degrees - 90;
			}
		}
	}

	inverse()
	{
		this.data = this.data.map(r => r.map(c => !!c ? 0 : 1));
	}

	display(log)
	{
		let str = '\n';
		for (let y = 0; y < this.data.length; y++)
		{
			const row = [];
			for (let x = 0; x < this.data[0].length; x++)
			{
				row.push(this.data[y][x] || ' ');
			}

			str += ' ' + row.join(' | ') + ((y < this.data.length - 1) ? '\n' : '');
		}

		if (log === undefined ? true : log)
		{
			console.log(str);
		}

		return str;
	}

	place(location, token)
	{
		return this.set(location, token, false);
	}

	set(location, value, options={})
	{
		console.assert(arguments.length >= 2, "Must provide two arguments, location and token");
		console.assert(_.isNumber(location.x) && _.isNumber(location.y), "location argument must have numeric x and y attributes");
		console.assert(value !== undefined && value !== null, "Token must be a value");

		let ok = false;
		if (this.at(location) === '' || options.overwrite)
		{
			this.data[location.y][location.x] = value;
			ok = true;
		}
		else
		{
			this.display(true);
			console.error(`Cannot overwrite value at (${location.x}, ${location.y})`);
		}

		return ok;
	}

	at(location)
	{
		return this.isValid(location) ? this.data[location.y][location.x] : undefined;
	}

	freeCount()
	{
		let free = 0;
		for (let y = 0; y < this.height; y++)
		{
			for (let x = 0; x < this.width; x++)
			{
				if (this.at({ x, y }) === '')
				{
					++free;
				}
			}
		}

		return free;
	}

	// 
	move(location, direction)
	{
		const nextLocation = { x: location.x + direction.x, y: location.y + direction.y };
		return nextLocation;
	}

	findRotation(matrix)
	{

	}

	paths(length)
	{
		length = length || Math.min(this.width, this.height);

		const paths = [];
		for (let y = 0; y < this.height; y++)
		{
			for (let x = 0; x < this.width; x++)
			{
				this.directions.forEach(direction => {
					// console.log("start", x, y, "direction", direction);
					const start = new Vector2D({ x, y });
					let location = start.clone();
					let tokens = {};
					let cont = true;
					// let end;
					let path = [];

					do
					{
						const tokenAtLocation = this.at(location);

						if (tokenAtLocation)
						{
							if (tokens[tokenAtLocation])
							{
								tokens[tokenAtLocation] += 1;
							}
							else
							{
								tokens[tokenAtLocation]  = 1;
							}
						}

						path.push({ location: location.clone(), token: tokenAtLocation });
						location = location.add(direction);
					} while (this.isValid(location) && path.length < length);

					// isValid(end)
					if (path.length === length && path.every(item => (item.token === '')) === false)
					{
						paths.push(path);
					}
				});
			}
		}

		return paths;
	}

	pathLength(start, direction, match)
	{
		const check = (location) => {
			let ok = false;
			if (this.isValid(location))
			{
				ok = match ? (this.at(location) === match) : (this.at(location) !== undefined);
			}

			return ok;
		};

		let location = Vector2D.make(start);
		direction = direction instanceof Vector2D ? direction : Vector2D.make(direction);
		let size = 0;
		while (check(location))
		{
			size++;

			location = location.add(direction);
		}

		return size;
	}
};

Grid.findRotation = (a, b) => {
	// console.log("findRotation");
	// Grid.prettyPrint(a, true);
	// Grid.prettyPrint(b, true);

	let match = _.isEqual(a, b);
	let rotation;
	for (rotation = 0; rotation < 4 && match === false; rotation++)
	{
		b = Grid.rotate(b);
		match = a.isEqual(b);
	}

	// console.log(match, rotation);
	return match ? rotation : -1;
};

Grid.rotate = (matrix) => {
	const res = Grid.prototype.initializeCells(matrix[0].length, matrix.length);

	res[0][0] = matrix[2][0];
	res[0][1] = matrix[1][0];
	res[0][2] = matrix[0][0];

	res[1][0] = matrix[2][1];
	res[1][1] = matrix[1][1];
	res[1][2] = matrix[0][1];

	res[2][0] = matrix[2][2];
	res[2][1] = matrix[1][2];
	res[2][2] = matrix[0][2];

	return res;
}

Grid.flatten = (matrix) => {
	
}

Grid.prettyPrint = (matrix, log) => {
	
}

module.exports = Grid;