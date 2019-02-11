#! /usr/local/bin/node
/*jslint node:true */
// revokeOrApprove.js
// ------------------------------------------------------------------
// Revoke a developer, app, credential, or product-on-credential.
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
// last saved: <2019-February-11 13:01:59>

const edgejs   = require('apigee-edge-js'),
    common     = edgejs.utility,
    apigeeEdge = edgejs.edge,
    Getopt     = require('node-getopt'),
    version    = '20190211-1301',
    getopt     = new Getopt(common.commonOptions.concat([
      ['d' , 'developer=ARG', 'optional. the email of the developer to revoke.'],
      ['a' , 'app=ARG', 'optional. the developer app to revoke.'],
      ['k' , 'key=ARG', 'optional. the key (credential) to revoke.'],
      ['p' , 'product=ARG', 'optional. the product within the key to revoke.'],
      ['A' , 'approve', 'optional. use this flag to approve the product, key, app or developer.'],
      ['R' , 'revoke', 'optional. use this flag to revoke the product, key, app or developer.']
    ])).bindHelp();

var action = null;

function handleError(e) {
    if (e) {
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

// ========================================================

console.log(
  'Edge API product/key/dev/app revoker/approver tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

// Lots of valid combinations:
// can specify:
// - developer
// - developer and app
// - developer and app and key (over constrained)
// - developer and key (over constrained)
// - developer and app and key and product
// - key - must find the developer and app first
//
// Each one requires a slightly different workflow.
//

if ( opt.options.approve && opt.options.revoke) {
  common.logWrite('Specify one of -A or -R');
  getopt.showHelp();
  process.exit(1);
}
if ( opt.options.approve) {
  action = 'approve';
}
if ( opt.options.revoke) {
  action = 'revoke';
}
if ( ! action) {
  common.logWrite('Specify one of -A or -R');
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  handleError(e);

  if ( opt.options.key ) {
    // revoking the key (credential) or a product under a key
    let options = { key : opt.options.key };
    if ( opt.options.product ) {
      // revoke a product under a specific credential
      options.apiproduct = opt.options.product;
    }

    if ( ! opt.options.developer ) {
      // revoke / approve the key, or the single product under the key
      org.appcredentials[action](options, function(e, result){
        handleError(e);
        if ( ! result) {
          common.logWrite('not found?');
        }
        else {
          common.logWrite('ok');
        }
      });
    }
    else {
      // The user specified both the key and the developer, let's make
      // sure they're consistent before performing the action.
      org.appcredentials.find({key:opt.options.key}, function(e, found){
        handleError(e);
        if ( ! found) {
          return common.logWrite('That key was not found.');
        }
        if (found.developer.email != opt.options.developer) {
          return common.logWrite('Error: mismatch between expected and actual developer.');
        }
        org.appcredentials[action](options, function(e, result){
          handleError(e);
          common.logWrite('ok');
        });
      });
    }
  }

  else if (opt.options.developer) {
    // revoking the developer or the app
    let options = { developer:opt.options.developer };

    if ( ! opt.options.app ) {
      // revoke / approve the developer
      org.developers[action](options, function(e, result){
        handleError(e);
        common.logWrite('ok');
      });
    }
    else {
      // revoke / approve the developer app (all keys)
      options.app = opt.options.app;
      org.developerapps[action](options, function(e, result){
        handleError(e);
        common.logWrite('ok');
      });
    }
  }
});
