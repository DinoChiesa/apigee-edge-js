#! /usr/local/bin/node
/*jslint node:true */
// findApiKey.js
// ------------------------------------------------------------------
// find the developer and app name for an API key from an Edge org.
//
// last saved: <2017-December-07 18:40:48>

var edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    Getopt = require('node-getopt'),
    version = '20171207-1827',
    getopt = new Getopt(common.commonOptions.concat([
      ['k' , 'key=ARG', 'the key to find.'],
      ['T' , 'notoken', 'optional. do not try to get a authentication token.']
    ])).bindHelp();

function handleError(e) {
    if (e) {
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

// ========================================================

console.log(
  'Edge API key finder, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.key ) {
  console.log('You must specify a key to find');
  getopt.showHelp();
  process.exit(1);
}

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      no_token: opt.options.notoken,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org) {
  handleError(e);
  org.apps.get({expand:true}, function(e, result) {
    var found = null;
    handleError(e);
    result.app.forEach(function(app) {
      if ( !found && app.credentials) app.credentials.forEach(function(cred){
        if ( !found && cred.consumerKey == opt.options.key) { found = {app:app, cred:cred}; }
      });
    });

    if (found) {
      org.developers.get({id:found.app.developerId}, function(e, result) {
        common.logWrite('key: ' + opt.options.key);
        common.logWrite('app: ' + found.app.name + ' ' + found.app.appId);
        common.logWrite('dev: ' + found.app.developerId + ' ' +
                    result.firstName + ' ' +
                    result.lastName + ' ' +
                    result.userName + ' ' +
                    result.email);
      });
    }
  });
});
