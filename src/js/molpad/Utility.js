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

/**
 * Calculate angle between two angles where from is the first encountered angle
 * in counter clockwise direction
 * @param {Float} from
 * @param {Float} to
 */
function findAngleBetween(from, to)
{
	if(to <= from)//to is actually larger than 2PI and therefore smaller than from
	{
		return to - from + 2 * Math.PI;
	}
	else
	{
		return to - from;
	}
}

/**
 * Calculate angle between two points where from is the center point
 * @param {Object} from
 * @param {Object} to
 */
function angleBetweenPoints(from, to)
{
	return Math.atan2(-to.y + from.y, to.x - from.x);//flipped y axis because of 2D canvas
}

function clampedAngle(start, center, point, steps)
{
	var a = angleBetweenPoints(center, point);
	var clampFactor = steps / (2 * Math.PI);
	return Math.round((a - start) * clampFactor) / clampFactor
			+ start;//clamp to x steps, normalize to startAngle
}

/**
 * Multiply all values in an array with a given multiplier into new array
 * @param  {Array} array
 * @param  {Float} mult
 * @return {Array}
 */
function multiplyAll(array, mult)
{
	var ret = []
	for(var i = 0; i < array.length; i++)
		ret.push(array[i] * mult);
	return ret;
}

/**
 * Calculate shortest distance between a point and a line
 * @param  {Object} p Point: { x: 0, y: 0 }
 * @param  {Object} a Line vertex a: { x: 0, y: 0 }
 * @param  {Object} b Line vertex b: { x: 0, y: 0 }
 * @return {Float}
 */
function pointToLineDistance(p, a, b)
{
	var A = p.x - a.x;
	var B = p.y - a.y;
	var C = b.x - a.x;
	var D = b.y - a.y;

	var dot = A * C + B * D;
	var len_sq = C * C + D * D;
	var param = dot / len_sq;

	var xx, yy;

	if(param < 0 || (a.x == b.x && a.y == b.y))
	{
		xx = a.x;
		yy = a.y;
	}
	else if(param > 1)
	{
		xx = b.x;
		yy = b.y;
	}
	else
	{
		xx = a.x + param * C;
		yy = a.y + param * D;
	}

	var dx = p.x - xx;
	var dy = p.y - yy;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks if the given point is inside the given circle
 * @param  {Object} point  Point
 * @param  {Object} center Circle center
 * @param  {Float}  radius Cricle radius
 * @return {Boolean}
 */
function pointInsideCircle(point, center, radius)
{
	return (point.x - center.x) * (point.x - center.x) +
		   (point.y - center.y) * (point.y - center.y) < radius * radius;
}

/**
 * Calculates if point is NOT inside an R radius from line ab
 * @param  {Object}  p Point: { x: 0, y: 0 }
 * @param  {Object}  a Line vertex a: { x: 0, y: 0 }
 * @param  {Object}  b Line vertex b: { x: 0, y: 0 }
 * @param  {Float}   r Radius around line
 * @return {Boolean}
 */
function fastPointInLineBox(p, a, b, r)
{
	var bl = {}, tr = {};//bottom left, top right
	if(a.x < b.x) { bl.x = a.x, tr.x = b.x; }
	else		  { bl.x = b.x, tr.x = a.x; }
	if(a.y < b.y) { bl.y = a.y, tr.y = b.y; }
	else		  { bl.y = b.y, tr.y = a.y; }

	return !(p.x < bl.x - r || p.x > tr.x + r || p.y < bl.y - r || p.y > tr.y + r);
}

/**
* Calculates if point is NOT inside an R radius from point a
* @param  {Object}  p Point: { x: 0, y: 0 }
* @param  {Object}  a Point a: { x: 0, y: 0 }
* @param  {Float}   r Radius around line
* @return {Boolean}
*/
function fastPointInCircleBox(p, a, r)
{
	return !(p.x < a.x - r || p.x > a.x + r || p.y < a.y - r || p.y > a.y + r);
}

function pointInRect(point, rect)
{
}

function pointInPolygon(point, polygon)
{
}

function getPointerCoords(e)
{
	var oe = e.originalEvent;
	if(oe.targetTouches && oe.targetTouches.length > 0)
	{
		return { x: oe.targetTouches[0].pageX, y: oe.targetTouches[0].pageY };
	}
	else
	{
		return { x: e.pageX, y: e.pageY };
	}
}

function getMultiTouchCenter(e)
{
	var t = e.originalEvent.targetTouches;
	if(t.length == 0) return { x: 0, y: 0 };
	else
	{
		var p = { x: t[0].pageX, y: t[0].pageY };
		for(var i = 1; i < t.length; i++)
		{
			p.x += t[i].pageX;
			p.y += t[i].pageY;
		}
		p.x /= t.length;
		p.y /= t.length;
		return p;
	}
}

function getMultiTouchDelta(e)
{
	var t = e.originalEvent.targetTouches;
	if(t.length <= 1) return 0;
	else
	{
		var dx = Math.abs(t[0].pageX - t[1].pageX);
		var dy = Math.abs(t[0].pageY - t[1].pageY);
		return Math.sqrt(dx * dx + dy * dy);
	}
}
