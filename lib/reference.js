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

  function getRef(conn, options, cb) {
    const env = (options.environment)? (options.environment.name || options.environment): options.environment;
    if ( ! env)  {
      return cb(new Error('missing environment'));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      const name = options.name || options.keystore;
      requestOptions.url = (name)?
        urljoin(conn.urlBase, 'e', env, 'references', name) :
        urljoin(conn.urlBase, 'e', env, 'references');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, cb);
    });
  }

  Reference.prototype.get = promiseWrap(function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/e/:env/references
    // -or-
    // GET :mgmtserver/v1/o/:orgname/e/:env/references/:name
    const conn = this.conn;
    return getRef(conn, options, common.callback(conn, [200], cb));
  });

  function createOrUpdate(conn, options, action, cb){
    // POST :mgmtserver/v1/o/:ORG/e/:ENV/references/
    //-or-
    // PUT :mgmtserver/v1/o/:ORG/e/:ENV/references/:REF
    const env = (options.environment)? (options.environment.name || options.environment): options.environment,
          name = options.name || options.reference;
    if ( ! env ) {
      return cb(new Error('missing environment'));
    }
    if ( ! name ) {
      return cb(new Error('missing reference name'));
    }
    if ( ! options.refers ) {
      return cb(new Error('missing refers option'));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'references');
      if (action == 'put') {
        requestOptions.url += '/' + name;
      }
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({
        name,
        refers : options.refers,
        resourceType : options.resourceType || 'KeyStore'
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('%s %s', action.toUpperCase(), requestOptions.url));
      }
      request[action](requestOptions, common.callback(conn, [200, 201], cb));
      // request[action](requestOptions, function(error, response, body) {
      //   let util = require('util');
      //   console.log('status: ' + response.statusCode);
      //   console.log('response: ' + util.format(body));
      //   let fn = common.callback(conn, [200, 201], cb);
      //   return fn(error, response, body);
      // });
    });
 }

  Reference.prototype.update = promiseWrap(function(options, cb) {
    return createOrUpdate(this.conn, options, 'put', cb);
  });

  Reference.prototype.create = promiseWrap(function(options, cb) {
    return createOrUpdate(this.conn, options, 'post', cb);
  });

  Reference.prototype.createOrUpdate = promiseWrap(function(options, cb) {
    const conn = this.conn,
          env = (options.environment)? (options.environment.name || options.environment): options.environment,
          name = options.name || options.reference,
          options2 = { name, environment : env };
    return getRef(conn, options2, function(error, response, body) {
      if (error && response.statusCode != 404) {
        utility.logWrite(error);
        return cb(error, body);
      }
      body = JSON.parse(body);
      const action =
        (response.statusCode != 404 && (body.name == name)) ? 'put':'post';
      return createOrUpdate(conn, options, action, cb);
    });
  });

  Reference.prototype.del = promiseWrap(function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/references/:reference
    // Authorization: :edge-auth
    const conn = this.conn,
          env = (options.environment)? (options.environment.name || options.environment): options.environment,
          name = options.name || options.reference;
    if ( ! env ) {
      return cb({error:"missing environment"});
    }
    if ( ! name ) {
      return cb({error:"missing reference name"});
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'references', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  });

  module.exports = Reference;

}());
