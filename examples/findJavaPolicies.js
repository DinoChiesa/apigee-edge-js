#! /usr/local/bin/node
/*jslint node:true, esversion:9 */
// findJavaPolicies.js
// ------------------------------------------------------------------
// In Apigee Edge, find all policies in all proxies that reference a Java callout.
// Or, alternatively, find proxies in an org that include a specific JAR as a resource.
//
// This tool does not examine environment-wide or organization-wide resources.
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
// last saved: <2019-December-05 21:15:00>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      util       = require('util'),
      version    = '20191205-1955',
      getopt     = new Getopt(common.commonOptions.concat([
        ['J' , 'jar=ARG', 'Optional. JAR name to find. Default: search for all JavaCallout policies.'],
        ['R' , 'regexp', 'Optional. Treat the -J option as a regexp. Default: perform string match.'],
        ['E' , 'proxyregexp=ARG', 'Optional. check only for proxies that match this regexp.'],
        ['L' , 'latestrevisionnumber', 'Optional. only look in the latest revision number for each proxy.']
      ])).bindHelp();

function isKeeper(opt) {
  if (opt.options.proxyregexp) {
    common.logWrite('using regex match (%s)',opt.options.proxyregexp);
    let re1 = new RegExp(opt.options.proxyregexp);
    return function(name) {
      return name.match(re1);
    };
  }
  return () => true;
}

function checkRevisionForJar(org, proxyName) {
  let regexp = (opt.options.regexp) ? new RegExp(opt.options.jar) : null;
  return revision =>
    org.proxies.getResourcesForRevision({name:proxyName, revision})
        .then (result => {
          let jars = result && result.filter( item => {
                if ( ! item.startsWith('java://') ) return false;
                let jarName = item.substring(7);
                return (regexp) ? regexp.test(jarName) : (jarName == opt.options.jar);
              });
          return jars ? jars : null;
        });
}


function checkRevisionForJava(org, proxyName) {
  return revision =>
    org.proxies.getPoliciesForRevision({name:proxyName, revision})
    .then (policies => {
      let reducer = (promise, policy) =>
              promise .then( accumulator =>
                             org.proxies.getPoliciesForRevision({ name: proxyName, revision, policy })
                             .then( result =>  (result.policyType == 'JavaCallout') ? [ ...accumulator, policy ] : accumulator ));
      return policies.reduce(reducer, Promise.resolve([]));
    });
}

// ========================================================

console.log(
  'Apigee Edge JavaCallout/JAR check tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt))
  .then ( org =>
          org.proxies.get({})
          .then(proxies => {
            let reducer = (promise, proxyname) =>
              promise .then( accumulator =>
                             org.proxies.get({ name: proxyname })
                             .then( ({revision}) => {
                               if (opt.options.latestrevisionnumber) {
                                 revision = [revision.pop()];
                               }
                               return [ ...accumulator, {proxyname, revision} ];
                             }));

            // Starting from the list of proxies, filter to keep only those of
            // interest, then get the revisions of each one (maybe confining the
            // check to only the most recent revision), and then examine the
            // policies or resources in those revisions.
            return proxies
              .sort()
              .filter( isKeeper(opt) )
              .reduce(reducer, Promise.resolve([]))
              .then( proxiesAndRevisions => {
                common.logWrite('checking...' + JSON.stringify(proxiesAndRevisions));
                let getChecker = opt.options.jar ? checkRevisionForJar : checkRevisionForJava;

                // a function that returns a revision reducer for the named proxy
                function makeRevisionReducer(proxyName) {
                  let check = getChecker(org, proxyName);
                  return (promise, revision) =>
                    promise.then( accumulator =>
                                  check(revision)
                                  .then( policies => [...accumulator, {revision, policies}] ));
                }

                let proxyReducer = (promise, nameAndRevisions) =>
                  promise.then( accumulator =>
                                 nameAndRevisions.revision.reduce(makeRevisionReducer(nameAndRevisions.proxyname), Promise.resolve([]))
                                 .then( a => [...accumulator, {proxyname: nameAndRevisions.proxyname, found:a}]) );

                return proxiesAndRevisions.reduce(proxyReducer, Promise.resolve([]));
              });
          }))

  .then( r => console.log('' + JSON.stringify(r, null, 2)) )

  .catch( e => console.log('while executing, error: ' + util.format(e)) );
