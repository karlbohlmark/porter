(function (exports){
	var modules = {};
	function require(module){
		return modules[module];
	}

	function define(name, dependencies, moduleFactory){
		var exports = {};
		var module = {
			exports: exports
		}

		moduleFactory(module, exports, require);

		modules[name] = module.exports;
	}

	exports.define = define;
}(window))