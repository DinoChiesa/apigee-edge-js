#! /usr/local/bin/node
/*jslint node:true */
// createDeveloperApp.js
// ------------------------------------------------------------------
// provision a developer app for an API Product in Apigee Edge
//
// last saved: <2017-December-06 12:45:16>

var fs = require('fs'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20171206-1245',
    getopt = new Getopt(common.commonOptions.concat([
      ['p' , 'product=ARG', 'name of the API product to enable on this app'],
      ['E' , 'email=ARG', 'email address of the developer for which to create the app'],
      ['N' , 'name=ARG', 'name for the app'],
      ['x' , 'expiry=ARG', 'expiry for the credential'],
      ['T' , 'notoken', 'optional. do not try to get a authentication token.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Developer App creation tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.appname ) {
  console.log('You must specify a name of an app');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.product ) {
  console.log('You must specify an API Product');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.email ) {
  console.log('You must specify an email address');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      no_token: opt.options.notoken,
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
        appName : opt.options.appname,
        apiProduct : opt.options.product,
        expiry : opt.options.expiry || '180d',
        attributes: { "key1": "value1", "tenant_id": "1234567"}
      };

  org.developerapps.create(options, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      //console.log(e.stack);
      process.exit(1);
    }
    common.logWrite(sprintf('ok. app name: %s', result.name));
    common.logWrite(sprintf('apikey %s', result.credentials[0].consumerKey));
    common.logWrite(sprintf('secret %s', result.credentials[0].consumerSecret));
  });
});
