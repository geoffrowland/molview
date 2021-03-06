/**
 * This file is part of MolView (http://molview.org)
 * Copyright (c) 2014, Herman Bergwerf
 *
 * MolView is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * MolView is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with MolView.  If not, see <http://www.gnu.org/licenses/>.
 */

var MP_BOND_SINGLE = 1;
var MP_BOND_DOUBLE = 2;
var MP_BOND_TRIPLE = 3;
var MP_BOND_WEDGEHASH = 4;

var MP_STEREO_NONE = 0;
var MP_STEREO_UP = 1;
var MP_STEREO_DOWN = 6;
var MP_STEREO_CIS_TRANS = 3;
var MP_STEREO_EITHER = 4;

function MPBond(obj)
{
	this.index = obj.i;
	this.type = obj.type || 0;
	this.stereo = obj.stereo || MP_STEREO_NONE;
	this.from = obj.from || 0;
	this.to = obj.to || 0;
	this.display = "normal";
}

/**
 * Data
 */

MPBond.prototype.getKetcherData = function(mp)
{
	return new chem.Struct.Bond({
		type: this.type,
		stereo: this.stereo,
		begin: this.from,
		end: this.to
	});
}

MPBond.prototype.getPlainData = function()
{
	return {
		i: this.index,
		type: this.type,
		stereo: this.stereo,
		from: this.from,
		to: this.to
	};
}

MPBond.prototype.getIndex = function() { return this.index; }
MPBond.prototype.setIndex = function(index) { this.index = index; }

MPBond.prototype.getType = function() { return this.type; }
MPBond.prototype.setType = function(type) { this.type = type; }

MPBond.prototype.getStereo = function() { return this.stereo; }
MPBond.prototype.setStereo = function(stereo) { this.stereo = stereo; }

MPBond.prototype.getFrom = function() { return this.from; }
MPBond.prototype.setFrom = function(from) { this.from = from; }

MPBond.prototype.getTo = function() { return this.to; }
MPBond.prototype.setTo = function(to) { this.to = to; }

MPBond.prototype.calculateBondVertices = function(mp, begin, type, which)
{
	if(this.bondVC[type] && this.bondVC[type][which])
	{
		return this.bondVC[type][which];
	}
	else
	{
		//TODO: finish bond vertices caching
		if(!this.bondVC[type]) this.bondVC[type] = {};
		this.bondVC[type][which] = mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, [0])
		return this.bondVC[type];
	}
}

/**
 * Sets display and returns wether the display has changed
 * @param  {String} state
 * @return {Boolean}
 */
MPBond.prototype.setDisplay = function(state)
{
	var changed = this.lastDisplay != state;
	this.lastDisplay = this.display = state;
	return changed;
}

/**
 * Resets display to normal in case this.handle is not reached by the
 * hoverHandler (in this case, the state is drawn as normal and in the
 * next hoverHandler cycle, this.lastDisplay will become normal)
 * Saves the old state in this.lastDisplay to check the state change in
 * this.setDisplay later
 */
MPBond.prototype.resetDisplay = function()
{
	this.lastDisplay = this.display;
	this.display = "normal";
}

MPBond.prototype.isPair = function(a, b, mp)
{
	var _a = mp.molecule.atoms[this.from].getElement();
	var _b = mp.molecule.atoms[this.to].getElement();
	return _a == a && _b == b || _a == b && _b == a;
}

MPBond.prototype.hasAtom = function(i)
{
	return this.from == i || this.to == i;
}

/**
* Event handlers
*/

MPBond.prototype.getHandler = function(mp)
{
	//TODO: fragment to bond tool
	//TODO: bond drag collapsing

	var scope = this;
	if(mp.tool.type == "bond")
	{
		return {
			onPointerDown: function(e)
			{
				//TODO: implement up to up bonds

				var changed = false;
				e.preventDefault();

				var fromVisible = this.molecule.atoms[scope.from].isVisible(this);
				var toVisible = this.molecule.atoms[scope.to].isVisible(this);

				if(this.tool.data.type)
				{
					changed = !(scope.type == MP_BOND_TRIPLE && this.tool.data.type == MP_BOND_TRIPLE);

					scope.type = this.tool.data.type == MP_BOND_TRIPLE ? MP_BOND_TRIPLE :
						(scope.type == MP_BOND_TRIPLE || scope.stereo != MP_STEREO_NONE) ? this.tool.data.type :
							scope.type == MP_BOND_SINGLE ? MP_BOND_DOUBLE : MP_BOND_SINGLE;
					scope.stereo = MP_STEREO_NONE;
				}
				else if(this.tool.data.stereo)
				{
					scope.type = MP_BOND_SINGLE;

					if(scope.stereo == this.tool.data.stereo)
					{
						var f = scope.from;
						scope.from = scope.to;
						scope.to = f;
					}
					else
					{
						scope.stereo = this.tool.data.stereo;
					}

					changed = true;
				}

				if(changed)
				{
					if(fromVisible != this.molecule.atoms[scope.from].isVisible(this))
					{
						this.molecule.atoms[scope.from].update(this);
						this.molecule.atoms[scope.from].updateBonds(this, scope);
					}
					if(toVisible != this.molecule.atoms[scope.to].isVisible(this))
					{
						this.molecule.atoms[scope.to].update(this);
						this.molecule.atoms[scope.to].updateBonds(this, scope);
					}

					scope.update(this);
					this.redraw();
				}
			},
			onPointerUp: function(e)
			{
				scope.setDisplay(e.type == "mouseup" ? "hover" : "normal");
				this.redraw();
			}
		};
	}
	else if(mp.tool.type == "erase")
	{
		return {
			onPointerDown: function(e)
			{
				e.preventDefault();
				this.removeBond(scope.getIndex());
				this.redraw(true);
			},
			onPointerUp: function(e)
			{
				this.setCursor("pointer");
				scope.setDisplay(e.type == "mouseup" ? "hover" : "normal");
				this.redraw();
			}
		};
	}
	else//drag, fallback
	{
		return {
			onPointerMove: function(e)
			{
				e.preventDefault();
				this.setCursor("move");
				var p = this.getRelativeCoords(getPointerCoords(e));
				var dx = p.x - this.pointer.oldr.x;
				var dy = p.y - this.pointer.oldr.y;

				this.molecule.atoms[scope.from].translate(dx, dy);
				this.molecule.atoms[scope.to].translate(dx, dy);
				this.molecule.atoms[scope.from].update(this);
				this.molecule.atoms[scope.to].update(this);
				this.molecule.atoms[scope.from].updateBonds(this, scope);
				this.molecule.atoms[scope.to].updateBonds(this, scope);
				scope.update(this);

				this.pointer.oldr.x = p.x;
				this.pointer.oldr.y = p.y;
				this.redraw();
			},
			onPointerUp: function(e)
			{
				this.setCursor("pointer");
				scope.setDisplay(e.type == "mouseup" ? "hover" : "normal");
				this.molecule.atoms[scope.from].setDisplay("normal");
				this.molecule.atoms[scope.to].setDisplay("normal");
				this.redraw();
			}
		};
	}
}

MPBond.prototype.handle = function(mp, point, type)
{
	var line = this.getCenterLine(mp);
	var r = mp.settings.bond.radius * mp.settings.bond.scale;

	if(fastPointInLineBox(point, line.from, line.to, r))
	{
		var d = pointToLineDistance(point, line.from, line.to);
		if(d <= r)
		{
			if(type == "active" && mp.tool.type == "drag")
			{
				mp.molecule.atoms[this.from].setDisplay("active");
				mp.molecule.atoms[this.to].setDisplay("active");
			}
			return { hit: true, redraw: this.setDisplay(type) };
		}
	}

	return { hit: false, redraw: this.setDisplay("normal") };
}

/**
 * Calculations
 */

MPBond.prototype.equals = function(bond)
{
	return bond.from == this.from && bond.to == this.to;
}

MPBond.prototype.update = function(mp)
{
	var scale = mp.settings.bond.scale;
	var line = this.getCenterLine(mp);

	this.cache = {};
	this.cache.line = {
		from: mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, [0]),
		to: mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from, [0])
	};

	if(mp.settings.bond.gradient.enabled)
	{
		var f = mp.molecule.atoms[this.from];
		var t = mp.molecule.atoms[this.to];

		if(this.stereo == MP_STEREO_UP || f.getElement() == t.getElement())
		{
			this.cache.gradient = JmolAtomColorsHashHex[f.getElement()];
		}
		else
		{
			this.cache.gradient = mp.ctx.createLinearGradient(f.getX(), f.getY(), t.getX(), t.getY());
			this.cache.gradient.addColorStop(mp.settings.bond.gradient.from, JmolAtomColorsHashHex[f.getElement()]);
			this.cache.gradient.addColorStop(mp.settings.bond.gradient.to, JmolAtomColorsHashHex[t.getElement()]);
		}
	}

	if(this.stereo == MP_STEREO_CIS_TRANS && this.type == MP_BOND_DOUBLE)
	{
		//TODO: connect one double CIS-TRANS bond to [0] endpoint
		var ends = multiplyAll(mp.settings.bond.delta[MP_BOND_DOUBLE], mp.settings.bond.deltaScale);
		this.cache.ctd = {
			from: mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, ends),
			to: mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from, ends)
		};
	}
	else if(this.stereo == MP_STEREO_UP)//wedge bond
	{
		this.cache.wedge = {
			far: mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, [0]),
			near: mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from,
					multiplyAll(mp.settings.bond.delta[MP_BOND_WEDGEHASH], mp.settings.bond.deltaScale))
		}
	}
	else if(this.stereo == MP_STEREO_DOWN)//hash bond
	{
		var far = mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, [0]);
		var near = mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from,
				multiplyAll(mp.settings.bond.delta[MP_BOND_WEDGEHASH], mp.settings.bond.deltaScale));

		var dx1 = near[0].x - far[0].x;
		var dy1 = near[0].y - far[0].y;
		var dx2 = near[1].x - far[0].x;
		var dy2 = near[1].y - far[0].y;
		var d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
		var w = mp.settings.bond.width * scale;
		var s = mp.settings.bond.hashLineSpace * scale;

		this.cache.hashLines = [];
		while(d1 - s - w > 0)
		{
			var mult = (d1 - s - w) / d1;
			d1 *= mult;
			dx1 *= mult; dy1 *= mult;
			dx2 *= mult; dy2 *= mult;

			this.cache.hashLines.push({
				from: { x: far[0].x + dx1, y: far[0].y + dy1 },
				to: { x: far[0].x + dx2, y: far[0].y + dy2 }
			});
		}
	}
	else if(this.type >= MP_BOND_DOUBLE && this.type <= MP_BOND_TRIPLE)
	{
		var ends = multiplyAll(mp.settings.bond.delta[this.type], mp.settings.bond.deltaScale);
		this.cache.bond = {
			from: mp.molecule.atoms[this.from].calculateBondVertices(mp, line.to, ends),
			to: mp.molecule.atoms[this.to].calculateBondVertices(mp, line.from, ends.reverse())
		};
	}
}

MPBond.prototype.getAngle = function(mp, from)
{
	if(mp.molecule.atoms[this.from].equals(from))
		return Math.atan2(
			from.getY() - mp.molecule.atoms[this.to].getY(),//y coords are flipped
			mp.molecule.atoms[this.to].getX() - from.getX());
	else
		return Math.atan2(
			from.getY() - mp.molecule.atoms[this.from].getY(),
			mp.molecule.atoms[this.from].getX() - from.getX());
}

MPBond.prototype.getCenterLine = function(mp)
{
	return {
		from: mp.molecule.atoms[this.from].getPosition(),
		to: mp.molecule.atoms[this.to].getPosition()
	};
}

/**
 * Render methods
 */

MPBond.prototype.drawStateColor = function(mp)
{
	if(this.display == "hover" || this.display == "active" || this.display == "selected")
	{
		mp.ctx.beginPath();

		var f = this.cache.line.from[0];
		var t = this.cache.line.to[0];
		if(mp.molecule.atoms[this.from].getDisplay() != "normal")
			f = mp.molecule.atoms[this.from].getPosition();
		if(mp.molecule.atoms[this.to].getDisplay() != "normal")
			t = mp.molecule.atoms[this.to].getPosition();

		mp.ctx.moveTo(f.x, f.y);
		mp.ctx.lineTo(t.x, t.y);

		mp.ctx.strokeStyle = mp.settings.bond[this.display].color;
		mp.ctx.stroke();
	}
}

MPBond.prototype.drawBond = function(mp)
{
	if(this.display == "hidden") return;

	var scale = mp.settings.bond.scale;
	var line = this.getCenterLine(mp);

	if(mp.settings.bond.gradient.enabled && !mp.settings.atom.miniLabel)
	{
		mp.ctx.strokeStyle = this.cache.gradient;
		if(this.stereo == MP_STEREO_UP) mp.ctx.fillStyle = this.cache.gradient;
	}

	if(this.stereo == MP_STEREO_CIS_TRANS && this.type == MP_BOND_DOUBLE)
	{
		mp.ctx.beginPath();
		mp.ctx.moveTo(this.cache.ctd.from[0].x, this.cache.ctd.from[0].y);
		mp.ctx.lineTo(this.cache.ctd.to[0].x, this.cache.ctd.to[0].y);
		mp.ctx.moveTo(this.cache.ctd.from[1].x, this.cache.ctd.from[1].y);
		mp.ctx.lineTo(this.cache.ctd.to[1].x, this.cache.ctd.to[1].y);
		mp.ctx.stroke();
	}
	else if(this.stereo == MP_STEREO_UP)//wedge bond
	{
		mp.ctx.beginPath();
		mp.ctx.moveTo(this.cache.wedge.far[0].x, this.cache.wedge.far[0].y);
		mp.ctx.lineTo(this.cache.wedge.near[0].x, this.cache.wedge.near[0].y);
		mp.ctx.lineTo(this.cache.wedge.near[1].x, this.cache.wedge.near[1].y);
		mp.ctx.closePath();
		mp.ctx.fill();
		mp.ctx.stroke();
	}
	else if(this.stereo == MP_STEREO_DOWN)//hash bond
	{
		mp.ctx.beginPath();
		for(var i = 0; i < this.cache.hashLines.length; i++)
		{
			mp.ctx.moveTo(this.cache.hashLines[i].from.x, this.cache.hashLines[i].from.y);
			mp.ctx.lineTo(this.cache.hashLines[i].to.x, this.cache.hashLines[i].to.y);
		}
		mp.ctx.stroke();
	}
	else if(this.type == MP_BOND_SINGLE)
	{
		mp.ctx.beginPath();
		mp.ctx.moveTo(this.cache.line.from[0].x, this.cache.line.from[0].y);
		mp.ctx.lineTo(this.cache.line.to[0].x, this.cache.line.to[0].y);
		mp.ctx.stroke();
	}
	else if(this.type > 0 && this.type <= MP_BOND_TRIPLE)
	{
		mp.ctx.beginPath();
		for(var i = 0; i < this.cache.bond.from.length; i++)
		{
			mp.ctx.moveTo(this.cache.bond.from[i].x, this.cache.bond.from[i].y);
			mp.ctx.lineTo(this.cache.bond.to[i].x, this.cache.bond.to[i].y);
		}
		mp.ctx.stroke();
	}
}
