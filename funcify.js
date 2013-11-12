/**
 * Funcify.js 1.1.1
 * 2013 - Clemens Damke
 * License: WTFPL - Have fun! Credits only if you want to.
 */

var Funcify = function(pGlobal) {
	
	/**
	 * Private helpers:
	 */
	
	var gC = pGlobal, // Global context
		list = [], // List of changable functions
		count = 0, // Counter for more flexible handling of the list-functions. May become useful later on.
		reg = /^function[^(]+\(([^)]*)\)\s*\{[\s]{0,1}([\s\S]*)\}$/, // RegEx gives params and body of a function.
		newline = "\n"; // New-Line character for string creation, NOT splitting
	
	function splitFuncStr(func) { // Get params and body of func as 2 strings
		if(isFyed(func) && func.container)
			func = list[func.funcifyId];
		if(func.getRaw) // Do regex-exec only once for faster future requests.
			return func.getRaw;
		return func.getRaw = reg.exec(func.toString());
	}
	function conv(str, splitter) {
		var arr = str.split(splitter);
		for (var i=0; i<arr.length; i++) {
			arr[i] = arr[i].trim();
			if(!arr[i]) {
				arr.splice(i, 1);
				i--;
			}
		}
		return arr;
	}
	function convLines(str) { // Multiline code string to array of code lines
		return conv(str, /[\n\r]/);
	}
	function convParams(str) { // Function parameter string to array of params
		return conv(str, ",");
	}
	
	function isPublic(func) { // Is func a globally available function?
		return func && gC[func.name];
	}
	function isFyed(func) { // Was func added to funcifys register of changable functions?
		return func && func.funcifyId !== undefined && list[func.funcifyId];
	}
	
	function makeFyFunction(id) { // Creates a function, the user can call to access his/her own function, stored in list.
		var f = function() {
			return list[id].apply(this, arguments);
		};
		// Following sets could be too slow... (Maybe use a seperate prototype layer between fy-function an Function-Obj?)
		var set = {
			funcifyId: id,
			container: true, // Used in splitFuncStr: Original funcs and containers both have funcifyIds. Used to distinguish them.
			"toString": function() { return list[id].toString(); }
		};
		for(var key in set)
			Object.defineProperty.call(Object, f, key, {
				value: set[key],
				writable: false,
				enumerable: false,
				configurable: false
			});
		return f;
	}
	
	/**
	 * Methods:
	 * Explained in the public docs.
	 */
	
	this.get = function (func, mode, mode2) {
		if(typeof func == "function") {
			var erg = splitFuncStr(func);
			return {
				name: func.name,
				params: mode?erg[1]:convParams(erg[1]),
				lines: ((mode && mode2===undefined) || mode2)?erg[2]:convLines(erg[2])
			};
		}
		return false;
	};
	
	this.getLines = function(func, mode) {
		if(typeof func == "function") {
			var str = splitFuncStr(func)[2];
			return mode?str:convLines(str);
		}
		return false;
	};
	
	this.getParams = function(func, mode) {
		if(typeof func == "function") {
			var str = splitFuncStr(func)[1];
			return mode?str:convParams(str);
		}
		return false;
	};
	
	this.make = function(p1, p2, noFuncify) { // noFuncify-param is kind of a "secret", used by funcify to fasten up function mods, when setters are used (they use make internally). Prevents double fy-ing functions. Better not tell the user. He (or she - political correctness) may break things.
		var params = p1,
			lines = p2;
		// Form p1 and p2 to fit in a "new Function"-call...
		if(typeof p1 == "function") {
			var d = this.get(p1, true); // Only get strings -> faster
			params = [d.params]; // In following params-sets too: An array like ["a, b, c"] is faster to create than ["a","b","c"] and works in "new Function" as well -> so use it and be faster
			lines = d.lines;
		}
		else if (typeof p1 == "string")
			params = [p1]; // As described in first if of this function
		else if (p1 && p1.params !== undefined && p1.lines !== undefined) {
			params = p1.params;
			lines = p1.lines;
			if(typeof params == "string")
				params = [params]; // Look in the previous comment to see why there is an array here.
			if(lines instanceof Array)
				lines = lines.join(newline);
		}
		else if (!(p1 instanceof Array))
			params = false;
		if(p2) {
			if(p2 instanceof Array)
				lines = p2.join(newline);
			else if (typeof p2 != "string")
				lines = false;
		}
		if(params !== false && typeof lines == "string") { // Check if transform was successful
			params.push(lines.trim());
			var r = Function.apply(null, params); // Actually create the function: "new Function"-call
			return noFuncify?r:this.functions(r); // automatically fy new function, if not told otherwise
		}
		return false;
	};
	
	this.functions = function(func) { // Not documented. Long term for the fy-function.
		if(isFyed(func))
			return func;
		while(list[count])
			count++;
		list[count] = func;
		func.funcifyId = count;
		// Overwrite global functions directly if possible and remove old references:
		var r = makeFyFunction(count++);
		if(isPublic(func))
			gC[func.name] = r;
		return r;
	};
	
	this.set = function(func, p1, p2) {
		func = fy(func);
		var r = this.make(p1, p2, true);
		if(r) {
			list[func.funcifyId] = r;
			r.funcifyId = func.funcifyId;
			return true;
		}
		return false;
	};
	this.setLines = function(func, lines) {
		return this.set(func, this.getParams(func), lines);
	};
	this.setParams = function(func, params) {
		return this.set(func, params, this.getLines(func, true));
	};
	
	// Modifiers (require some private helpers):
	function checkNewVal(newVal, func) { // Transform a modifier-value (lines & params in different forms) to FASTLY settable values.
		if(!(newVal instanceof Array)) {
			if(typeof newVal == "string")
				newVal = [newVal];
			else if (typeof newVal == "function")
				newVal = func(newVal);
			else
				return false;
		}
		return newVal;
	}
	function add(func, newVal, word) { // Adds newVal to funcs word-prop ("lines" or "params"), used in addLines and addParams
		var info = this.get(func, word=="lines", word=="params");
		if((newVal = checkNewVal(newVal, this["get"+word.charAt(0).toUpperCase()+word.slice(1)])) === false)
			return false;
		info[word] = info[word].concat(newVal);
		return this.set(func, info);
	}
	
	this.modifyLines = function(func, pos, delNum, newLines) {
		var info = this.get(func, true, false);
		if((newLines = checkNewVal(newLines, this.getLines)) === false)
			return false;
		info.lines.splice.apply(info.lines, [pos, delNum].concat(newLines));
		return this.set(func, info);
	};
	
	this.addLines = function(func, newLines) {
		return add.call(this, func, newLines, "lines");
	};
	this.addParams = function(func, newParams) {
		return add.call(this, func, newParams, "params");
	};
	
	this.replaceLines = function(func, needle, replacement, useReplacementContent) {
		var info = this.get(func, true);
		if(replacement.lines !== undefined && replacement.params !== undefined)
			replacement = replacement.lines;
		info.lines = info.lines.replace(needle, useReplacementContent && typeof replacement=="function"?replacement.getLines(true):(replacement instanceof Array?replacement.join(newline):replacement));
		return this.set(func, info);
	};
};
var funcify = new Funcify(typeof window!="undefined"?window:global); // window: for browsers, global: limited Node.js support (better always use fy, even in global scope)
var fy = function(func) { // Actually just a link to the funcify object.
	return funcify.functions(func);
};

/**
 * Add Funcify-methods to Function-prototype:
 */
for (var key in funcify)
	if(key != "make")
		(function(key) { // Emulating let-scope
			Function.prototype[key] = function () {
				return funcify[key].apply(funcify, [this].concat([].splice.call(arguments,0)));
			};
		})(key);
Function.make = function(p1, p2) { // This actually does not make anything easier or faster. funcify.make does the same. But we have to be consistent, right?
	return funcify.make(p1, p2);
};