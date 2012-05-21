var test = require('tap').test;

var fs = require('fs');
var path = require('path');
var vm = require('vm')
var porter = require('../porter');

var fixturesDir = path.join(__dirname,'fixtures');
var fixtures = fs.readdirSync(fixturesDir);
/*
var sandbox = {
    moduleFactories: {},
    evaledModules: {},
    moduleOrder: [],
    require: function(module){
        if(!this.evaled[module]){
            this.modules[module] = 
        }
        return this.evaled[module] ? this.modules[module] : (this.modules[module] = this.modules[module]());
    }.bind(sandbox),
    define: function(name, dep, factory){
        modules[name] = factory;
    }.bind(sandbox)
}
*/

fixtures.forEach(function(fixture){
    var fixtureDir = path.join(fixturesDir, fixture);
    var mainPath = path.join(fixtureDir, 'main.js');
    if(!path.existsSync(mainPath)){
        var spec = require( path.join(fixtureDir,'spec.json'));
        mainPath = path.join(fixtureDir, spec.entry);
    }
    var calculatedOrder = porter.orderedDependencies(mainPath);
    var expectedOrder = require(path.join(fixtureDir, 'expected-order.json'));
    
    test(fixture, function (t) {
        t.plan(1);
        t.equal(calculatedOrder.join(','), expectedOrder.join(','), "Verify module order.");
        t.end();
    });
});