#! /usr/local/bin/node
/*jslint node:true */
// specTool.js
// ------------------------------------------------------------------
// List, retrieve, and create or update resourcefiles in an Apigee Edge
// environment, or organization.
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
// last saved: <2019-September-25 16:08:19>


// DISCLAIMER
//
// This module wraps the /dapi API, which is at this moment undocumented and
// unsupported, and subject to change.  That means this module may stop
// functioning at some point.  Use it at your own risk!
//

const edgejs       = require('apigee-edge-js'),
      common       = edgejs.utility,
      apigeeEdge   = edgejs.edge,
      util         = require('util'),
      Getopt       = require('node-getopt'),
      version      = '20190925-1535',
      validActions = ['list', 'get', 'getMeta', 'create', 'update', 'delete'],
      getopt       = new Getopt(common.commonOptions.concat([
        ['A' , 'action=ARG', 'required. valid actions: ' + validActions.join(',')],
        ['F' , 'file=ARG', 'optional. the source for the spec being created or updated.'],
        ['N' , 'name=ARG', 'optional for action = "list". otherwise required. The name of the spec.']
      ])).bindHelp();

// ========================================================

console.log(
  'Edge API spec tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

process.on('unhandledRejection',
            r => console.log('\n*** unhandled promise rejection: ' + util.format(r)));

console.log('*************\n' +
            '*** DISCLAIMER\n' +
            '*** \n' +
            '*** This tool uses a module that wraps the /dapi API, which is at this moment\n' +
            '*** undocumented and unsupported, and subject to change. This tool may stop\n' +
            '*** functioning at any time. Use it at your own risk!\n' +
            '*************\n');


common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

// Input Validation
if ( !opt.options.action) {
  common.logWrite('Specify -A or --action');
  getopt.showHelp();
  process.exit(1);
}
if ( validActions.indexOf(opt.options.action) < 0) {
  common.logWrite('Specify a valid action with -A or --action');
  getopt.showHelp();
  process.exit(1);
}
if ( (opt.options.action == 'delete' || opt.options.action == 'get') &&
     !opt.options.name) {
  common.logWrite('Specify a name with action = ' + opt.options.action);
  getopt.showHelp();
  process.exit(1);
}
if ( opt.options.action == 'list' && opt.options.name ) {
  common.logWrite('You must not specify a name with action = ' + opt.options.action);
  getopt.showHelp();
  process.exit(1);
}
if ( (opt.options.action == 'create' || opt.options.action == 'update') &&
      ! opt.options.file) {
  common.logWrite('You must specify a file with action = ' + opt.options.action);
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    const specs = org.specs;
    if ( opt.options.action == 'list' ) {

      return specs.list()
        .then( r => {
          console.log();
          console.log(JSON.stringify(r, null, 2));
        });
    }

    if ( opt.options.action == 'get' ) {
      return specs.get({name:opt.options.name})
        .then( r => {
          console.log();
          console.log(r);
        });
    }

    if ( opt.options.action == 'getMeta' ) {
      return specs.getMeta({name:opt.options.name})
        .then( r => {
          console.log();
          console.log(r);
        });
    }

    if ( opt.options.action == 'delete' ) {
       return specs.del({name:opt.options.name})
        .then( r => {
          console.log();
          console.log(r);
        });
     }

    if (opt.options.action == 'create' || opt.options.action == 'update') {
      const putOptions = {
              filename:opt.options.file,
              name:opt.options.name
            };
      return specs[opt.options.action](putOptions)
        .then( r => {
          console.log();
          console.log(r);
        });
    }

    return Promise.reject(new Error('unsupported action'));

  })
  .catch( e => console.error('error: ' + util.format(e) ) );
