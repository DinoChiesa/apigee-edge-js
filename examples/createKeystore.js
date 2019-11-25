#! /usr/local/bin/node
/*jslint node:true */
// createKeystore.js
// ------------------------------------------------------------------
// provision a keystore with a key and cert in Apigee Edge, and create a reference
// to it. Or, provision a keystore as truststore, and upload a cert to it.
//
// example usage:
// node ./createKeystore.js -v -n -o $ORG -s $KEYSTORE -e $ENV -k ./dchiesa.net.key  -c ./dchiesa.net.cert -a alias1
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
// last saved: <2019-November-25 08:50:11>

const edgejs     = require('apigee-edge-js'),
      fs         = require('fs'),
      util       = require('util'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20191125-0850',
      getopt     = new Getopt(common.commonOptions.concat([
        ['e' , 'environment=ARG', 'required. environment in which the keystore will be created'],
        ['s' , 'keystore=ARG', 'optional. name of the keystore to create. default: a generated random name'],
        ['c' , 'certfile=ARG', 'required. path to the cert file'],
        ['a' , 'alias=ARG', 'required. alias for the key'],
        ['k' , 'keyfile=ARG', 'optional. path to the key file (PEM format)'],
        ['P' , 'keypassword=ARG', 'optional. password for the RSA Key'],
        ['R' , 'reference=ARG', 'optional. reference to create or update']
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Keystore/Truststore creation tool, version: ' + version + '\n' +
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
  // contrive a name
  opt.options.keystore = new Date().toISOString(). replace(/-/g, '').substring(0,8) + '-' +
    Math.random().toString(36).substring(2, 15);
  common.logWrite('using keystore: %s', opt.options.keystore);
}

if ( opt.options.keyfile ) {
  if (!fs.existsSync(opt.options.keyfile))  {
    console.log('You must specify a path to a valid file for the keyfile');
    getopt.showHelp();
    process.exit(1);
  }
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
apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    if (opt.options.verbose) {
      common.logWrite('connected');
    }
    const options = {
            environment : opt.options.environment,
            name : opt.options.keystore
          };
    return org.keystores.create(options)
      .then( result => {
        if (opt.options.verbose) {
          common.logWrite('created keystore %s', opt.options.keystore);
        }
        options.certFile = opt.options.certfile;
        options.alias = opt.options.alias;
        if ( opt.options.keyfile ) {
          options.keyFile = opt.options.keyfile;
          if (opt.options.keypassword) {
            options.keyPassword = opt.options.keypassword;
          }
        }
        return org.keystores.importCert(options)
          .then(result => {
            if (opt.options.verbose) {
              common.logWrite('%scert stored.', ( opt.options.keyfile) ? "key and " :"");
            }
            if ( ! opt.options.reference) {
              const o = {
                      org: org.conn.orgname,
                      env: opt.options.environment,
                      keystore: opt.options.keystore,
                      ref: '-none-',
                      now: (new Date()).toISOString()
                    };
              if ( opt.options.keyfile ) {
                o.keyalias = opt.options.alias;
              }
              console.log('\nsummary: ' + JSON.stringify(o, null, 2));
              return Promise.resolve(true);
            }
            const options = {
                    name : opt.options.reference,
                    refers : opt.options.keystore,
                    environment : opt.options.environment
                  };
            return org.references.createOrUpdate(options)
              .then( result => {
                if (opt.options.verbose) {
                  common.logWrite('reference %s created or updated.', opt.options.reference);
                  const o = {
                          org: org.conn.orgname,
                          env: opt.options.environment,
                          keystore: opt.options.keystore,
                          ref: opt.options.reference,
                          now: (new Date()).toISOString()
                        };
              if ( opt.options.keyfile ) {
                o.keyalias = opt.options.alias;
              }
                  console.log('\nsummary: ' + JSON.stringify(o, null, 2));
                }
              });
          });
      });
  })
  .catch(e => console.log(util.format(e)));
