#! /usr/local/bin/node
/*jslint node:true */
// undeployAndMaybeDelete.js
// ------------------------------------------------------------------
// undeploy and maybe delete an Apigee Edge proxy that has a name with a specific prefix.
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
// last saved: <2019-February-11 12:51:33>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      version    = '20190211-1251',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'prefix=ARG', 'required. name prefix. Undeploy and maybe delete all API Proxies with names starting with this prefix.' ],
        ['D' , 'delete', 'optional. Delete the proxies too. By default, just undeploy.' ]
      ])).bindHelp();

// ========================================================

// This script uses the Array.reduce() function extensively,
// to serially perform the asynchronous requests and responses for the various
// proxies, revisions, and environments.
// See https://decembersoft.com/posts/promises-in-serial-with-array-reduce/

function revEnvReducer(org, name, revision) {
  return (p, env) =>
    p.then( () => org.proxies.undeploy({name, revision, environment: env.name}));
}

function revReducer(org, name) {
  return (p, revision) =>
    p.then( () =>
            org.proxies.getDeployments({ name, revision })
            .then( (deployments) => deployments.environment )
            .then( (environments) =>
                   (environments && environments.length > 0)?
                   environments.reduce(revEnvReducer(org, name, revision), Promise.resolve()) :
                   {} ));
}

function proxyReducer(org) {
  return (p, name) =>
    p.then( () =>
            org.proxies.getRevisions({ name })
            .then( (revisions) =>
                   revisions.reduce(revReducer(org, name), Promise.resolve()))
            .then( () => (opt.options.delete) ? org.proxies.del({ name }) : {} ));
}

console.log(
  'Apigee Edge Proxy Undeploy + Delete tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));
if ( ! opt.options.prefix ) {
  console.log('You must specify a name prefix. (-P)');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge.connect(common.optToOptions(opt))
  .then( (org) => {
    org.proxies.get()
      .then( (proxies) =>
             proxies
             .filter( name => name.startsWith(opt.options.prefix))
             .reduce(proxyReducer(org), Promise.resolve()) )
      .then( (results) => common.logWrite('all done...') )
      .catch( (e) => console.log('error: ' + e.stack));
  })
  .catch( (e) => console.log('error: ' + e.stack));
