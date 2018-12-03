// reference.js
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
  const utility     = require('./utility.js'),
        common      = require('./common.js'),
        promiseWrap = require('./promiseWrap.js'),
        fs          = require('fs'),
        request     = require('request'),
        urljoin     = require('url-join'),
        sprintf     = require('sprintf-js').sprintf;

  function Reference(conn) {  this.conn = conn; }

  Reference.prototype.get = promiseWrap(function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/e/:env/references
    // GET :mgmtserver/v1/o/:orgname/e/:env/references/:name
    var conn = this.conn;
    if ( ! cb) { cb = options; options = {}; }
    var env = options.environment.name || options.environment;
    if ( ! env)  {
      return cb(new Error('missing environment'));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      var name = options.name || options.keystore;
      requestOptions.url = (name)?
        urljoin(conn.urlBase, 'e', env, 'references', name) :
        urljoin(conn.urlBase, 'e', env, 'references');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  });

  Reference.prototype.create = promiseWrap(function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/e/:env/references
    var conn = this.conn;
    var env = options.environment.name || options.environment;
    var name = options.name || options.reference;
    if ( ! env ) {
      return cb(new Error('missing environment'));
    }
    if ( ! name ) {
      return cb(new Error('missing reference name'));
    }
    if ( ! options.refers ) {
      return cb(new Error('missing refers option'));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'references');
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({
        name : name,
        refers : options.refers,
        resourceType : options.resourceType || 'KeyStore'
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200, 201], cb));
    });
  });

  Reference.prototype.del = promiseWrap(function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/references/:reference
    // Authorization: :edge-auth
    var conn = this.conn;
    var env = options.environment.name || options.environment;
    var name = options.name || options.reference;
    if ( ! env ) {
      return cb({error:"missing environment"});
    }
    if ( ! name ) {
      return cb({error:"missing reference name"});
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'references', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  });

  module.exports = Reference;

}());
