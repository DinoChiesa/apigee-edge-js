// developer.js
// ------------------------------------------------------------------
// Copyright 2018 Google LLC.
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
/* global process */

(function (){
    'use strict';
    const utility     = require('./utility.js'),
          common      = require('./common.js'),
          promiseWrap = require('./promiseWrap.js'),
          request     = require('request'),
          urljoin     = require('url-join'),
          sprintf     = require('sprintf-js').sprintf;
  
    function Company(conn) { this.conn = conn; }
  
    Company.prototype.create = promiseWrap(function(options, cb) {
      // POST :mgmtserver/v1/o/:orgname/companies
      // Authorization: :edge-auth
      // Content-type: application/json
      //
      // {
      //   "attributes": [ {
      //     "name" : "tag1",
      //     "value" : "whatever you like" }],
      //   "name": "myAwesomeCompany",
      //   "displayName": "my Awesome Company"
      // }
      var conn = this.conn;
      if ( !options.name || !options.displayName ) {
        return cb(new Error("missing required inputs, one of {name: displayName}"));
      }

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('Create Company %s', name));
      }
      common.insureFreshToken(conn, function(requestOptions) {
        requestOptions.headers['content-type'] = 'application/json';
        requestOptions.url = urljoin(conn.urlBase, 'companies');
            body = {
                
                    name : options.name,
                    displayName : options.displayName
                  
            }

            if (options.attributes){
                body.attributes = devAttributes;
            }
            
        requestOptions.body = JSON.stringify(body);
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('POST %s', requestOptions.url));
        }
        //request.debug = true;
        request.post(requestOptions, common.callback(conn, [201], cb));
      });
    });
  
    Company.prototype.get = promiseWrap(function(options, cb) {
      var conn = this.conn;
      if ( ! cb) { cb = options; options = {}; }
      common.insureFreshToken(conn, function(requestOptions) {
        var discriminator = options.name || options.displayName;
        requestOptions.url = (discriminator) ?
          urljoin(conn.urlBase, 'companies', discriminator) :
          urljoin(conn.urlBase, 'companies');
  
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('GET %s', requestOptions.url));
        }
        request.get(requestOptions, common.callback(conn, [200], cb));
      });
    });
  

    module.exports = Company;
  
  }());
  