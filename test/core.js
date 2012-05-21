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
	}
}