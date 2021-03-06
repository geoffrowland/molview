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

MolPad.prototype.resize = function()
{
	this.canvas.width = this.container.width() * this.devicePixelRatio;
	this.canvas.height = this.container.height() * this.devicePixelRatio;
	this.canvas.style.width = this.container.width() + "px";
	this.canvas.style.height = this.container.height() + "px";
	this.offset = this.container.offset();
	this.center();
}

MolPad.prototype.update = function(scaleOnly)
{
	var oldAtomScale = this.settings.atom.scale;

	this.settings.atom.miniLabel = this.getScale() <= this.settings.atom.maxMiniLabelScale;
	this.settings.atom.scale = this.getScale() < this.settings.atom.minScale ?
			this.settings.atom.minScale / this.getScale() : 1;
	this.settings.bond.deltaScale = this.getScale() < this.settings.bond.minDeltaScale ?
			this.settings.bond.minDeltaScale / this.getScale() : 1;
	this.settings.bond.scale = this.getScale() < this.settings.bond.minScale ?
			this.settings.bond.minScale / this.getScale() : 1;

	//atom.scale is the first dynamic scale factor
	if(!scaleOnly || this.settings.atom.scale != oldAtomScale)
	{
		for(var i = 0; i < this.molecule.atoms.length; i++)
		{
			this.molecule.atoms[i].update(this);
		}

		for(var i = 0; i < this.molecule.bonds.length; i++)
		{
			this.molecule.bonds[i].update(this);
		}
	}
}

MolPad.prototype.setCursor = function(type)
{
	this.container.css("cursor", type);
}

MolPad.prototype.draw = function()
{
	this.pendingFrame = false;

	if(!this.updated)
	{
		this.update();
		this.updated = true;
	}

	//clear
	this.ctx.clearRect(0, 0, this.width(), this.height());

	//apply matrix
	this.ctx.save();
	this.ctx.transform(this.matrix[0], this.matrix[1], this.matrix[2],
					   this.matrix[3], this.matrix[4], this.matrix[5]);

	//draw state (hover/active)
	this.ctx.lineWidth = 2 * this.settings.atom.radius * this.settings.atom.scale;
	this.ctx.lineCap = this.settings.atom.lineCap;
	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		this.molecule.atoms[i].drawStateColor(this);
	}

	this.ctx.lineWidth = 2 * this.settings.bond.radius * this.settings.bond.scale;
	this.ctx.lineCap = this.settings.bond.lineCap;
	for(var i = 0; i < this.molecule.bonds.length; i++)
	{
		this.molecule.bonds[i].drawStateColor(this);
	}

	//draw bonds
	this.ctx.fillStyle = this.ctx.strokeStyle = this.settings.bond.color;
	this.ctx.lineWidth = this.settings.bond.width * this.settings.bond.scale;
	this.ctx.lineCap = this.settings.bond.lineCap;
	this.ctx.lineJoin = this.settings.bond.lineJoin;
	for(var i = 0; i < this.molecule.bonds.length; i++)
	{
		this.molecule.bonds[i].drawBond(this);
	}

	//draw atoms
	this.ctx.fillStyle = this.ctx.strokeStyle = this.settings.atom.color;
	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		this.molecule.atoms[i].drawLabel(this);
	}

	//draw selection tool
	if(this.tool.type == "select")
	{
		this.ctx.fillStyle = this.settings.select.fillStyle;
		this.ctx.strokeStyle = this.settings.select.strokeStyle;
		this.ctx.lineWidth = this.settings.select.lineWidth / this.getScale();
		this.ctx.lineCap = this.settings.select.lineCap;
		this.ctx.lineJoin = this.settings.select.lineJoin;
		this.ctx.setLineDash([
			2 / this.getScale(),
			5 / this.getScale()
		]);

		this.ctx.beginPath();

		if(this.tool.tmp.rect)
		{
			this.ctx.rect(this.tool.tmp.rect.x, this.tool.tmp.rect.y,
					this.tool.tmp.rect.width, this.tool.tmp.rect.height);
		}
		else if(this.tool.tmp.points)//lasso
		{
			for(var i = 0; i < this.tool.tmp.points.length; i++)
			{
				if(i == 0) this.ctx.moveTo(this.tool.tmp.points[i].x, this.tool.tmp.points[i].y);
				else this.ctx.lineTo(this.tool.tmp.points[i].x, this.tool.tmp.points[i].y);
			}
		}

		this.ctx.fill();
		this.ctx.stroke();
	}

	this.ctx.restore();
}

/**
 * Redraw using requestAnimationFrame
 * requestAnimationFrame polyfill is already present in GLmol
 * @param {Boolean} update Indicates if molecule should be updated
 */
MolPad.prototype.redraw = function(update)
{
	if(update) this.updated = false;
	if(this.pendingFrame) return;
	this.pendingFrame = true;
	requestAnimationFrame(this.draw.bind(this));
}

MolPad.prototype.center = function()
{
	if(this.molecule.atoms.length == 0) return;
	
	this.resetMatrix();

	var bbox = this.getBBox();
	var sx = this.width() / bbox.width;
	var sy = this.height() / bbox.height;
	if(sx < sy)
	{
		this.scale(sx);
		this.translate(
			-bbox.x * sx,
			-bbox.y * sx + (this.height() - bbox.height * sx) / 2);
	}
	else
	{
		this.scale(sy);
		this.translate(
			-bbox.x * sy + (this.width() - bbox.width * sy) / 2,
			-bbox.y * sy);
	}

	var s = 1 - 2 * this.settings.relativePadding;
	this.scaleAbsolute(s, this.width() / 2, this.height() / 2);

	this.redraw(true);
}

MolPad.prototype.getBBox = function()
{
	if(this.molecule.atoms.length == 0)
	{
		return {
			x: 0,
			y: 0,
			width: 10,
			height: 10
		}
	}

	var bottomLeft = undefined, topRight = undefined;

	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		//calculate center line since molecule might not be updated yet
		var l = this.molecule.atoms[i].calculateCenterLine(this);
		var px1 = l.area.left !== undefined ? l.area.left.x : l.area.point.x;
		var px2 = l.area.right !== undefined ? l.area.right.x : l.area.point.x;
		var py = l.area.left !== undefined ? l.area.left.y : l.area.point.y;

		if(bottomLeft == undefined)
		{
			bottomLeft = { x: px1, y: py };
		}
		else
		{
			if(bottomLeft.x > px1) bottomLeft.x = px1;
			if(bottomLeft.y > py) bottomLeft.y = py;
		}

		if(topRight == undefined)
		{
			topRight = { x: px2, y: py };
		}
		else
		{
			if(topRight.x < px2) topRight.x = px2;
			if(topRight.y < py) topRight.y = py;
		}
	}

	var r = this.settings.atom.radius;
	return {
		x: bottomLeft.x - r,
		y: bottomLeft.y - r,
		width: topRight.x - bottomLeft.x + 2 * r,
		height: topRight.y - bottomLeft.y + 2 * r
	};
}

MolPad.prototype.width = function()
{
	return this.canvas.width;
}

MolPad.prototype.height = function()
{
	return this.canvas.height;
}

MolPad.prototype.translate = function(dx, dy)
{
	this.matrix[4] += dx;
	this.matrix[5] += dy;
}

MolPad.prototype.scale = function(s)
{
	this.matrix[0] *= s;
	this.matrix[3] *= s;
}

MolPad.prototype.getScale = function()
{
	return this.matrix[0];
}

MolPad.prototype.scaleAbsolute = function(s, cx, cy)
{
	this.matrix[0] *= s;
	this.matrix[3] *= s;
	this.matrix[4] -= (cx - this.matrix[4]) * (s - 1);
	this.matrix[5] -= (cy - this.matrix[5]) * (s - 1);
}

MolPad.prototype.resetMatrix = function()
{
	this.matrix = [ 1, 0, 0, 1, 0, 0 ];
}
