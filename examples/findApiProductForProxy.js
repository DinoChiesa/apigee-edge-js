// findApiProductForProxy.js
// ------------------------------------------------------------------
//
/* global process */
/* jshint esversion:9, node:true, strict:implied */

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
// created: Mon Mar 20 09:57:02 2017
// last saved: <2019-September-25 17:28:30>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      util       = require('util'),
      version    = '20190925-1723',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'proxy=ARG', 'Required. the proxy to find.']
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge findApiProductForProxy.js tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.proxy ) {
  console.log('You must specify a proxy to find');
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt))
  .then(org => {
  common.logWrite('searching...');
    return org.products.get({expand:true})
      .then(result => {
        let apiproducts = result.apiProduct;
        common.logWrite('total count of API products for that org: %d', apiproducts.length);
        let filtered = apiproducts.filter( product => (product.proxies.indexOf(opt.options.proxy) >= 0));

        if (filtered) {
          common.logWrite('count of API products containing %s: %d', opt.options.proxy, filtered.length);
          if (filtered.length) {
            common.logWrite('list: ' + filtered.map( item => item.name).join(', '));
          }
          if ( opt.options.verbose ) {
            common.logWrite(JSON.stringify(filtered, null, 2));
          }
        }
        else {
          common.logWrite('No API products containing %s: %d', opt.options.proxy);
        }
        return Promise.resolve(true);
      });
  })
  .catch( e => console.error('error: ' + util.format(e) ) );
