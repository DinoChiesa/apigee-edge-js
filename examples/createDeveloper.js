// createDeveloper.js
// ------------------------------------------------------------------
// provision a developer in Apigee Edge
//
/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

// Copyright 2017-2019 Google LLC
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
// last saved: <2019-February-11 12:55:48>
'use strict';

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20190211-1255',
      getopt     = new Getopt(common.commonOptions.concat([
        ['E' , 'email=ARG', 'email address of the developer for which to create the app'],
        ['F' , 'first=ARG', 'first name for the developer'],
        ['a' , 'attr=ARG+' , 'attributes for the developer, in N:V form. Can provide multiple.'],
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
apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  var options = {
        developerEmail : opt.options.email,
        lastName : opt.options.last,
        firstName : opt.options.first,
        userName : opt.options.first + '.' + opt.options.last,
        attributes : {}
      };

  if (opt.options.attr) {
    opt.options.attr.forEach( (attr) => {
      var parts = attr.split(':');
      if (parts.length == 2) {
        options.attributes[parts[0]] = parts[1];
      }
      else {
        common.logWrite("mis-formatted attribute: " + attr);
      }
    });
  }

  org.developers.create(options, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      process.exit(1);
    }
    common.logWrite(sprintf('ok. developer: %s', JSON.stringify(result, null, 2)));
  });
});
