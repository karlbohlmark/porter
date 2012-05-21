var fs = require('fs');
var path = require('path');
var esprima = require('esprima');
var commonDir = require('./pathUtil').commonDir;

var nodeIsARequireCall = function(node){
    return node.type == 'CallExpression' && node.callee.type == 'Identifier' && node.callee.name == 'require';
}

// Function for traversing an object and executing a callback for properties for which a condition is satisfied
var traverseObject = function(key, o, condition, propertyCallback){
    if(!o || typeof o != 'object')
        return;
    if(condition(key, o))
        propertyCallback(key, o);
    else{
        for(var key in o){
            var value = o[key];
            traverseObject(key, value, condition, propertyCallback);
        }
    }
}

exports.bundle = function(entryModule){
    var moduleSpec = exports.analyze(entryModule);
    var absoluteModules = moduleSpec.orderedDependencies.map(function(module){
        var modulePath = path.resolve(moduleSpec.root, module) + '.js';
        return fs.readFileSync( modulePath );
    });
    return absoluteModules.join('\n') + '\n' + fs.readFileSync(entryModule);
};

exports.analyze = function(entryModule){
    var entryModuleAbsolute = path.resolve(entryModule);
    var entryModuleDir = path.dirname(entryModuleAbsolute);

    var ast = esprima.parse(fs.readFileSync(entryModuleAbsolute));

    var modules = [];

    traverseObject(null, ast, function(key, value){
        return nodeIsARequireCall(value);
    }, function(key, node){
        modules.push(node.arguments[0].value);
    });

    //console.dir(modules)

    var absoluteModules = modules.map(function(module){
        return path.resolve(entryModuleDir, module);
    });

    //console.dir(absoluteModules)

    var baseDir = commonDir(absoluteModules.concat(entryModuleAbsolute));

    //console.log('base:' + baseDir);

    var modulesRelativeToBaseDir = absoluteModules.map(function(module){
        return path.relative(baseDir, module);
    });

    return { orderedDependencies: modulesRelativeToBaseDir, root: baseDir }; 
}

exports.orderedDependencies = function(entryModule){
    return exports.analyze(entryModule).orderedDependencies;
}