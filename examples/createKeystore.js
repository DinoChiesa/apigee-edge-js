#! /usr/local/bin/node
/*jslint node:true */
// createKeystore.js
// ------------------------------------------------------------------
// provision a keystore with a key and cert in Apigee Edge
// ex:
// node ./createKeystore.js -v -n -o amer-demo4 -s ks1 -e test -k ./dchiesa.net.key  -c ./dchiesa.net.cert -a alias1
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
// last saved: <2018-May-31 16:41:19>

const edgejs = require('apigee-edge-js'),
      fs = require('fs'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20180619-0825',
    getopt = new Getopt(common.commonOptions.concat([
      ['s' , 'keystore=ARG', 'required. name of the keystore to create'],
      ['k' , 'keyfile=ARG', 'required. path to the key file (PEM format)'],
      ['c' , 'certfile=ARG', 'required. path to the cert file'],
      ['e' , 'environment=ARG', 'required. environment in which the keystore will be created'],
      ['a' , 'alias=ARG', 'required. alias for the key'],
      ['P' , 'keypassword=ARG', 'optional. password for the RSA Key']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Keystore creation tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.environment ) {
  console.log('You must specify an environment');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.keystore ) {
  console.log('You must specify a keystore');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.keyfile || !fs.existsSync(opt.options.keyfile) ) {
  console.log('You must specify a path to a key file');
  getopt.showHelp();
  process.exit(1);
}
if ( !opt.options.certfile || !fs.existsSync(opt.options.certfile) ) {
  console.log('You must specify a path to a cert file');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.alias ) {
  console.log('You must specify an alias');
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
    process.exit(1);
  }
  common.logWrite('connected');

  var options = {
        environment : opt.options.environment,
        name : opt.options.keystore
      };
  org.keystores.create(options, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      //console.log(e.stack);
      process.exit(1);
    }
    common.logWrite('ok. created');
    options.certFile = opt.options.certfile;
    options.keyFile = opt.options.keyfile;
    options.alias = opt.options.alias;
    if (opt.options.keypassword) {
      options.keyPassword = opt.options.keypassword;
    }
    org.keystores.importCert(options, function(e, result){
      if (e) {
        common.logWrite(JSON.stringify(e, null, 2));
        common.logWrite(JSON.stringify(result, null, 2));
        //console.log(e.stack);
        process.exit(1);
      }
      common.logWrite('ok. key and cert stored.');
    });
  });
});
