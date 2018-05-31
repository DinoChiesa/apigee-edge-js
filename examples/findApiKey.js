#! /usr/local/bin/node
/*jslint node:true */
// findApiKey.js
// ------------------------------------------------------------------
// find the developer and app name for an API key from an Edge org.
//
// Copyright 2017-2018 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// last saved: <2018-May-31 16:38:20>

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
