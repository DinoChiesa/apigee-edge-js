// removeProxyFromApiProduct.js
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
// last saved: <2019-February-11 13:06:24>
/* global process */

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      version    = '20190211-1305',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'proxy =ARG', 'Required. the proxy to remove.'],
        ['D' , 'product =ARG', 'Required. the product from which to remove the proxy.']
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
  'Apigee Edge removeProxyFromApiProduct.js tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.proxy ) {
  console.log('You must specify a proxy to remove');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.product ) {
  console.log('You must specify a product to alter');
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  handleError(e);
  common.logWrite('searching...');
  org.products.get({name:opt.options.product}, function(e, apiproduct) {
    handleError(e);
    if (apiproduct.proxies.indexOf(opt.options.proxy) >= 0) {
      common.logWrite('removing proxy %s from product %s', opt.options.proxy, opt.options.product);
      var proxies = apiproduct.proxies.filter( (x) => ( x !== opt.options.proxy ));
      apiproduct.proxies = proxies;
      org.products.update(apiproduct, function(e, result) {
        handleError(e);
        common.logWrite('OK');
      });
    }
    else {
      common.logWrite('product %s is not authorized for proxy %s', opt.options.product, opt.options.proxy);
    }
  });
});
