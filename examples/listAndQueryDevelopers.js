#! /usr/local/bin/node
/*jslint node:true */
// listAndQueryDevelopers.js
// ------------------------------------------------------------------
// list and query developers in Apigee Edge
//
// Copyright 2017-2019 Google LLC.
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
// last saved: <2019-February-11 12:46:53>

var edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    async = require('async'),
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20190211-1246',
    getopt = new Getopt(common.commonOptions.concat([
      ['E' , 'expand', 'expand for each developer']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Developer query tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));
common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    if (result) {
      common.logWrite(JSON.stringify(result, null, 2));
    }
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
