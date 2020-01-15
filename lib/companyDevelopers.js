// companyDevelopers.js
// ------------------------------------------------------------------
// Copyright 2018-2020 Google LLC.
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

    function CompanyDevelopers(conn) { this.conn = conn; }

    CompanyDevelopers.prototype.get = promiseWrap(function(options, cb) {
      let conn = this.conn;
      let companyName = options.company || options.companyName
      if ( !companyName ){
        return cb(new Error("missing companyName"));
      }
      if ( ! cb) { cb = options; options = {}; }
      common.insureFreshToken(conn, function(requestOptions) {
        requestOptions.url = urljoin(conn.urlBase, 'companies', companyName, 'developers');
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('GET %s', requestOptions.url));
        }
        request.get(requestOptions, common.callback(conn, [200], cb));
      });
    });

    module.exports = CompanyDevelopers;

  }());
