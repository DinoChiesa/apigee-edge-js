#! /usr/local/bin/node
/*jslint node:true */
// listAndQueryDevelopers.js
// ------------------------------------------------------------------
// list and query developers in Apigee Edge
//
// last saved: <2017-December-06 12:42:46>

var fs = require('fs'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    async = require('async'),
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20171206-1242',
    getopt = new Getopt(common.commonOptions.concat([
      ['E' , 'expand', 'expand for each developer'],
      ['T' , 'notoken', 'optional. do not try to get a authentication token.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Developer query tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));
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
    process.exit(1);
  }
  common.logWrite('connected');

  org.developers.get({}, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    common.logWrite(sprintf('developers: %s', JSON.stringify(result, null, 2)));
    if (opt.options.expand && Array.isArray(result)) {

      var inquireOneDev = function(devEmail, cb) {
            org.developers.get({developerEmail: devEmail}, function(e, result) {
              if (e) { return cb(e); }
              return cb(null, result);
            });
          };

      async.map(result, inquireOneDev, function (e, results) {
        if (e) {
          common.logWrite(JSON.stringify(e, null, 2));
          common.logWrite(JSON.stringify(results, null, 2));
        }
        else {
          common.logWrite(JSON.stringify(results, null, 2));
        }
      });
    }
  });
});
