// environment.js
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


(function (){
  'use strict';
  const common  = require('./common.js'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf,
        request = require('request'),
        utility = require('./utility.js');

  function Environment(conn) {this.conn = conn;}

  function internalGetEnvironments(conn, options, cb) {
    // if (conn.environments) {
    //   return cb(null, conn.environments);
    // }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'e', options.name):
        urljoin(conn.urlBase, 'e') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], function(e, result){
        //if ( ! e) {conn.environments = result;} // cache
        cb(e, result);
      }));
    });
  }

  Environment.prototype.get = function(options, cb) {
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite('get environments');
    }
    internalGetEnvironments(conn, options, cb);
  };

  Environment.prototype.getVhosts = function(options, cb) {
    var conn = this.conn;
    var name = options.environmentName || options.environment || options.name;
    if (!name) {
      throw new Error("missing environment name");
    }
    if (conn.verbosity>0) {
      utility.logWrite('get vhosts');
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.vhost) ?
        urljoin(conn.urlBase, 'e', name, 'virtualhosts', options.vhost):
        urljoin(conn.urlBase, 'e', name, 'virtualhosts');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = Environment;

}());
