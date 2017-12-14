#! /usr/local/bin/node
/*jslint node:true */
// provisionApiProduct.js
// ------------------------------------------------------------------
// provision an Apigee Edge API Product
//
// Copyright 2017 Google Inc.
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
// last saved: <2017-December-13 16:56:15>

var edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20171206-1242',
    getopt = new Getopt(common.commonOptions.concat([
      ['p' , 'proxy=ARG', 'Required. name of API proxy to include in the API Product'],
      ['N' , 'productname=ARG', 'Required. name for API product'],
      ['A' , 'approvalType=ARG', 'Optional. either manual or auto. (default: auto)'],
      ['S' , 'scopes=ARG', 'Optional. comma-separated list of possible scopes for the API product'],
      ['e' , 'env=ARG', 'Optional. the Edge environment on which to enable the Product (default: all)'],
      ['T' , 'notoken', 'optional. do not try to get a authentication token.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Product Provisioning tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.proxy ) {
  console.log('You must specify a proxy');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.productname ) {
  console.log('You must specify a name for the API Product');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      no_token: opt.options.notoken,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    common.logWrite(JSON.stringify(result, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  var options = {
        productName: opt.options.productname,
        proxy: opt.options.proxy,
        environments: opt.options.env,
        approvalType : opt.options.approvalType || "auto", //|| manual
        //attributes: { "key1": "value1", "key2": "XYZ123"}
      };

  if (opt.options.scopes) {
    options.scopes = opt.options.scopes.split(',').trim();
  }

  org.products.create(options, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      //console.log(e.stack);
      process.exit(1);
    }
    common.logWrite(sprintf('ok. product name: %s', result.name));
  });
});
