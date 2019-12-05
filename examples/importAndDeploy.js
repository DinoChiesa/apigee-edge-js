#! /usr/local/bin/node
/*jslint node:true */
// importAndDeploy.js
// ------------------------------------------------------------------
// import and deploy an Apigee Edge proxy bundle or shared flow.
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
// last saved: <2019-December-04 15:47:11>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      util       = require('util'),
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20190827-1405',
      defaults   = { basepath : '/' },
      getopt     = new Getopt(common.commonOptions.concat([
        ['d' , 'source=ARG', 'source directory for the proxy files. Should be parent of dir "apiproxy" or "sharedflowbundle"'],
        ['N' , 'name=ARG', 'override the name for the API proxy or shared flow. By default it\'s extracted from the XML file.'],
        ['e' , 'env=ARG', 'the Edge environment(s) to which to deploy the asset. Separate multiple environments with a comma.'],
        ['b' , 'basepath=ARG', 'basepath for deploying the API Proxy. Default: ' + defaults.basepath + '  Does not apply to sf.'],
        ['S' , 'sharedflow', 'import and deploy as a sharedflow. Default: import + deploy a proxy.']
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Proxy/Sharedflow Import + Deploy tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

process.on('unhandledRejection',
            r => console.log('\n*** unhandled promise rejection: ' + util.format(r)));

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.source ) {
  console.log('You must specify a source directory');
  getopt.showHelp();
  process.exit(1);
}

if (opt.options.basepath && opt.options.sharedflow) {
  console.log('It does not make sense to use a basepath when deploying a sharedflow.');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge
  .connect(common.optToOptions(opt))
  .then( org => {
    common.logWrite('connected');
    const collection = (opt.options.sharedflow) ? org.sharedflows : org.proxies;
    const term = (opt.options.sharedflow) ? 'sharedflow' : 'proxy';

    common.logWrite('importing a %s', term);
    return collection.import({name:opt.options.name, source:opt.options.source})
      .then( result => {
        common.logWrite(sprintf('import ok. %s name: %s r%d', term, result.name, result.revision));
        let envs = opt.options.env || process.env.ENV;
        if (envs) {
          // env may be a comma-separated list
          let options = { name: result.name, revision: result.revision };
          if ( ! opt.options.sharedflow) {
            options.basepath = opt.options.basepath || defaults.basepath;
          }

          // this magic deploys to each environment in series
          const reducer = (promise, env) =>
            promise .then( () =>
                           collection
                           .deploy(Object.assign(options, { environment:env }))
                           .then( (result) => common.logWrite('deployment ' + ((result.error) ? 'failed: ' + JSON.stringify(result) : 'ok.') ))
                         );

          return envs.split(',')
            .reduce(reducer, Promise.resolve())
            .then( () => common.logWrite('all done...') );
        }

        common.logWrite('finished (not deploying)');
        return Promise.resolve(true);
      });
  })
  .catch( e => console.log('while executing, error: ' + util.format(e)) );
