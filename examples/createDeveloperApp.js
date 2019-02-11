#! /usr/local/bin/node
/*jslint node:true */
// createDeveloperApp.js
// ------------------------------------------------------------------
// provision a developer app for an API Product in Apigee Edge
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
// last saved: <2019-February-11 12:56:29>

const edgejs            = require('apigee-edge-js'),
      common            = edgejs.utility,
      apigeeEdge        = edgejs.edge,
      sprintf           = require('sprintf-js').sprintf,
      Getopt            = require('node-getopt'),
      version           = '20190211-1256',
      defaults          = { expiry : '180d' },
      getopt            = new Getopt(common.commonOptions.concat([
        ['p' , 'product=ARG', 'name of the API product to enable on this app'],
        ['E' , 'email=ARG', 'email address of the developer for which to create the app'],
        ['A' , 'appname=ARG', 'name for the app'],
        ['a' , 'attr=ARG+' , 'attributes for the app, in N:V form. Can provide multiple.'],
        ['x' , 'expiry=ARG', 'expiry for the credential. default: ' + defaults.expiry ]
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Developer App creation tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.appname ) {
  console.log('You must specify a name of an app');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.product ) {
  console.log('You must specify an API Product');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.email ) {
  console.log('You must specify an email address');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    common.logWrite(JSON.stringify(result, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  var options = {
        developerEmail : opt.options.email,
        appName : opt.options.appname,
        apiProduct : opt.options.product,
        attributes : {},
        expiry : opt.options.expiry || defaults.expiry
      };

  if (opt.options.attr) {
    opt.options.attr.forEach( (attr) => {
      var parts = attr.split(':');
      if (parts.length == 2) {
        options.attributes[parts[0]] = parts[1];
      }
      else {
        common.logWrite("mis-formatted attribute: " + attr);
      }
    });
  }

  org.developerapps.create(options, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      //console.log(e.stack);
      process.exit(1);
    }
    common.logWrite(sprintf('ok. app name: %s', result.name));
    common.logWrite(sprintf('apikey %s', result.credentials[0].consumerKey));
    common.logWrite(sprintf('secret %s', result.credentials[0].consumerSecret));
  });

});
