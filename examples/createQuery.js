#! /usr/local/bin/node
/*jslint node:true */
// createQuery.js
// ------------------------------------------------------------------
// create an offline query.
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
// last saved: <2019-December-05 08:16:26>

const edgejs     = require('apigee-edge-js'),
      fs         = require('fs'),
      util       = require('util'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20191204-1810',
      defaults   = { format: "json" },
      getopt     = new Getopt(common.commonOptions.concat([
        ['e' , 'environment=ARG', 'required. environment in which the keystore will be created'],
        ['M' , 'metric=ARG', 'required. name of the metric to query. (eg, message_count)'],
        ['D' , 'dimension=ARG', 'required. dimension (eg apiproxy)'],
        ['F' , 'format=ARG', 'optional. json or csv. Default: ' + defaults.format]
      ])).bindHelp();

// ========================================================

function getNextMidnight() {
  let d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}

function getStartOfYear() {
  let d = new Date(new Date().getFullYear(), 0, 1);
  return d;
}

function randomString(L) {
  L = L || 18;
  let s = '';
  do {s += Math.random().toString(36).substring(2, 15); } while (s.length < L);
  return s.substring(0,L);
}


console.log(
  'Apigee Edge Query creation tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.environment ) {
  console.log('You must specify an environment');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.metric ) {
  console.log('You must specify a metric');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.dimension ) {
  console.log('You must specify a dimension');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    if (opt.options.verbose) {
      common.logWrite('connected');
    }
    let nextMidnight = getNextMidnight();
    let startOfYear = getStartOfYear();
    let stamp = (new Date()).toISOString().substring(0, 19).replace(new RegExp(':', 'g'), '');
    const options = {
            environment : opt.options.environment,
            query : {
              name : stamp + '-' + randomString(),
              metrics:[
                {
                  name: opt.options.metric,
                  "function":"sum",
                  alias:"count",
                  operator:"/",
                  value:"1000"
                }
              ],
              dimensions:[
                opt.options.dimension
              ],
              timeRange: {
                start: startOfYear.toISOString().substring(0,19),
                end: nextMidnight.toISOString().substring(0,19)
              },
              groupByTimeUnit: "month",
              limit: 14400,
              filter:"(" + opt.options.metric + " ge 0)",
              outputFormat: opt.options.format
            }
          };

    return org.queries.create(options)
      .then( result => {
        if (opt.options.verbose) {
          common.logWrite('created query %s', result.self.split(new RegExp('/', 'g')).slice(-1));
        }
        let options = {
          environment : opt.options.environment,
          uri         : result.self
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
      });
  })
  .catch(e => console.log(util.format(e)));
