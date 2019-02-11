#! /usr/local/bin/node
/*jslint node:true */
// deleteDeveloperApp.js
// ------------------------------------------------------------------
// delete a developer app
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
// last saved: <2019-February-11 13:17:32>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20190211-1317',
      getopt     = new Getopt(common.commonOptions.concat([
        ['E' , 'email=ARG', 'email address of the developer for which to create the app'],
        ['N' , 'appname=ARG', 'name for the app']
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

if ( !opt.options.email ) {
  console.log('You must specify an email address');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    common.logWrite(JSON.stringify(result, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  var options = {
        developerEmail : opt.options.email,
        appName : opt.options.appname
      };

  org.developerapps.del(options, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      //console.log(e.stack);
      process.exit(1);
    }
    common.logWrite('ok.');
  });
});
