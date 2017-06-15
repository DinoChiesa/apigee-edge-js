#! /usr/local/bin/node
/*jslint node:true */
// exportApi.js
// ------------------------------------------------------------------
// export an Apigee Edge proxy bundle (or shared flow?)
//
// last saved: <2017-June-15 10:01:36>

var fs = require('fs'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20170614-1704',
    defaults = { basepath : '/' },
    getopt = new Getopt(common.commonOptions.concat([
      ['N' , 'name=ARG', 'name of existing API proxy or shared flow'],
      ['R' , 'revision=ARG', 'revision of the asset to export']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Proxy/Sharedflow Export tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.name ) {
  console.log('You must specify a name for the proxy or sharedflow');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.revision ) {
  console.log('You must specify a revision');
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
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');
  common.logWrite('exporting');
  org.proxies.export({name:opt.options.name, revision:opt.options.revision}, function(e, result) {
    if (e) {
      common.logWrite("ERROR:\n" + JSON.stringify(e, null, 2));
      if (result) { common.logWrite(JSON.stringify(result, null, 2)); }
      //console.log(e.stack);
      process.exit(1);
    }
    fs.writeFileSync(result.filename, result.buffer);
    common.logWrite('export ok file: %s', result.filename);
  });
});
