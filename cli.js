#!/usr/bin/env node
var fs = require('fs');
var argv = require('optimist').argv;
var porter = require('./porter');

var entryModule = argv._[0];
var outFile = argv.o;

var bundle = porter.bundle(entryModule);
fs.writeFileSync(outFile, bundle);