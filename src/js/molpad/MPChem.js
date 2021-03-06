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
 * Load molfile into MolPad
 * Uses Ketcher chem utils
 * @param {String}  mol
 * @param {Boolean} forceRemoveHydrogen
 */
MolPad.prototype.loadMOL = function(mol, forceRemoveHydrogen)
{
	this.saveToStack();

	this.molecule = { atoms: [], bonds: [] };

	var molecule = chem.Molfile.parseCTFile(mol.split("\n"));

	//convert Ketcher data format into MolPad molecule
	var scope = this;

	molecule.atoms.each(function(i, atomData)
	{
		var atom = new MPAtom({
			i: i,
			x: atomData.pp.x * scope.settings.bond.length,
			y: atomData.pp.y * scope.settings.bond.length,
			element: atomData.label,
			charge: atomData.charge,
			isotope: atomData.isotope
		});

		scope.molecule.atoms.push(atom);
	});

	molecule.bonds.each(function(i, bondData)
	{
		scope.molecule.atoms[bondData.begin].addBond(scope.molecule.bonds.length);
		scope.molecule.atoms[bondData.end].addBond(scope.molecule.bonds.length);

		var bond = new MPBond({
			i: i,
			type: bondData.type,
			stereo: bondData.stereo,
			from: bondData.begin,
			to: bondData.end
		});

		scope.molecule.bonds.push(bond);
	});

	if(this.settings.drawSkeletonFormula || forceRemoveHydrogen)
	{
		this.removeImplicitHydrogen();
	}

	this.center();
}

MolPad.prototype.getMOL = function()
{
	return new chem.MolfileSaver().saveMolecule(this.getKetcherData());
}

MolPad.prototype.getSMILES = function()
{
	if(this.molecule.atoms.length == 0) throw new Error("No atoms found");
	return new chem.SmilesSaver().saveMolecule(this.getKetcherData());
}

MolPad.prototype.getKetcherData = function()
{
	var molecule = new chem.Struct();

	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		molecule.atoms.add(this.molecule.atoms[i].getKetcherData(this));
	}
	for(var i = 0; i < this.molecule.bonds.length; i++)
	{
		molecule.bonds.add(this.molecule.bonds[i].getKetcherData(this));
	}

	molecule.initHalfBonds();
	molecule.initNeighbors();
	molecule.markFragments();

	return molecule;
}

MolPad.prototype.getPlainData = function()
{
	var molecule = { atoms: [], bonds: [] };

	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		molecule.atoms.push(this.molecule.atoms[i].getPlainData());
	}
	for(var i = 0; i < this.molecule.bonds.length; i++)
	{
		molecule.bonds.push(this.molecule.bonds[i].getPlainData());
	}

	return molecule;
}

MolPad.prototype.loadPlainData = function(data)
{
	this.molecule = { atoms: [], bonds: [] };

	for(var i = 0; i < data.atoms.length; i++)
	{
		this.molecule.atoms.push(new MPAtom(data.atoms[i]));
	}
	for(var i = 0; i < data.bonds.length; i++)
	{
		this.molecule.bonds.push(new MPBond(data.bonds[i]));
	}

	this.redraw(true);
}

MolPad.prototype.removeAtom = function(index)
{
	this.molecule.atoms.splice(index, 1);
	this.updateIndices();
}

/**
 * Remove bond from the current molecule
 * @param {Integer} index Bond index
 */
MolPad.prototype.removeBond = function(index)
{
	var f = this.molecule.bonds[index].getFrom();
	var t = this.molecule.bonds[index].getTo();
	this.molecule.atoms.splice(f > t ? f : t, 1);
	this.molecule.atoms.splice(f < t ? f : t, 1);
	this.molecule.bonds.splice(index, 1);
	this.updateIndices();
}

MolPad.prototype.updateIndices = function(index)
{
	var atomIndexMap = {}, bondIndexMap = {};
	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		atomIndexMap[this.molecule.atoms[i].getIndex()] = i;
		this.molecule.atoms[i].setIndex(i);
	}
	for(var i = 0; i < this.molecule.bonds.length; i++)
	{
		var bond = this.molecule.bonds[i];
		var from = atomIndexMap[bond.getFrom()];
		var to = atomIndexMap[bond.getTo()];

		if(from !== undefined && to !== undefined)
		{
			bondIndexMap[bond.getIndex()] = i;
			bond.setIndex(i);
			bond.setFrom(from);
			bond.setTo(to);
		}
		else
		{
			this.molecule.bonds.splice(i, 1);
			i--;
		}
	}
	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		this.molecule.atoms[i].mapBonds(bondIndexMap);
	}
}

MolPad.prototype.removeImplicitHydrogen = function()
{
	var implicit = [];

	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		if(this.molecule.atoms[i].isImplicit(this))
		{
			implicit.push(i);
		}
	}

	for(var i = 0; i < implicit.length; i++)
	{
		this.molecule.atoms.splice(implicit[i] - i, 1);
	}

	this.updateIndices();
}

MolPad.prototype.addImplicitHydrogen = function()
{
	for(var i = 0; i < this.molecule.atoms.length; i++)
	{
		this.molecule.atoms[i].addImplicitHydrogen(this);
	}
}
