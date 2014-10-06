<?php
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

/*
PHP script for processing and retrieving data from the NIST Chemistry Webbook

Available spectra on NIST Chemistry WebBook:
- Mass spectrum
- IR spectrum
- UV-Visible spectrum

Notes:
- Index = 0 for Mass spectrum
- Index = 0 - 2 for IR spectrum
- Index = 0 for UV-Visible spectrum

Parameters:
- type = lookup || mass || ir || uvvis
- cas = CAS Registry Number
- i = ir index
*/

error_reporting(0);
parse_str($_SERVER["QUERY_STRING"]);

if(!isset($type) || !isset($cas))
{
	http_response_code(400);
	exit("Bad request");
}

if($type == "lookup")
{
	header("Content-Type: application/json");

	/*
	Extract spectra from Coblentz and NIST Mass Spec Data Center

	Returns (example for cas=50-78-2):
	{
		"mass": true,
		"uvvis": true,
		"ir": [
			{
				"i": 0,
				"state": "Not specified, most likely a prism, grating, or hybrid spectrometer.",
				"source": "(NO SPECTRUM, ONLY SCANNED IMAGE IS AVAILABLE)"
			},
			{
				"i": 1,
				"state": "SOLID (KBr DISC) VS KBr",
				"source": "PERKIN-ELMER 21 (GRATING); DIGITIZED BY COBLENTZ SOCIETY (BATCH I) FROM HARD COPY; 2 cm"
			}
		]
	}
	*/

	$nist_page = file_get_contents("http://webbook.nist.gov/cgi/cbook.cgi?Mask=80&ID=".$cas);

	echo "{";
	echo '"mass":'.(strrpos($nist_page, "Mass spectrum (electron ionization)") === false ? "false" : "true").",";
	echo '"uvvis":'.(strrpos($nist_page, "UV/Visible spectrum") === false ? "false" : "true").",";
	echo '"ir":[';

	//if there is only one records (Index=0) the result is directly embeded into the webpage (see caffeine)
	preg_match_all('/<th align="left" valign="top">State<\/th><td align="left" valign="top">([^<]*)<\/td>/', $nist_page, $records);

	if(count($records[0]) > 0)
	{
		preg_match_all('/Index=([0-9])/', $nist_page, $indexes);
		echo '{"i":'.$indexes[1][0].',"state":'.json_encode(utf8_encode($records[1][0])).',"source":""}';
	}
	else//second method
	{
		$nist_page = explode("\n", $nist_page);
		$inlist = false;
		$listnr = 0;
		$length = 0;

		$key = array_search('<h2><a id="IR-Spec" name="IR-Spec">IR Spectrum</a></h2>', $nist_page);
		if($key !== false)
		{
			$idx = $key + 1;//skip "Go to ..." line
		}
		else
		{
			echo "]}";
			return;
		}

		//loop trough NIST webpage lines
		for($idx = 0; $idx < count($nist_page); $idx++)
		{
			if($inlist == false)//we are not in an IR spectrum list
			{
				$pos1 = strpos($nist_page[$idx], '<p class="section-head"><strong>Data compiled by:</strong> <a href="/cgi/cbook.cgi?Contrib=COBLENTZ">Coblentz Society, Inc.</a></p>');
				$pos2 = strpos($nist_page[$idx], '<p class="section-head"><strong>Data compiled by:</strong> <a href="/cgi/cbook.cgi?Contrib=MSDC-IR">NIST Mass Spec Data Center, S.E. Stein, director</a></p>');
				if($pos1 !== false || $pos2 !== false)//we are in an IR spectrum list
				{
					$inlist = true;
					$listnr++;
					$idx++;//skip "<ul>"
				}
			}
			else
			{
				$pos = strpos($nist_page[$idx], 'Index=');
				if($pos !== false)//format the data of this IR spectrum
				{
					preg_match_all('/[i"]>([A-z][^;<]*)(?:[^<\/]{2}|)([^<]*)/', $nist_page[$idx], $results);
					if(count($results[0]) > 0)
					{
						preg_match_all('/Index=([0-9])/', $nist_page[$idx], $indexes);

						if($length > 0) echo ",";
						echo "{";
						echo '"i":'.json_encode(utf8_encode($indexes[1][count($indexes[1]) - 1])).",";//pick last Index=n in this line
						echo '"state":'.json_encode(utf8_encode($results[1][0])).",";
						echo '"source":'.json_encode(utf8_encode($results[2][0]));
						echo "}";

						$length++;
					}
				}
				else//this might be the end of this IR spectrum list
				{
					$pos = strpos($nist_page[$idx], '</ul>');
					if($pos !== false)
					{
						$inlist = false;
						if($listnr >= 2) break;
					}
				}
			}
		}
	}

	echo "]}";
}
else if($type == "mass")
{
	header("Content-Type: text");
	echo file_get_contents("http://webbook.nist.gov/cgi/cbook.cgi?JCAMP=".$cas."&Type=Mass&Index=0");
}
else if($type == "ir")
{
	header("Content-Type: text");
	if(!isset($i)) $i = 0;
	echo file_get_contents("http://webbook.nist.gov/cgi/cbook.cgi?JCAMP=".$cas."&Type=IR&Index=".$i);
}
else if($type == "uvvis")
{
	header("Content-Type: text");
	echo file_get_contents("http://webbook.nist.gov/cgi/cbook.cgi?JCAMP=".$cas."&Type=UVVis&Index=0");
}
