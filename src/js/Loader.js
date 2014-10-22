/**
 * This file is part of MolView (https://molview.org)
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
 * Loads remote data into MolView
 * Wrapper of Request.js
 * Called mainly by Actions.js
 * @type {Object}
 */
var Loader = {
	/**
	 * Last queried chemical identifier
	 * @type {Object}
	 */
	lastQuery: {
		type: "",//q || cid || pdbid || codid || smiles
		content: ""
	},

	/**
	 * Set last queried chemical identifier
	 * @param {String}  type         q || cid || pdbid || codid || smiles
	 * @param {String}  content      Content string for type
	 * @param {Boolean} forceReplace Indicates if History should use replaceState
	 */
	setQuery: function(type, content, forceReplace)
	{
		content = String(content);
		this.lastQuery.type = type;
		this.lastQuery.content = content;
		History.push(type, content, forceReplace);

		$("#data-3d-source").removeClass("disabled");
		if(type == "q" || type == "smiles") $("#data-3d-source").removeAttr().addClass("disabled");
		else if(type == "cid") $("#data-3d-source").attr("href", Request.PubChem.staticURL(content));
		else if(type == "pdbid") $("#data-3d-source").attr("href", Request.RCSB.staticURL(content));
		else if(type == "codid") $("#data-3d-source").attr("href", Request.COD.staticURL(content));
	},

	/**
	 * Resolve structure identifier from the #search-input using the CIR
	 */
	CIRsearch: function()
	{
		if(!Request.CIR.available)
		{
			Messages.alert("cir_func_down");
			return;
		}

		Progress.reset(3);

		var query = $("#search-input").val();

		Request.CIRsearch(query, function(mol2d, mol3d, text)
		{
			Sketcher.loadMOL(mol2d);
			Sketcher.markUpdated();

			Model.loadMOL(mol3d);

			text = ucfirst(text);
			document.title = text;

			Progress.complete();
			Messages.clear();

			Loader.setQuery("q", text);
		}, function()
		{
			Messages.alert("load_fail");
		});
	},

	PubChem:
	{
		i: 0,
		step: 10,
		loading: false,
		ssli: 1000,//structure search lookup interval

		loadCIDS: function(cids)
		{
			if(cids.length === 0) return;

			Request.PubChem.description(cids, function(data)
			{
				for(var i = 0; i < data.InformationList.Information.length; i++)
				{
					SearchGrid.addEntry(data.InformationList.Information[i]);
				}

				if(Loader.PubChem.i >= Request.PubChem.data.length) $(".load-more").css("display", "none");
				else $("#load-more-pubchem").removeClass("load-more-progress");
				Loader.PubChem.loading = false;
				Progress.complete();
			},
			function()
			{
				Messages.alert("remote_noreach");
			});
		},

		loadNextSet: function()
		{
			if(this.loading) return;
			if(this.i < Request.PubChem.data.length)
			{
				this.loading = true;
				var start = this.i;
				var end = this.i + this.step;
				if(end > Request.PubChem.data.length) end = Request.PubChem.data.length;

				this.loadCIDS(Request.PubChem.data.slice(start, end));
				this.i = end;

				$("#load-more-pubchem").addClass("load-more-progress");
			}
		},

		search: function()
		{
			var text = $("#search-input").val();

			Progress.reset(3);

			Request.PubChem.search(text, function()
			{
				Messages.clear();
				Actions.show_search_layer();

				SearchGrid.setDatabase("pubchem");
				SearchGrid.clear();

				Loader.PubChem.i = 0;
				Loader.PubChem.loadNextSet();
			},
			function()
			{
				Messages.alert("search_fail");
			});
		},

		structureSearch: function(query, value, type)
		{
			Progress.reset(3);

			Request.PubChem.structureSearch(query, value, type, function(listkey)
			{
				Progress.increment();

				function lookup()
				{
					Request.PubChem.list(listkey,
					function()//success
					{
						Progress.increment();
						Messages.clear();
						Actions.show_search_layer();

						SearchGrid.setDatabase("pubchem");
						SearchGrid.clear();

						Loader.PubChem.i = 0;
						Loader.PubChem.loadNextSet();
					},
					function(newlistkey)//wait
					{
						listkey = newlistkey;
						window.setTimeout(lookup, Loader.PubChem.ssli);
					},
					function()//error
					{
						Messages.alert("structure_search_fail");
					});
				}

				lookup();
			},
			function()
			{
				Messages.alert("structure_search_fail");
			});
		},

		loadName: function(name)
		{
			Progress.reset(5);

			Messages.process(function()
			{
				Request.PubChem.nameToCID(name, function(cid)
				{
					Loader.PubChem._loadCID(cid, ucfirst(name));
				},
				function()
				{
					Messages.alert("load_fail");
				});
			}, "compound");
		},

		loadCID: function(cid, name)
		{
			Progress.reset(4);

			name = ucfirst(name);

			Messages.process(function()
			{
				Loader.PubChem._loadCID(cid, name);
			}, "compound");
		},

		_loadCID: function(cid, name)
		{
			//request 2D molecule
			Request.PubChem.sdf(cid, true, function(mol2d)
			{
				Sketcher.loadMOL(mol2d);
				Sketcher.metadata.cid = cid;
				Sketcher.markUpdated();

				Progress.increment();

				//request 3D molecule
				Request.PubChem.sdf(cid, false, function(mol3d)
				{
					Model.loadMOL(mol3d);

					document.title = name || "MolView";
					Loader.setQuery("cid", cid);

					Progress.complete();
					Messages.clear();
				},
				function()//error: resolve using NCI
				{
					Progress.increment();

					var smiles;
					try
					{
						smiles = Sketcher.getSMILES();
					}
					catch(error)
					{
						Model.loadMOL(mol2d);
						Sketcher.markUpdated();

						document.title = name || "MolView";
						Loader.setQuery("cid", cid);

						Progress.complete();
						Messages.clear();

						return;
					}

					Progress.increment();

					Request.CIR.resolve(smiles, false, function(mol3d)
					{
						Model.loadMOL(mol3d);
						Sketcher.markUpdated();

						document.title = name || "MolView";
						Loader.setQuery("cid", cid);

						Progress.complete();
						Messages.clear();
					},
					function()
					{
						Model.loadMOL(mol2d);
						Sketcher.markUpdated();

						document.title = name || "MolView";
						Loader.setQuery("cid", cid);

						Progress.complete();
						Messages.clear();
					});
				});
			},
			function()
			{
				Messages.alert("load_fail");
			});
		}
	},

	RCSB:
	{
		i: 0,
		step: 10,
		loading: false,

		loadPDBIDS: function(pdbids)
		{
			if(pdbids.length === 0) return;

			Request.RCSB.information(pdbids, function(data)
			{
				for(var i = 0; i < data.dataset.length; i++)
				{
					SearchGrid.addEntry(data.dataset[i]);
				}

				if(Loader.RCSB.i >= Request.RCSB.data.length) $(".load-more").css("display", "none");
				else $("#load-more-rcsb").removeClass("load-more-progress");
				Loader.RCSB.loading = false;
				Progress.complete();
			},
			function()
			{
				Messages.alert("remote_noreach");
			});
		},

		loadNextSet: function()
		{
			if(this.loading) return;
			if(this.i < Request.RCSB.data.length)
			{
				this.loading = true;
				var start = this.i;
				var end = this.i + this.step;
				if(end > Request.RCSB.data.length) end = Request.RCSB.data.length;

				this.loadPDBIDS(Request.RCSB.data.slice(start, end));
				this.i = end;

				$("#load-more-rcsb").addClass("load-more-progress");
			}
		},

		search: function()
		{

			var text = $("#search-input").val();

			Progress.reset(3);

			Request.RCSB.search(text, function()
			{
				Messages.clear();
				Actions.show_search_layer();

				SearchGrid.setDatabase("rcsb");
				SearchGrid.clear();

				Loader.RCSB.i = 0;
				Loader.RCSB.loadNextSet();
			},
			function()
			{
				Messages.alert("search_fail");
			});
		},

		loadPDBID: function(pdbid, name)
		{
			Progress.reset(2);

			function finish()
			{
				Sketcher.markOutdated();

				document.title = name || pdbid.toUpperCase();

				Progress.complete();
				Messages.clear();

				Loader.setQuery("pdbid", pdbid);
			}

			MolView.setLayout("model");
			Messages.process(function()
			{
				Progress.increment();

				Request.RCSB.PDB(pdbid, function(pdb)
				{
					if(!Detector.webgl)
					{
						if(MolView.mobile)
						{
							Messages.alert("mobile_old_no_macromolecules");
						}
						else
						{
							if(Model.isJSmol())
							{
								Model.loadPDB(pdb);
								finish();
							}
							else//switch to JSmol
							{
								Model.preloadPDB(pdb);
								Model.setRenderEngine("JSmol", finish);
							}
						}
					}
					else
					{
						if(Model.isGLmol())
						{
							Model.loadPDB(pdb);
							finish();
						}
						else//switch to GLmol
						{
							Model.preloadPDB(pdb);
							Model.setRenderEngine("GLmol", finish);
						}
					}
				},
				function()
				{
					Messages.alert("load_fail");
				});
			}, "macromolecule");
		}
	},

	COD:
	{
		i: 0,
		step: 10,
		loading: false,

		loadNextSet: function()
		{
			$("#load-more-cod").addClass("load-more-progress");

			window.setTimeout(function()
			{
				if(this.loading) return;
				if(this.i < Request.COD.data.length)
				{
					for(var end = this.i + this.step;
						this.i < Request.COD.data.length && this.i < end; this.i++)
					{
						SearchGrid.addEntry(Request.COD.data[this.i]);
					}

					if(this.i >= Request.COD.data.length) $(".load-more").css("display", "none");
					else $("#load-more-cod").removeClass("load-more-progress");
					this.loading = false;
					Progress.complete();
				}
			}.bind(this), 300);
		},

		search: function()
		{
			var text = $("#search-input").val();

			Progress.reset(3);

			Request.COD.search(text, function()
			{
				Messages.clear();
				Actions.show_search_layer();

				SearchGrid.setDatabase("cod");
				SearchGrid.clear();

				Loader.COD.i = 0;
				Loader.COD.loadNextSet();
			},
			function(offline)
			{
				Messages.alert(offline ? "remote_noreach" : "search_fail");
			});
		},

		/**
		 * Load a Crystal model using a COD ID
		 * @param {String} codid        COD ID
		 * @param {String} name         Crystal name
		 * @param {String} cid          PubChem Compound ID for 2D depiction
		 * @param {String} PubChem_name PubChem Compound Name for 2D depiction
		 */
		loadCODID: function(codid, name, PubChem_name)
		{
			Progress.reset(4);

			MolView.makeModelVisible();

			function finish()
			{
				document.title = name || "COD: " + codid;

				Progress.complete();
				Messages.clear();

				Loader.setQuery("codid", codid);
			}

			function smilesFallback(cb)//cb(mol2d, smiles)
			{
				Request.COD.smiles(codid, function(data)
				{
					Progress.increment();

					if(data.records[0].smiles == "")
					{
						cb(null);
					}
					else
					{
						Request.CIR.resolve(data.records[0].smiles, true,
						function(mol2d)
						{
							cb(mol2d, data.records[0].smiles);
						}, function() { cb(null); });
					}
				}, function() { cb(null); });
			}

			function fallback()
			{
				smilesFallback(function(mol2d, smiles)
				{
					if(mol2d)
					{
						Sketcher.metadata.smiles = smiles;
						Sketcher.loadMOL(mol2d);
						Sketcher.removeAllHydrogens();
						Sketcher.markUpdated();

						finish();
						Messages.alert("crystal_2d_unreliable");
					}
					else
					{
						finish();
						Messages.alert("crystal_2d_fail");
					}
				});
			}

			function nameToCID(name)
			{
				Request.PubChem.nameToCID(name, function(cid)
				{
					Progress.increment();

					Request.PubChem.sdf(cid, true, function(mol2d)
					{
						Sketcher.metadata.cid = cid;
						Sketcher.loadMOL(mol2d);
						Sketcher.markUpdated();

						finish();
						Messages.alert("crystal_2d_unreliable");
					},
					function()
					{
						finish();
						Messages.alert("crystal_2d_fail");
					});
				}, fallback);
			}

			Messages.process(function()
			{
				//load CIF
				Request.COD.CIF(codid, function(cif)
				{
					if(cif.length > 1)
					{
						Model.loadCIF(cif, [1, 1, 1], function()
						{
							Progress.increment();

							/*
							load structural formule

							if PubChem_name is defined
							  - check if PubChem_name is CID primary name
							  - convert name to PubChem CID
							  - CID to 2D sdf
							else
							  - convert CODID to name
							  - convert name to PubChem CID
							  - CID to 2D sdf
							fallback
							  - CODID to smiles
							  - Resolve smiles using CIR
							*/

							if(PubChem_name != undefined)
							{
								//check if PubChem_name is CID primary name
								Request.PubChem.primaryName(PubChem_name, function(name)
								{
									Progress.increment();

									if(name.toLowerCase() == PubChem_name.toLowerCase())
									{
										//convert name to PubChem CID
										nameToCID(name);
									}
									else fallback();
								}, fallback);
							}
							else
							{
								//convert CODID to name
								Request.COD.name(codid, function(data)
								{
									Progress.increment();

									if(data.records[0].name != "")
									{
										//convert name to PubChem CID
										nameToCID(data.records[0].name);
									}
									else fallback();
								}, fallback);
							}
						});
					}
					else
					{
						Messages.alert("load_fail");
					}
				},
				function()
				{
					Messages.alert("load_fail");
				});
			}, "crystal");
		}
	},

	/**
	 * Cleans current structural formula using CIR depictionq
	 */
	clean: function()
	{
		Progress.reset(4);

		var smiles;
		try
		{
			smiles = Sketcher.getSMILES();
		}
		catch(error)
		{
			Messages.alert("smiles_load_error", error);
			return;
		}

		Request.resolve(smiles, 0, true, function(mol, cid)
		{
			Sketcher.loadMOL(mol);
			Sketcher.markUpdated();

			Progress.complete();
			Messages.clear();
		},
		function()
		{
			Messages.alert("load_fail");
		});
	},

	/**
	 * Converts the current structural formula into a 3D model
	 */
	resolve: function()
	{
		Progress.reset(4);

		var smiles;
		try
		{
			smiles = Sketcher.getSMILES();
		}
		catch(error)
		{
			Messages.alert("smiles_load_error", error);
			return;
		}

		Request.resolve(smiles, 0, false, function(mol, cid)
		{
			Model.loadMOL(mol);
			Sketcher.markUpdated();

			if(cid > 0)
			{
				Sketcher.metadata.cid = cid;
				Loader.setQuery("cid", cid);
			}
			else
			{
				Loader.setQuery("smiles", smiles);
			}

			Progress.complete();
			Messages.clear();

			document.title = "MolView";

			if(MolView.layout == "sketcher")
			{
				MolView.setLayout("model");
			}
		},
		function()
		{
			Messages.alert("load_fail");
		});
	},

	/**
	 * Loads 2D and 3D molecule for a given SMILES string
	 * @param {String} smiles SMILES
	 * @param {String} title  New document title
	 */
	loadSMILES: function(smiles, title)
	{
		Progress.reset(4);

		document.title = title || "MolView";

		Request.resolve(smiles, 0, false, function(mol3d, cid)
		{
			Progress.increment();

			Model.loadMOL(mol3d);

			Request.resolve(smiles, cid, true, function(mol2d, cid)
			{
				Sketcher.loadMOL(mol2d);
				Sketcher.markUpdated();

				if(cid > 0)
				{
					Sketcher.metadata.cid = cid;
					Loader.setQuery("cid", cid, true);
				}
				else
				{
					Loader.setQuery("smiles", smiles);
				}

				Progress.complete();
				Messages.clear();
			},
			function()
			{
				Messages.alert("load_fail");
			});
		},
		function()
		{
			Messages.alert("load_fail");
		});
	}
};
