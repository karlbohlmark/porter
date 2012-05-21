#!/usr/bin/env node
var fs = require('fs');
var argv = require('optimist').argv;
var porter = require('./porter');

var entryModule = argv._[0];
var outFile = argv.o;

var debug = !!(argv.debug);

var bundle = porter.bundle(entryModule, debug);
fs.writeFileSync(outFile, bundle);