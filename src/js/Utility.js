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

function ucfirst(str)
{
	if(str === undefined) return str;
	else return str.charAt(0).toUpperCase() + str.slice(1);
}

function humanize(str)
{
	if(str === undefined) return str;
	//reverse case for all words with uppercase characters only
	else return str.replace(/(\b[A-Z]+\b)/g, function (word)
	{
		return word.toLowerCase();
	});
}

function chemFormulaFormat(str)
{
	if(str) return str.replace(/-/g, "").replace(/\s/g, "").replace(/[\d,.][\d,.]*/g, "<sub>$&</sub>");
	else return undefined;
}

function oneOf(obj, array)
{
	for(var i = 0; i < array.length; i++)
	{
		if(obj == array[i]) return true;
	}
	return false;
}

function isTouchDevice()
{
	return !!('ontouchstart' in window) || (!!('onmsgesturechange' in window) && !!window.navigator.maxTouchPoints);
}

function isMobile()
{
	var check = false;
	(function (a)
	{
		if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true
	})(navigator.userAgent || navigator.vendor || window.opera);
	return check;
}

function isIE()
{
	var ua = window.navigator.userAgent;
	var msie = ua.indexOf('MSIE ');
	var trident = ua.indexOf('Trident/');

	if(msie > 0)
	{
		//IE 10 or older => return version number
		return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
	}

	if(trident > 0)
	{
		//IE 11 (or newer) => return version number
		var rv = ua.indexOf('rv:');
		return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
	}

	//other browser
	return -1;
}

//http://www.developerdrive.com/2013/08/turning-the-querystring-into-a-json-object-using-javascript/
function getQuery()
{
	if(location.search === "") return {};

	var pairs = location.search.slice(1).split("&");
	var result = {};
	pairs.forEach(function (pair)
	{
		pair = pair.split(/=(.+)?/);
		result[pair[0]] = decodeURIComponent(pair[1] || "");
	});

	return result;
}

function specialEncodeURIComponent(str)
{
	return str.replace(/&/g, "%26").replace(/#/g, "%23");
}

/*
jQuery Textfill plugin
https://github.com/jquery-textfill/jquery-textfill
*/
(function (jQuery)
{
	jQuery.fn.textfill = function (options)
	{
		var fontSize = options.maxFontPoints;
		var ourText = jQuery("span:visible:first", this);
		var maxHeight = jQuery(this).height();
		var maxWidth = jQuery(this).width();
		var textHeight;
		var textWidth;
		do {
			ourText.css("font-size", "" + fontSize + "pt");
			textHeight = ourText.height();
			textWidth = ourText.width();
			fontSize = fontSize - 1;
		}
		while ((textHeight > maxHeight || textWidth > maxWidth) && fontSize > 6);
		return this;
	}
})(jQuery);

/* Fullscreen */
function launchFullscreen(element)
{
	if(element.requestFullscreen) element.requestFullscreen();
	else if(element.mozRequestFullScreen) element.mozRequestFullScreen();
	else if(element.webkitRequestFullscreen) element.webkitRequestFullscreen();
	else if(element.msRequestFullscreen) element.msRequestFullscreen();
}

function exitFullscreen()
{
	if(document.exitFullscreen) document.exitFullscreen();
	else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
	else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
}

/* Open images using Blobs */
function dataURItoBlob(dataURI)
{
	try
	{
		//convert base64 to raw binary data held in a string
		var byteString = atob(dataURI.split(',')[1]);

		//separate out the mime component
		var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

		//write the bytes of the string to an ArrayBuffer
		var arrayBuffer = new ArrayBuffer(byteString.length);
		var _ia = new Uint8Array(arrayBuffer);
		for(var i = 0; i < byteString.length; i++)
		{
			_ia[i] = byteString.charCodeAt(i);
		}

		var dataView = new DataView(arrayBuffer);
		var blob = new Blob([dataView],
		{
			type: mimeString
		});
		return blob;
	}
	catch(e)
	{
		console.error(e);
		return null;
	}
}

function openDataURL(dataURL)
{
	var blob = dataURItoBlob(dataURL);
	var windowURL = window.URL || window.webkitURL || undefined;
	if(blob != null && windowURL != undefined)
	{
		window.open(windowURL.createObjectURL(blob));
	}
	else window.open(dataURL);
}

/* AJAX wrapper */
function AJAX(obj)
{
	return $.ajax(obj);
}

/* Test if DOM Element dimensions have changed */
$.fn.sizeChanged = function()
{
	return !(this.data("savedWidth") ==  this.width()
		  && this.data("savedHeight") ==  this.height());
}

$.fn.saveSize = function()
{
	this.data("savedWidth", this.width());
	this.data("savedHeight", this.height());
}

/* PHP similar_text JavaScript implementation
see: http://phpjs.org/functions/similar_text/ */
function similar_text(first, second, percent)
{
	//  discuss at: http://phpjs.org/functions/similar_text/
	// original by: Rafał Kukawski (http://blog.kukawski.pl)
	// bugfixed by: Chris McMacken
	// bugfixed by: Jarkko Rantavuori original by findings in stackoverflow (http://stackoverflow.com/questions/14136349/how-does-similar-text-work)
	// improved by: Markus Padourek (taken from http://www.kevinhq.com/2012/06/php-similartext-function-in-javascript_16.html)
	//   example 1: similar_text('Hello World!', 'Hello phpjs!');
	//   returns 1: 7
	//   example 2: similar_text('Hello World!', null);
	//   returns 2: 0

	if(first === null || second === null || typeof first === 'undefined' || typeof second === 'undefined')
	{
		return 0;
	}

	first += '';
	second += '';

	var pos1 = 0,
		pos2 = 0,
		max = 0,
		firstLength = first.length,
		secondLength = second.length,
		p, q, l, sum;

	max = 0;

	for(p = 0; p < firstLength; p++)
	{
		for(q = 0; q < secondLength; q++)
		{
			for(l = 0;
				(p + l < firstLength) && (q + l < secondLength) && (first.charAt(p + l) === second.charAt(q + l)); l++)
			;
			if(l > max)
			{
				max = l;
				pos1 = p;
				pos2 = q;
			}
		}
	}

	sum = max;

	if(sum)
	{
		if(pos1 && pos2)
		{
			sum += this.similar_text(first.substr(0, pos1), second.substr(0, pos2));
		}

		if((pos1 + max < firstLength) && (pos2 + max < secondLength))
		{
			sum += this.similar_text(first.substr(pos1 + max, firstLength - pos1 - max), second.substr(pos2 + max,
				secondLength - pos2 - max));
		}
	}

	if(!percent)
	{
		return sum;
	}
	else
	{
		return(sum * 200) / (firstLength + secondLength);
	}
}
