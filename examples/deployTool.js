#! /usr/local/bin/node
/*jslint node:true */
// deployTool.js
// ------------------------------------------------------------------
// deploy or undeploy one or more Apigee Edge proxy bundles or shared flows.
// example:
//  node ./deployTool.js -v -n -o therealdinochiesa2-eval -e prod,test -N raisefaulttest,externalaccesstoken-1
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
// last saved: <2019-September-05 15:22:42>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20190211-1248',
      defaults   = { basepath : '/' },
      getopt     = new Getopt(common.commonOptions.concat([
        ['N' , 'name=ARG', 'name of the proxy or sharedflow to deploy. The asset must exist. Separate multiple environments with a comma.'],
        ['e' , 'env=ARG', 'the Edge environment(s) to which to deploy the asset. Separate multiple environments with a comma.'],
        ['U' , 'undeploy', 'undeploy. Default is to deploy.'],
        ['S' , 'sharedflow', 'deploy a sharedflow. Default: deploy a proxy.']
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Proxy/Sharedflow Deploy tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.name ) {
  console.log('You must specify one or more names of proxies or sharedflows to deploy/undeploy');
  getopt.showHelp();
  process.exit(1);
}
if ( ! opt.options.env ) {
  console.log('You must specify one or more environments');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge.connect(common.optToOptions(opt))
  .then( (org) => {
    common.logWrite('connected');

    const collection = (opt.options.sharedflow) ? org.sharedflows : org.proxies;
    const term = (opt.options.sharedflow) ? 'sharedflow' : 'proxy';

    const envs = opt.options.env.split(','); // env may be a comma-separated list
    const names = opt.options.name.split(','); // name may be a comma-separated list

    const cartesianProduct = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));

    if (opt.options.undeploy) {
      // undeploy whatever is deployed
      const combinations = cartesianProduct(names, envs);
      const reducer = (promise, combo) =>
            promise .then( () => collection.undeploy(Object.assign(options, { name:combo[0], environment:combo[1] }))
                           .then( (result) => common.logWrite('action ' + ((result.error) ? 'failed: ' + JSON.stringify(result) : 'succeeded.') )) );
      combinations
        .reduce(reducer, Promise.resolve())
        .then( () => common.logWrite('all done...') )
        .catch( (e) => console.error('error: ' + e.stack) );
    }
    else {
      // get latest revision and deploy THAT
      const getLatestRevision = (promise, assetName) =>
        promise .then( (interim) =>
                       collection.getRevisions({ name:assetName })
                       .then( (result) => [].concat(interim, [ [assetName, result.map(Number).sort((a, b) => b - a)[0] ] ] ) ) );

      names
        .reduce(getLatestRevision, Promise.resolve([]))
        .then( (nameRevisionPairs) => {
          const combinations = cartesianProduct(nameRevisionPairs, envs);
          // deploy the latest revision of each proxy to each environment in series
          const reducer = (promise, combo) =>
            promise .then( () => collection.deploy(Object.assign(options, { name:combo[0], revision:combo[1], environment:combo[2] }))
                           .then( (result) => common.logWrite('action ' + ((result.error) ? 'failed: ' + JSON.stringify(result) : 'succeeded.') )) );
          combinations
            .reduce(reducer, Promise.resolve())
            .then( () => common.logWrite('all done...') );
        })
        .catch( (e) => console.error('error: ' + e.stack) );
    }
  })
  .catch( (e) => console.error('error: ' + e) );
