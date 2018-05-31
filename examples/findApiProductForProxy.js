// findApiProductForProxy.js
// ------------------------------------------------------------------
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
// created: Mon Mar 20 09:57:02 2017
// last saved: <2018-May-31 16:38:28>

var edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    Getopt = require('node-getopt'),
    version = '20171207-1807',
    getopt = new Getopt(common.commonOptions.concat([
      ['P' , 'proxy=ARG', 'Required. the proxy to find.'],
      ['T' , 'notoken', 'Optional. do not try to obtain a login token.']
    ])).bindHelp();

function handleError(e) {
    if (e) {
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

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

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      no_token: opt.options.notoken,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org) {
  handleError(e);
  common.logWrite('searching...');
  org.products.get({expand:true}, function(e, result) {
    handleError(e);
    var apiproducts = result.apiProduct;
    common.logWrite('total count of API products for that org: %d', apiproducts.length);
    var filtered = apiproducts.filter(function(product) {
          return (product.proxies.indexOf(opt.options.proxy) >= 0);
        });

    if (filtered) {
      common.logWrite('count of API products containing %s: %d', opt.options.proxy, filtered.length);
      if (filtered.length) {
        common.logWrite('list: ' + filtered.map( function(item) { return item.name;}).join(', '));
      }
      if ( opt.options.verbose ) {
        common.logWrite(JSON.stringify(filtered, null, 2));
      }
    }

  });
});
