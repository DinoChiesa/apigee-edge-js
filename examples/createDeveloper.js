#! /usr/local/bin/node
/*jslint node:true */
// createDeveloper.js
// ------------------------------------------------------------------
// provision a developer in Apigee Edge
//
// last saved: <2017-May-27 12:40:30>

var fs = require('fs'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20170324-1906',
    getopt = new Getopt(common.commonOptions.concat([
      ['E' , 'email=ARG', 'email address of the developer for which to create the app'],
      ['F' , 'first=ARG', 'first name for the developer'],
      ['L' , 'last=ARG', 'last name for the developer']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Developer creation tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.email ) {
  console.log('You must specify an email address');
  getopt.showHelp();
  process.exit(1);
}
if ( !opt.options.first ) {
  console.log('You must specify a first name');
  getopt.showHelp();
  process.exit(1);
}
if ( !opt.options.last ) {
  console.log('You must specify a last name');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    common.logWrite(JSON.stringify(result, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  var options = {
        developerEmail : opt.options.email,
        lastName : opt.options.last,
        firstName : opt.options.first,
        userName : opt.options.first + '.' + opt.options.last,
        // attributes: { "key1": "value1", "uuid": uuidV4() }
      };

  org.developers.create(options, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    common.logWrite(sprintf('ok. developer: %s', JSON.stringify(result, null, 2)));
  });
});
