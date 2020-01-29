#! /usr/local/bin/node
/*jslint node:true */
// addAppCredential.js
// ------------------------------------------------------------------
// add a new credential, generated or explicitly specified, to a developer app in Apigee Edge.
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
// last saved: <2020-January-28 18:08:53>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      util       = require('util'),
      version    = '20200128-1607',
      getopt     = new Getopt(common.commonOptions.concat([
      ['p' , 'product=ARG', 'required. name of the API product to enable on this app'],
      ['E' , 'email=ARG', 'required. email address of the developer for which to create the app'],
      ['A' , 'appname=ARG', 'required. name for the app'],
      ['I' , 'clientid=ARG', 'optional. the client id for this credential. Default: auto-generated.'],
      ['S' , 'secret=ARG', 'optional. the client secret for this credential. Default: auto-generated.'],
      ['x' , 'expiry=ARG', 'optional. expiry for the credential']
    ])).bindHelp();

function randomString(L){
  L = L || 44;
  let s = '';
  do {s += Math.random().toString(36).substring(2, 15); } while (s.length < L);
  return s.substring(0,L);
}

function addCred(org, options) {
  return org.appcredentials.add(options)
    .then (result => {
      if (opt.options.clientid) {
        common.logWrite(sprintf('new apikey %s', result.consumerKey));
        common.logWrite(sprintf('secret %s', result.consumerSecret));
      }
      else {
        common.logWrite(sprintf('new apikey %s', result.credentials[0].consumerKey));
        common.logWrite(sprintf('secret %s', result.credentials[0].consumerSecret));
      }
    });
}

function ensureAppExists(org, options) {
  //require('request').debug = true;
  return org.developerapps.get(options)
    .then(app => ({app, isNew:false}))
    .catch( async e => {
      let s = String(e);
      if (s == "Error: bad status: 404") {
        common.logWrite('That app does not exist.... creating it.');
        let app = await org.developerapps.create(options);
        //console.log(util.format(app));
        let options2 = {
              consumerKey : app.credentials[0].consumerKey,
              appName : opt.options.appname,
              developerEmail : opt.options.email
            };
        // delete the implicitly generated credential
        return org.appcredentials.del(options2)
          .then( _ => ( {app, isNew:true} ) );
      }
      else {
        console.error('error: ' + util.format(e) );
        return Promise.reject(e);
      }
    });
}

// ========================================================

console.log(
  'Apigee Edge App Credential tool, version: ' + version + '\n' +
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

if ( !opt.options.clientid ) {
  console.log('You must specify a clientid');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.email ) {
  console.log('You must specify an email address');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt))
  .then ( org => {
    common.logWrite('connected');
    return org.developers.get({ developerEmail : opt.options.email })
      .then( dev => {
        let options = {
              developerEmail : opt.options.email,
              appName : opt.options.appname,
              apiProduct : opt.options.product.split(','),
              expiry : opt.options.expiry
            };
        return ensureAppExists(org, options)
          .then(({app, isNew}) => {
            if (opt.options.clientid) {
              options.clientId = opt.options.clientid;
              options.clientSecret = opt.options.secret || randomString();
              if (opt.options.expiry) {
                common.logWrite('WARNING: expiry is not supported with an explicitly-supplied client id and secret');
              }
            }
            if (opt.options.clientid || isNew) {
              return addCred(org, options);
            }
            common.logWrite('app %s', util.format(app));
            return app;
          })
      })
      .catch( e => {
        let s = String(e);
        if (s == "Error: bad status: 404") {
          switch (e.result.code) {
          case "keymanagement.service.InvalidClientIdForGivenApp":
            console.log('That clientId is invalid. Duplicate?');
            break;
          case "developer.service.DeveloperDoesNotExist":
            console.log('That developer does not exist.');
            break;
          default :
            console.log(e.code);
            console.log('Unknown error.');
            break;
          }
        }
        else {
          console.error('error: ' + util.format(e) );
        }
      });
  })
  .catch( e => console.error('error connecting: ' + util.format(e) ) );
