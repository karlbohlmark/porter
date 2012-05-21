var esprima = require('esprima');
var escodegen = require('escodegen');
var porter = require('../porter');

module.exports = {
	'buildDependencyArray': function(t){
		var dependencies = {
			a: ['b', 'c'],
			b: ['d'],
			c: ['b', 'z'],
			z: ['b']
		}

		function getDependencies(m){
			return dependencies[m] || [];
		}

		var tree = porter.buildDependencyMap('a', getDependencies);
		var arr = porter.dependencyArray('a', tree);
		var deduped = porter.deduplicateArray(arr);
		
		/*
		console.log('tree', tree);
		console.log('arr', arr);
		console.log('deduped',deduped);
		*/

		//I'm out of control, testing three functions with one assert! (Yes, there should be more test cases (send a pull request))
		t.deepEquals(deduped, ['d', 'b', 'z', 'c']);
		t.end();
	},

	'make pseudo amd module': function(t){
		var fixtures = [{
			name: '/src/a/b',
			source: 'console.log(b)',
			baseDir: '/src',
			expected: "define('a/b', [], function(module, exports, require){ console.log(b); })"
		},{
			name: '/src/a/c/d',
			baseDir: '/src',
			source: "require('../z')",
			expected: "define('a/c/d', ['a/z'], function(module, exports, require){ require('a/z'); })"
		}]

		t.plan(fixtures.length);

		fixtures.forEach(function(m){

			var result = porter.amdify(m.name, m.source, m.baseDir);
			var expectedAst = esprima.parse(m.expected);

			var resultAst = esprima.parse(result);

			t.equal( escodegen.generate(expectedAst), escodegen.generate( resultAst ));
			//t.deepEquals(resultAst, expectedAst);
		});
		t.end();
	}
}