var fs = require('fs');
var path = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');
var commonDir = require('./pathUtil').commonDir;

var nodeIsARequireCall = function(node){
    return node.type == 'CallExpression' && node.callee.type == 'Identifier' && node.callee.name == 'require';
}

var maybeAddJsExtension = function(module){
    return module + ( /\.js$/.test(module) ? '': '.js' );
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

exports.dependencyMap = function(startModule){
    return exports.buildDependencyMap(startModule, function(module){
        var source = fs.readFileSync( maybeAddJsExtension(module) );
        return exports.directDependencies(module, source);
    });
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

exports.amdify = function(moduleName, moduleSource, baseDir, map){
    var moduleDir = path.dirname(moduleName);

    var ast = esprima.parse(moduleSource);

    var makeRelativeBaseDir = function(relativePath){
        return path.relative(baseDir, path.resolve(moduleDir, relativePath) );
    }

    var dependencies = [];

    traverseObject(null, ast, function(key, value){
        return nodeIsARequireCall(value);
    }, function(key, node){
        var requiredModule = node.arguments[0].value;
        // If module is specfied with a relative path
        if(/^\./.test(requiredModule)){
            var dependency = makeRelativeBaseDir(requiredModule);
            dependencies.push(dependency);
            node.arguments[0].value = dependency;
        }
    });

    var args = ['module', 'exports', 'require'];

    var argsElements = args.map(function(arg){
        return {
            type: 'Identifier',
            name: arg
        }
    });

    var amdWrapper = {
        "type": "ExpressionStatement",
        "expression": {
            "type": "CallExpression",
            "callee": {
                "type": "Identifier",
                "name": "define"
            },
            "arguments": [
                {
                    "type": "Literal",
                    "value": makeRelativeBaseDir( moduleName )
                },
                {
                    "type": "ArrayExpression",
                    "elements": dependencies.map(function(d){ return { type: 'Literal', value: d}})
                },
                {
                    "type": "FunctionExpression",
                    "id": null,
                    "params": argsElements,
                    "body": {
                        "type": "BlockStatement",
                        "body": ast.body
                    }
                }
            ]
        }
    };

    ast.body = [amdWrapper];

    return escodegen.generate(ast);
};

exports.bundle = function(entryModule){
    entryModule = path.resolve(entryModule);
    var dependencyMap = exports.dependencyMap(entryModule);
    var dependencyArray = exports.orderedDependencies(entryModule, dependencyMap);
    dependencyArray.push(entryModule);
    var baseDir = commonDir(dependencyArray);

    var moduleSources = dependencyArray.map(function(module){
        var source = fs.readFileSync( maybeAddJsExtension(module) );
        return exports.amdify(module, source, baseDir, dependencyMap);
    });

    var runtime = fs.readFileSync( path.join( path.dirname(__filename), 'runtime.js' ) );
    
    return runtime + '\n' +  moduleSources.join('\n') + '\n';// + "require('" + path.relative(baseDir, entryModule) + "');";
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

exports.orderedDependencies = function(entryModule, map){
    var entryModuleAbsolute = path.resolve(entryModule);

    map = map || exports.buildDependencyMap(entryModuleAbsolute);

    var dependencyArrayWithDuplicates = exports.dependencyArray(entryModule, map);
    var dependencyArray = exports.deduplicateArray(dependencyArrayWithDuplicates);

    return dependencyArray; 
}
