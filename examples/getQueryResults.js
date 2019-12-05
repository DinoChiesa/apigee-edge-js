#! /usr/local/bin/node
/*jslint node:true */
// getQueryResults.js
// ------------------------------------------------------------------
// download query results
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
// last saved: <2019-December-04 19:55:13>

const edgejs     = require('apigee-edge-js'),
      fs         = require('fs'),
      util       = require('util'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20191204-1948',
      getopt     = new Getopt(common.commonOptions.concat([
        //['e' , 'environment=ARG', 'required. environment in which the keystore will be created']
        ['U' , 'uri=ARG', 'required. uri of the query.']
      ])).bindHelp();

// ========================================================


console.log(
  'Apigee Edge Get Query Results tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.uri ) {
  console.log('You must specify a uri');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    if (opt.options.verbose) {
      common.logWrite('connected');
    }
    let options = {
          //environment : opt.options.environment,
          uri         : opt.options.uri
        };
    return org.queries.wait(options)
      .then( result => {
        org.queries.getResults({uri:result.uri})
          .then( ({response, body}) => {
            // this is a zip of a gzip of a not-JSON
            let filename;
            if (response.headers['content-disposition']) {
              filename = response.headers['content-disposition'].replace(new RegExp('.+filename="(.+)"'), '$1');
            }
            if ( ! filename) {
              let stamp = (new Date()).toISOString().substring(0, 19).replace(new RegExp(':', 'g'), '');

              filename = `./QueryResult-${stamp}.zip`;
            }
            fs.writeFileSync(filename, body);
            common.logWrite('result file: ' + filename);
          });
      });
  })
  .catch(e => console.log(util.format(e)));
