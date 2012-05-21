var fs = require('fs');
var path = require('path');
var esprima = require('esprima');
var commonDir = require('./pathUtil').commonDir;

var nodeIsARequireCall = function(node){
    return node.type == 'CallExpression' && node.callee.type == 'Identifier' && node.callee.name == 'require';
}

var memoize = function(fn){
    var cache = {};
    return function( arg ){
        if(arg in cache) {
            return cache[arg];
        } else {
            return cache[arg] = fn( arg );
        }
    }
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

exports.commonDir = commonDir;

exports.buildDependencyMap = function(start, getChildren){
    var tree = {};
    getChildren = memoize(getChildren);
    function buildTree(node){
        if(!(node in tree)){
            tree[node] = getChildren(node);
            tree[node].forEach(buildTree);
        }
        return tree[node];
    }

     buildTree(start, getChildren);
     return tree;
}

exports.dependencyArray = function(module, map){
    if(!map[module] || !map[module].length){
        return [];
    }

    var deps = [];
    map[module].forEach(function(dep){
        exports.dependencyArray(dep, map).forEach(function(d){
            deps.push(d);
        })
        deps.push(dep);
    });

    return deps;
};

exports.deduplicateArray = function(arr){
    var deduped = [];
    for(var i=0;i<arr.length; i++){
        if(deduped.indexOf(arr[i])==-1){
            deduped.push(arr[i]);
        }
    }

    return deduped;
}

exports.amdify = function(moduleSpec, moduleSource){

}

exports.bundle = function(entryModule){
    var dependencyArray = exports.orderedDependencies(entryModule);
    var baseDir = commonDir(dependencyArray);

    var moduleSources = dependencyArray.map(function(module){
        return fs.readFileSync( module );
    });
    return moduleSources.join('\n') + '\n' + fs.readFileSync(entryModule);
};

exports.directDependencies = function(absoluteModule, source){
    var entryModuleDir = path.dirname(absoluteModule);
    var ast = esprima.parse(source);

    var modules = [];

    traverseObject(null, ast, function(key, value){
        return nodeIsARequireCall(value);
    }, function(key, node){
        modules.push(node.arguments[0].value);
    });

    var absoluteModules = modules.map(function(module){
        return path.resolve(entryModuleDir, module);
    });

    return absoluteModules; 
}

exports.orderedDependencies = function(entryModule){
    var entryModuleAbsolute = path.resolve(entryModule);

    var map = exports.buildDependencyMap(entryModuleAbsolute, function(module){
        var source = fs.readFileSync(module + ( /\.js$/.test(module) ? '': '.js' ) );
        return exports.directDependencies(module, source);
    })

    var dependencyArrayWithDuplicates = exports.dependencyArray(entryModule, map);
    var dependencyArray = exports.deduplicateArray(dependencyArrayWithDuplicates);

    return dependencyArray; 
}
