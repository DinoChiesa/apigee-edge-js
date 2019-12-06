#! /usr/local/bin/node
/*jslint node:true, esversion:9 */
// findProxyForBasepath.js
// ------------------------------------------------------------------
//
// Copyright 2018-2019 Google LLC.
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
// created: Mon Mar 20 09:57:02 2017
// last saved: <2019-December-05 23:44:26>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      util       = require('util'),
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20191205-2306',
      getopt     = new Getopt(common.commonOptions.concat([
        ['B' , 'basepath=ARG', 'Required. the basepath to find.'],
        ['R' , 'regexp', 'Optional. Treat the -B option as a regexp. Default: perform string match.'],
        ['' , 'proxypattern=ARG', 'Optional. a regular expression. Look only in proxies that match this regexp.'],
        ['L' , 'latestrevisionnumber', 'Optional. only look in the latest revision number for each proxy.']
      ])).bindHelp();

function isKeeper(opt) {
  if (opt.options.proxypattern) {
    common.logWrite('using regex match (%s)',opt.options.proxypattern);
    let re1 = new RegExp(opt.options.proxypattern);
    return function(name) {
      return name.match(re1);
    };
  }
  return () => true;
}


function getRevisionChecker(org, itemName) {
  return revision =>
    org.proxies.getEndpoints({ name: itemName, revision })
    .then( endpoints => {
      let reducer = (promise, endpoint) =>
        promise.then( accumulator =>
                      org.proxies
                      .getEndpoint({ name: itemName, revision, endpoint })
                      .then( ep => {
                        let isMatch = (opt.options.regexp) ?
                          opt.options.regexp.test(ep.connection.basePath) :
                          (ep.connection.basePath == opt.options.basepath);
                        return isMatch ?
                          [...accumulator,
                           {
                             name:ep.name,
                             basePath:ep.connection.basePath,
                             adminPath: sprintf('apis/%s/revisions/%s/endpoints/%s', itemName, revision, ep.name)
                           }
                          ]
                        : accumulator;
                      }));
      return endpoints.reduce(reducer, Promise.resolve([]));
    });
}

// a function that returns a revision reducer for the named proxy
function makeRevisionReducer(check) {
  return (promise, revision) =>
    promise.then( accumulator =>
                  check(revision)
                  .then( endpoint =>
                         endpoint.length ? [...accumulator, { revision, endpoint }] : accumulator ));
}

// expand from itemname to itemname and the list of revisions
function getRevisionReducer(org) {
  return (promise, itemname) =>
    promise .then( accumulator =>
                   org.proxies.get({ name: itemname })
                   .then( ({revision}) => {
                     if (opt.options.latestrevisionnumber) {
                       revision = [revision.pop()];
                     }
                     return [ ...accumulator, {itemname, revision} ];
                   }));
}

// ========================================================

console.log(
  'Apigee Edge findProxyForBasepath.js tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.basepath ) {
  console.log('You must specify a basepath to search for');
  getopt.showHelp();
  process.exit(1);
}

if (opt.options.regexp) {
  opt.options.regexp = new RegExp(opt.options.basepath);
}

apigeeEdge.connect(common.optToOptions(opt))
  .then(org =>
    org.proxies.get()
      .then( apiproxies => {
        if (opt.options.verbose) {
          common.logWrite('total count of API proxies for that org: %d', apiproxies.length);
        }
        return apiproxies
          .filter( isKeeper(opt) )
          .sort()
          .reduce( getRevisionReducer(org), Promise.resolve([]));
      })
      .then( itemsAndRevisions => {
        let itemReducer = (promise, nameAndRevisions) =>
          promise.then( accumulator => {
            let check = getRevisionChecker(org, nameAndRevisions.itemname);
            return nameAndRevisions.revision.reduce(makeRevisionReducer(check), Promise.resolve([]))
              .then( a => a.length ? [...accumulator, {proxyname: nameAndRevisions.itemname, found:a}] : accumulator);
        });

        return itemsAndRevisions.reduce(itemReducer, Promise.resolve([]));
      })
  )

  .then( r => console.log('' + JSON.stringify(r, null, 2)) )

  .catch( e => console.log('while executing, error: ' + e.stack) );
