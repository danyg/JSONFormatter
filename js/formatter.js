'use strict';

console.log('Formatter Worker Initiated');

onmessage = function(e) {
	postMessage( format(e.data) );
}

var formattedCode,
	lastError,
	midTabChar = '@~WeirdAmO'
;

function safeUnicode(str) {
	var result = str.toString(),
		c, code;
	for(var i = 0; i < str.length; i++) {
		code = str.charCodeAt(i)
		if(code > 127) {
			c = ('0000' + code.toString(16)).slice(-4);
			result = result.replace(str.charAt(i), '\\u' + c);
		}
	}
	return result;
}

function format(data) {
	var ret = {
		data: data,
		error: false
	};
	var code = '(function() { try { ret.data = ' + data + ' ; } catch ( e ) { ret.error = e.message; } }());';

	try {
		eval(code);
	} catch( e ) {
		ret.error = e.message;
	}

	if(ret.error === false) {
		if(ret.data === '' || ret.data === null || ret.data === undefined) {
			ret.data = data;
		} else {
			ret.data = safeUnicode(JSON.stringify(ret.data, undefined, midTabChar)).replace(new RegExp(midTabChar, 'g'), '\ucafe');
		}
	} else {
		ret.data = data;
	}

	return JSON.stringify(ret);
}
