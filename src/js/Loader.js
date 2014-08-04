/*!
MolView v2.2 (http://molview.org)
Copyright (c) 2014, Herman Bergwerf
ALL RIGHTS RESERVED
*/

var Loader = {
	lastQuery: {
		type: "",//q || cid || pdbid || codid || smiles
		content: "",
		name: "",
	},

	CIRsearch: function()
	{
		if(!Request.ChemicalIdentifierResolver.available)
		{
			Messages.alert("cir_func_down");
			return;
		}

		Progress.clear();
		Progress.setSteps(3);

		var query = $("#search-input").val();

		Request.CIRsearch(query, true, function(mol2d, mol3d, text)
		{
			Sketcher.loadMOL(mol2d);
			Sketcher.markUpdated();

			Model.loadMOL(mol3d);

			text = ucfirst(text);
			document.title = text;

			Progress.complete();
			Messages.hide();

			Loader.lastQuery.type = "q";
			Loader.lastQuery.content = text;
			History.push("q", text);
		}, function()
		{
			Messages.alert("search_fail");
		});
	},

	//PubChem wrapper
	PubChem: {
		i: 0,
		step: 5,
		loading: false,
		ssli: 1000,//structure search lookup interval

		write: function(data)
		{
			/*
			Search output:
			<div class="result">
				<div class="result-title"><span>Name</span></div>
				<div class="result-img-wrap><div class="result-img" style="background-image: url(image.png)"/></div>
			</div>
			*/

			var result = $('<div class="result result-notext"></div>');

			$("<div class='result-img'></div>").css("background-image",
				"url(" + Request.PubChem.image(data.CID) + ")")
				.appendTo($('<div class="result-img-wrap"></div>').appendTo(result));

			result.appendTo("#search-results .container");

			if(data.Title)
			{
				var title = $('<div class="result-title"><span>' + ucfirst(humanize(data.Title)) + "</span></div>");
				result.append(title);
				title.textfill({ maxFontPixels: 30 });
			}

			result.data("cid", data.CID);
			result.data("title", ucfirst(humanize(data.Title)));
			result.on("click", function()
			{
				if(window.getSelection().type != "Range")
				{
					Actions.hide_search_results();
					Loader.PubChem.loadCID($(this).data("cid"), $(this).data("title"));
				}
			});
		},

		loadCIDS: function(cids)
		{
			if(cids.length === 0) return;

			Request.PubChem.description(cids, function(data)
			{
				for(var i = 0; i < data.InformationList.Information.length; i++)
					Loader.PubChem.write(data.InformationList.Information[i]);

				if(Loader.PubChem.i >= Request.PubChem.data.length)
					$(".load-more").css("display", "none");
				else $("#load-more-pubchem").removeClass("load-more-progress");

				Loader.PubChem.loading = false;

				Progress.complete();
			},
			function()
			{
				Messages.alert("search_fail");
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

			if(!isNaN(text))//is number
			{
				Loader.PubChem.loadCID(text);
			}
			else
			{
				Progress.clear();
				Progress.setSteps(3);

				Request.PubChem.search(text, function()
				{
					Messages.hide();

					$("#load-more-pubchem").css("display", "block");
					$("#load-more-rcsb").css("display", "none");
					$("#load-more-cod").css("display", "none");

					$("#search-results .container").empty();
					Actions.show_search_results();

					Loader.PubChem.i = 0;
					Loader.PubChem.loadNextSet();
				},
				function()
				{
					Messages.alert("search_fail");
				});
			}
		},

		structureSearch: function(query, value, type)
		{
			Progress.clear();
			Progress.setSteps(3);

			Request.PubChem.listkey(query, value, type, function(listkey)
			{
				Progress.increment();

				function lookup()
				{
					Request.PubChem.list(listkey,
					function()//success
					{
						Progress.increment();

						Messages.hide();

						$("#load-more-pubchem").css("display", "block");
						$("#load-more-rcsb").css("display", "none");

						$("#search-results .container").empty();
						Actions.show_search_results();

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
						Messages.alert("search_fail");
					});
				}

				lookup();
			},
			function()
			{
				Messages.alert("search_fail");
			});
		},

		loadName: function(name)
		{
			Progress.clear();
			Progress.setSteps(5);

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
			Progress.clear();
			Progress.setSteps(4);

			name = ucfirst(name);

			Messages.process(function()
			{
				Loader.PubChem._loadCID(cid, name);
			}, "compound");
		},

		_loadCID: function(cid, name)
		{
			Request.PubChem.mol(cid, true, function(mol2d)
			{
				Sketcher.loadMOL(mol2d);
				Sketcher.CID = cid;
				Sketcher.markUpdated();

				Progress.increment();

				//request 3D molecule
				Request.PubChem.mol(cid, false, function(mol3d)
				{
					Model.loadMOL(mol3d);

					Loader.lastQuery.type = "cid";
					Loader.lastQuery.content = "" + cid;

					document.title = name || "MolView";
					History.push("cid", cid);

					Progress.complete();
					Messages.hide();
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

						Loader.lastQuery.type = "cid";
						Loader.lastQuery.content = "" + cid;

						document.title = name || "MolView";
						History.push("cid", cid);

						Progress.complete();
						Messages.hide();

						return;
					}

					Progress.increment();

					Request.ChemicalIdentifierResolver.resolve3d(smiles, function(mol3d)
					{
						Model.loadMOL(mol3d);
						Sketcher.markUpdated();

						Loader.lastQuery.type = "cid";
						Loader.lastQuery.content = "" + cid;

						document.title = name || "MolView";
						History.push("cid", cid);

						Progress.complete();
						Messages.hide();
					},
					function()
					{
						Model.loadMOL(mol2d);
						Sketcher.markUpdated();

						Loader.lastQuery.type = "cid";
						Loader.lastQuery.content = "" + cid;

						document.title = name || "MolView";
						History.push("cid", cid);

						Progress.complete();
						Messages.hide();
					});
				});
			},
			function()
			{
				Messages.alert("load_fail");
			});
		}
	},

	//RCSB wrapper
	RCSB: {
		i: 0,
		step: 10,
		loading: false,

		write: function(data)
		{
			/*
			Search output:
			<div class="result result-imgdesc">
				<div class="result-description">structureTitle</div>
				<div class="result-title"><span>structureId</span></div>
				<div class="result-img-wrap><div class="result-img" style="background-image: url(image.png)"/></div>
			</div>
			*/

			var result = $("<div class='result result-imgdesc'></div>");

			var img = $('<div class="result-img"></div>').css("background-image",
				"url(" + Request.RCSB.image(data.structureId) + ")");
			img.appendTo($('<div class="result-img-wrap"></div>').appendTo(result));

			result.appendTo("#search-results .container");

			var title = $('<div class="result-title"><span>' + data.structureId + "</span></div>");
			result.append(title);
			title.textfill({ maxFontPixels: 30 });

			var desc = $('<div class="result-description">' + ucfirst(humanize(data.structureTitle)) + "</div>");
			result.append(desc);

			var clickable = title;
			clickable.data("pdbid", data.structureId);
			clickable.on("click", function()
			{
				if(window.getSelection().type != "Range")
				{
					Actions.hide_search_results();
					Loader.RCSB.loadPDBID($(this).data("pdbid"));
				}
			});
		},

		loadPDBIDS: function(pdbids)
		{
			if(pdbids.length === 0) return;

			Request.RCSB.information(pdbids, function(data)
			{
				for(var i = 0; i < data.dataset.length; i++)
					Loader.RCSB.write(data.dataset[i]);

				if(Loader.RCSB.i >= Request.RCSB.data.length)
					$(".load-more").css("display", "none");
				else $("#load-more-rcsb").removeClass("load-more-progress");

				Loader.RCSB.loading = false;

				Progress.complete();
				Progress.hide();
			},
			function()
			{
				Messages.alert("search_fail");
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

			if(text.length == 4 && parseInt(text[0]) > 0)//could be PDBID
			{
				Loader.RCSB.loadPDBID(text);
			}
			else
			{
				Progress.clear();
				Progress.setSteps(3);

				Request.RCSB.search(text, function()
				{
					Messages.hide();

					$("#load-more-pubchem").css("display", "none");
					$("#load-more-rcsb").css("display", "block");
					$("#load-more-cod").css("display", "none");

					$("#search-results .container").empty();
					Actions.show_search_results();

					Loader.RCSB.i = 0;
					Loader.RCSB.loadNextSet();
				},
				function()
				{
					Messages.alert("search_fail");
				});
			}
		},

		loadPDBID: function(pdbid, name)
		{
			Progress.clear();
			Progress.setSteps(2);

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
							Messages.process(function()
							{
								if(Model.engine == "JSmol")
								{
									Model.loadPDB(pdb);
									Sketcher.markOutdated();

									document.title = name || pdbid.toUpperCase();

									Progress.complete();
									Messages.hide();

									Messages.alert("sketcher_no_macromolecules");
									Loader.lastQuery.type = "pdbid";
									Loader.lastQuery.content = "" + pdbid;
									History.push("pdbid", pdbid);
								}
								else//switch to JSmol
								{
									Model.loadPDB(pdb, true);
									Model.JSmol.setPlatformSpeed(1);
									Model.setRenderEngine("JSmol", function()
									{
										Sketcher.markOutdated();

										document.title = name || pdbid.toUpperCase();

										Progress.complete();
										Messages.hide();

										Messages.alert("sketcher_no_macromolecules");
										Loader.lastQuery.type = "pdbid";
										Loader.lastQuery.content = "" + pdbid;
										History.push("pdbid", pdbid);
									});
								}
							}, "macromolecule");
						}
					}
					else
					{
						Model.loadPDB(pdb);
						Sketcher.markOutdated();

						document.title = name || pdbid.toUpperCase();

						Progress.complete();
						Messages.hide();

						Messages.alert("sketcher_no_macromolecules");
						Loader.lastQuery.type = "pdbid";
						Loader.lastQuery.content = "" + pdbid;
						History.push("pdbid", pdbid);
					}
				},
				function()
				{
					Messages.alert("load_fail");
				});
			}, "macromolecule");
		}
	},

	//COD wrapper
	COD: {
		i: 0,
		step: 10,
		loading: false,

		write: function(data)
		{
			/*
			Search output:
			<div class="result">
				<div class="result-title"><span>title</span></div>
				<div class="result-description">description</div>
			</div>
			*/

			var result = $('<div class="result"></div>').appendTo("#search-results .container");

			data.formula = chemFormulaFormat(data.formula);
			var title_str = (data.mineral || data.commonname || data.chemname || data.formula || "?");

			var title = $('<div class="result-title"><span>' + title_str + "</span></div>");
			result.append(title);
			title.textfill({ maxFontPixels: 30 });

			var description = "";

			if(data.commonname && data.commonname != title_str) description += "<b>Common name:</b> " + data.commonname + "<br/>";
			if(data.chemname && data.chemname != title_str) description += "<b>Chemical name:</b> " + data.chemname + "<br/>";
			if(data.formula && data.formula != title_str) description += "<b>Formula:</b> " + data.formula + "<br/>";
			if(description != "") description += "<hr/>";

			description += data.title;

			var desc = $('<div class="result-description">' + description + "</div>");
			result.append(desc);

			var clickable = title;
			clickable.data("codid", data.codid);
			clickable.data("title", (data.mineral || data.commonname || data.chemname || ("COD: " + data.codid)));
			clickable.on("click", function()
			{
				if(window.getSelection().type != "Range")
				{
					Actions.hide_search_results();
					Loader.COD.loadCODID($(this).data("codid"), $(this).data("title"));
				}
			});
		},

		loadCODIDS: function(codids)
		{
			if(codids.length === 0) return;

			Request.COD.information(codids, function(data)
			{
				for(var i = 0; i < data.records.length; i++)
					Loader.COD.write(data.records[i]);

				if(Loader.COD.i >= Request.COD.data.length)
					$(".load-more").css("display", "none");
				else $("#load-more-cod").removeClass("load-more-progress");

				Loader.COD.loading = false;

				Progress.complete();
			},
			function()
			{
				Messages.alert("search_fail");
			});
		},

		loadNextSet: function()
		{
			if(this.loading) return;
			if(this.i < Request.COD.data.length)
			{
				this.loading = true;
				var start = this.i;
				var end = this.i + this.step;
				if(end > Request.COD.data.length) end = Request.COD.data.length;

				this.loadCODIDS(Request.COD.data.slice(start, end));
				this.i = end;

				$("#load-more-cod").addClass("load-more-progress");
			}
		},

		search: function()
		{
			var text = $("#search-input").val();

			if(!isNaN(text) && text.length == 7)//is number with 7 digits
			{
				Loader.COD.loadCODID(text);
			}
			else
			{
				Progress.clear();
				Progress.setSteps(3);

				Request.COD.search(text, function()
				{
					Messages.hide();

					$("#load-more-pubchem").css("display", "none");
					$("#load-more-rcsb").css("display", "none");
					$("#load-more-cod").css("display", "block");

					$("#search-results .container").empty();
					Actions.show_search_results();

					Loader.COD.i = 0;
					Loader.COD.loadNextSet();
				},
				function()
				{
					Messages.alert("search_fail");
				});
			}
		},

		loadCODID: function(codid, name)
		{
			Progress.clear();
			Progress.setSteps(2);

			function finish()
			{
				document.title = name || "COD: " + codid;

				Progress.complete();
				Messages.hide();

				Loader.lastQuery.type = "codid";
				Loader.lastQuery.content = "" + codid;
				History.push("codid", codid);
			}

			MolView.makeModelVisible();

			Messages.process(function()
			{
				Progress.increment();

				Request.COD.CIF(codid, function(cif)
				{
					if(cif.length > 1)
					{
						Model.loadCIF(cif);
						Request.COD.SMILES(codid, function(data)
						{
							if(data.records[0].smiles == "")
							{
								finish();
								Messages.alert("crystal_2d_fail");
							}
							else
							{
								Request.ChemicalIdentifierResolver.resolve2d(data.records[0].smiles,
								function(mol2d)
								{
									Sketcher.loadMOL(mol2d);
									Sketcher.markUpdated();
									finish();
								},
								function()
								{
									finish();
									Messages.alert("crystal_2d_fail");
								});
							}
						},
						function()
						{
							finish();
							Messages.alert("crystal_2d_fail");
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

	clean: function()
	{
		if(!Request.ChemicalIdentifierResolver.available)
		{
			Messages.alert("cir_func_down");
			return;
		}

		var updated = $("#resolve").hasClass("resolve-updated");

		Progress.clear();
		Progress.setSteps(2);

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

		Progress.increment();

		Request.ChemicalIdentifierResolver.resolve2d(smiles, function(mol)
		{
			Sketcher.loadMOL(mol);
			if(updated) Sketcher.markUpdated();

			Progress.complete();
			Messages.hide();
		},
		function()
		{
			Messages.alert("clean_fail");
		});
	},

	resolve: function()
	{
		if(!Request.ChemicalIdentifierResolver.available)
		{
			Messages.alert("cir_func_down");
			return;
		}

		Progress.clear();
		Progress.setSteps(2);

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

		Progress.increment();

		Request.ChemicalIdentifierResolver.resolve3d(smiles, function(mol)
		{
			Model.loadMOL(mol);
			Sketcher.markUpdated();

			Progress.complete();
			Messages.hide();

			Loader.lastQuery.type = "smiles";
			Loader.lastQuery.content = smiles;
			History.push("smiles", smiles);
		},
		function()
		{
			Messages.alert("resolve_fail");
		});
	},

	loadSMILES: function(smiles, title)
	{
		if(!Request.ChemicalIdentifierResolver.available)
		{
			Messages.alert("cir_func_down");
			return;
		}

		Progress.clear();
		Progress.setSteps(2);

		document.title = title || "MolView";

		Request.ChemicalIdentifierResolver.resolve3d(smiles, function(mol3d)
		{
			Progress.increment();

			Model.loadMOL(mol3d);

			Request.ChemicalIdentifierResolver.resolve2d(smiles, function(mol2d)
			{
				Sketcher.loadMOL(mol2d);
				Sketcher.markUpdated();

				Loader.lastQuery.type = "smiles";
				Loader.lastQuery.content = smiles;
				History.push("smiles", smiles);

				Progress.complete();
				Messages.hide();
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
