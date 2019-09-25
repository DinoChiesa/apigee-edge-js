#! /usr/local/bin/node
/*jslint node:true */
// resourceTool.js
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
// last saved: <2019-September-25 16:03:08>

const edgejs       = require('apigee-edge-js'),
      common       = edgejs.utility,
      apigeeEdge   = edgejs.edge,
      Getopt       = require('node-getopt'),
      version      = '20190925-1559',
      validActions = ['list', 'get', 'create', 'update', 'delete'],
      getopt       = new Getopt(common.commonOptions.concat([
        ['A' , 'action=ARG', 'required. valid actions: ' + validActions.join(',')],
        ['F' , 'file=ARG', 'optional. the source for the resourcefile being created or updated.'],
        ['e' , 'environment=ARG', 'optional. the environment.'],
        ['N' , 'name=ARG', 'Name of the resource. Required if action = "delete" or "get". Otherwise optional. (For create/update, name is inferred from the filename.)'],
        ['t' , 'type=ARG', 'Type of the resource: xsd, xsl, wsdl, jsc, java, node, etc. Required for create/update.']
      ])).bindHelp();

// ========================================================

console.log(
  'Edge API resourcefile tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

process.on('unhandledRejection',
            r => console.log('\n*** unhandled promise rejection: ' + util.format(r)));

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
     (!opt.options.name || !opt.options.type)) {
  common.logWrite('Specify a name and type with action = ' + opt.options.action);
  getopt.showHelp();
  process.exit(1);
}
if ( opt.options.action == 'list' &&
     (opt.options.name || opt.options.type)) {
  common.logWrite('You must not specify a name and type with action = ' + opt.options.action);
  getopt.showHelp();
  process.exit(1);
}
if ( (opt.options.action == 'create' || opt.options.action == 'update') &&
      ! opt.options.file) {
  common.logWrite('You must specify a file with action = ' + opt.options.action);
  getopt.showHelp();
  process.exit(1);
}

let baseOptions = (opt.options.environment) ?
  {environment:opt.options.environment} : {};

apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    let rf = org.resourcefiles;

    if ( opt.options.action == 'list' ) {

      return rf.get(baseOptions)
        .then( r => {
          console.log();
          console.log(JSON.stringify(r, null, 2));
        });
    }

    if ( opt.options.action == 'get' ) {
      let getOptions = {name:opt.options.name, type:opt.options.type};

      return rf.get({...baseOptions, ...getOptions})
        .then( r => {
          console.log();
          console.log(r);
        });
    }

    if ( opt.options.action == 'delete' ) {
      let delOptions = {name:opt.options.name, type:opt.options.type};
      return rf.del({...baseOptions, ...delOptions})
        .then( r => {
          console.log("OK");
          console.log(JSON.stringify(r));
        });
    }

    if (opt.options.action == 'create' || opt.options.action == 'update') {
      let moreOptions = {
            filename:opt.options.file,
            type:opt.options.type, // maybe empty
            name:opt.options.name  // maybe empty
          };
      return rf[opt.options.action]({...baseOptions, ...moreOptions})
        .then( r => {
          console.log();
          console.log(JSON.stringify(r, null, 2));
        });
    }

    return Promise.reject(new Error('unsupported action'));

  })
  .catch( e => console.error('error: ' + util.format(e)) );
