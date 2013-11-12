/**
 * Funcify.js 1.0
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
		reg = /^function[^(]+\(([^)]*)\)\s*\{[\s]{0,1}([\s\S]*)\}$/; // RegEx gives params and body of a function.
	
	function splitFuncStr(func) { // Get params and body of func as 2 strings
		if(isFyed(func) && func.container)
			func = list[func.funcifyId];
		if(func.getRaw) // Do regex-exec only once for faster future requests.
			return func.getRaw;
		return func.getRaw = reg.exec(func.toString());
	}
	function convLines(str) { // Multiline code string to array of code lines
		var arr = str.split(/[\n\r]/);
		for (var i=0; i<arr.length; i++) {
			arr[i] = arr[i].trim();
			if(!arr[i]) {
				arr.splice(i, 1);
				i--;
			}
		}
		return arr;
	}
	function convParams(str) { // Function parameter string to array of params
		var arr = str.split(",");
		for (var i=0; i<arr.length; i++)
			arr[i] = arr[i].trim();
		return arr;
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
		// Ugly! Needs some polishing.
		Object.defineProperty(f, "funcifyId", {
			value: id,
			writable: false,
			enumerable: false,
			configurable: false
		});
		Object.defineProperty(f, "container", {
			value: true,
			writable: false,
			enumerable: false,
			configurable: false
		});
		Object.defineProperty(f, "toString", {
			value: function() {
				return list[id].toString();
			},
			writable: false,
			enumerable: true,
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
	
	this.make = function(p1, p2, noFuncify) {
		var params = p1,
			lines = p2;
		if(typeof p1 == "function") {
			var d = this.get(p1, false, true);
			params = d.params;
			lines = d.lines;
		}
		else if (typeof p1 == "string")
			params = convParams(p1);
		else if (p1 && p1.params !== undefined && p1.lines !== undefined) {
			params = p1.params;
			lines = p1.lines;
			if(typeof params == "string")
				params = convParams(params);
			if(lines instanceof Array)
				lines = lines.join("\n");
		}
		else if (!(p1 instanceof Array))
			params = false;
		if(p2) {
			if(p2 instanceof Array)
				lines = p2.join("\n");
			else if (typeof p2 != "string")
				lines = false;
		}
		if(params && lines) {
			params.push(lines);
			var r = Function.apply(null, params);
			return noFuncify?r:this.functions(r);
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
	
	// The following three functions have a lot of redundancy. Shorten...
	this.modifyLines = function(func, pos, delNum, newLines) {
		var info = this.get(func);
		if(!(newLines instanceof Array)) {
			if(typeof newLines == "string")
				newLines = [newLines];
			else if (typeof newLines == "function")
				newLines = this.getLines(newLines);
			else
				return false;
		}
		info.lines.splice.apply(info.lines, [pos, delNum].concat(newLines));
		return this.set(func, info);
	};
	
	this.addLines = function(func, newLines) {
		var info = this.get(func);
		if(!(newLines instanceof Array)) {
			if(typeof newLines == "string")
				newLines = [newLines];
			else if (typeof newLines == "function")
				newLines = this.getLines(newLines);
			else
				return false;
		}
		info.lines = info.lines.concat(newLines);
		return this.set(func, info);
	};
	
	this.addParams = function(func, newParams) {
		var info = this.get(func);
		if(!(newParams instanceof Array)) {
			if(typeof newParams == "string")
				newParams = [newParams];
			else if (typeof newParams == "function")
				newParams = this.getParams(newParams);
			else
				return false;
		}
		info.params = info.params.concat(newParams);
		return this.set(func, info);
	};
};
var funcify = new Funcify(window); // window: May be changed for Node.js support etc.
var fy = function(func) { // Actually just a link to the funcify object.
	return funcify.functions(func);
};

/**
 * Add Funcify-methods to Function-prototype:
 */
for (var key in funcify) {
	if(key != "make") // new Function: Slow. May be abandoned when using "let key" is supported more widely.
		Function.prototype[key] = new Function("return funcify."+key+".apply(funcify, [this].concat([].splice.call(arguments,0)));");
}
Function.make = function(p1, p2) { // This actually does not make anything easier or faster. funcify.make does the same. But we have to be consistent, right?
	return funcify.make(p1, p2);
};