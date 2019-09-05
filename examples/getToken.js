#! /usr/local/bin/node
/*jslint node:true */
// getToken.js
// ------------------------------------------------------------------
// authenticate, get a token suitable for use with the Apigee Edge Admin API.
//
// Copyright 2019 Google LLC.
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
// last saved: <2019-September-05 15:24:02>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      version    = '20190708-1607',
      getopt     = new Getopt(common.commonOptions).bindHelp();

console.log(
  'Edge Get Token, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    org.conn.getExistingToken()
      .then( existingToken => {
        if (opt.options.verbose) {
          console.log();
        }
        console.log(existingToken.access_token);
        if (opt.options.verbose) {
          let jwt = existingToken.access_token,
              jwtparts = jwt.split(new RegExp('\\.')),
              payload = Buffer.from(jwtparts[1], 'base64').toString('utf-8'),
              claims = JSON.parse(payload);
          console.log( '\nissuer: ' + claims.iss);
          console.log( 'user: ' + claims.user_name);
          console.log( 'issued at: ' + (new Date(claims.iat * 1000)).toISOString());
          console.log( 'expires: ' + (new Date(claims.exp * 1000)).toISOString());
          console.log( 'client_id: ' + claims.client_id);
        }
      });
  })
  .catch( e => console.error('error: ' + e) );
