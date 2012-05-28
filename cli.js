#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var argv = require('optimist').argv;
var porter = require('./porter');

var entryModule = argv._[0];
var outFile = argv.o;
var watch = argv.w;
var alias = argv.a;

var debug = !!(argv.debug);

var watchEvents;
if(watch) {
	watchEvents = new (require('events').EventEmitter)();
	console.log(watchEvents);
}

if(alias){
	var aliasDir = path.dirname(alias);
	var moduleAliasContents = fs.readFileSync(alias).toString().trim();
	if(moduleAliasContents){
		var moduleAliases = JSON.parse(moduleAliasContents);
		for(var module in moduleAliases){
			moduleAliases[path.resolve(aliasDir, module)] = path.resolve(aliasDir, moduleAliases[module]);
			delete moduleAliases[module];
		}
	}
}

var bundle = porter.bundle(entryModule, debug, watchEvents, moduleAliases);

writeFile(bundle);

if(watchEvents){
	watchEvents.on('change', writeFile);
}

function writeFile(bundle){
	console.log(new Date().toTimeString().substring(0,8) + ' writing bundle: ' + outFile);
	fs.writeFileSync(outFile, bundle);
}