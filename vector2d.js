const _ = require('underscore');

module.exports = class Vector2D
{
	constructor(...args)
	{
		if (args.length === 1)
		{
			this.x = args[0].x;
			this.y = args[0].y;
		}
		else
		{
			this.x = Number(args[0]);
			this.y = Number(args[1]);
		}

		console.assert(_.isNaN(this.x) === false && _.isNumber(this.x), "Vector.x is not a number", this.x);
		console.assert(_.isNaN(this.y) === false && _.isNumber(this.y), "Vector.y is not a number", this.y);
	}

	//
	static make(...args)
	{
		const fromObject = (obj) => {
			const r = {};
			if (obj.x === undefined && obj.y === undefined)
			{
				r.x = Number(obj.w);
				r.y = Number(obj.h);
			}
			else
			{
				r.x = Number(obj.x);
				r.y = Number(obj.y);
			}

			return r;
		}

		let r = {};
		if (args.length === 1)
		{
			const item = args[0];
			if (item instanceof Vector2D)
			{
				r = item;
			}
			else if (item instanceof Array)
			{
				if (item[0] instanceof Object)
				{
					r = fromObject(item[0]);
				}
				else
				{
					r.x = Number(item[0]);
					r.y = Number(item[1]);
				}
			}
			else if (item instanceof Object)
			{
				r = fromObject(item);
			}
			else
			{
				console.error("Invalid arguments to make Vector2D", args);
			}
		}
		else
		{
			r.x = Number(args[0]);
			r.y = Number(args[1]);
		}

		// console.log(args, '=>', r);
		console.assert(_.isNaN(r.x) === false && _.isNumber(r.x), "Vector.x is not a number", r.x);
		console.assert(_.isNaN(r.y) === false && _.isNumber(r.y), "Vector.y is not a number", r.y);
		console.assert(Object.keys(r).length === 2, "Result has too many attributes", r);

		return new Vector2D(r);
	}

	toString()
	{
		return '(' + this.x + ',' + this.y + ')';
	}

	clone()
	{
		return new Vector2D({ x: this.x, y: this.y });
	}

	distance()
	{
		const other = Vector2D.make(...arguments);
		// const dist = Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
		// // console.log(this.x, this.y, '=>', other.x, other.y, '==', dist);
		// return Math.floor(dist);
		return Math.max(Math.abs(this.x - other.x), Math.abs(this.y - other.y));
	}

	equal()
	{
		const other = Vector2D.make(...arguments);
		return this.x === other.x && this.y === other.y;
	}

	add()
	{
		const other = Vector2D.make(...arguments);
		const { x, y } = this;
		this.x += other.x;
		this.y += other.y;

		// console.log(`${x}, ${y} ++> ${this.x}, ${this.y}`);
		return this;
	}
}