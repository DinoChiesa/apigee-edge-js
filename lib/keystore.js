// keystore.js
// ------------------------------------------------------------------
// Copyright 2018 Google Inc.
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
  const utility = require('./utility.js'),
        fs      = require('fs'),
        common  = require('./common.js'),
        request = require('request'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf;

  function Keystore(conn) {  this.conn = conn; }

  Keystore.prototype.get = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/e/:env/keystores
    // GET :mgmtserver/v1/o/:orgname/e/:env/keystores/:name
    var conn = this.conn;
    var env = options.environment.name || options.environment;
    if ( ! env)  {
      return cb({error:"missing environment"});
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      var name = options.name || options.keystore;
      requestOptions.url = (name)?
        urljoin(conn.urlBase, 'e', env, 'keystores', name) :
        urljoin(conn.urlBase, 'e', env, 'keystores');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  Keystore.prototype.getAlias = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/e/:env/keystores/:name/aliases
    // GET :mgmtserver/v1/o/:orgname/e/:env/keystores/:name/aliases/:alias
    var conn = this.conn;
    var env = options.environment.name || options.environment;
    var name = options.name || options.keystore;
    if ( ! env ) {
      return cb({error:"missing environment"});
    }
    if ( ! name ) {
      return cb({error:"missing keystore name"});
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'keystores', name, 'aliases');
      if (options.alias) {
        requestOptions.url = urljoin(requestOptions.url, options.alias);
      }
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  Keystore.prototype.create = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/e/:env/keystores
    var conn = this.conn;
    var env = options.environment.name || options.environment;
    var name = options.name || options.keystore;
    if ( ! env ) {
      return cb({error:"missing environment"});
    }
    if ( ! name ) {
      return cb({error:"missing keystore name"});
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'keystores');
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({ name : name });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200, 201], cb));
    });
  };

  Keystore.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/keystores/:keystore
    // Authorization: :edge-auth
    var conn = this.conn;
    var env = options.environment.name || options.environment;
    var name = options.name || options.keystore;
    if ( ! env ) {
      return cb({error:"missing environment"});
    }
    if ( ! name ) {
      return cb({error:"missing keystore name"});
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'keystores', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  Keystore.prototype.importCert = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/e/:env/keystores/:keystore
    // Authorization: :edge-auth
    var conn = this.conn;
    var env = options.environment.name || options.environment;
    var name = options.name || options.keystore;
    var certFile = options.cert || options.certificate || options.certFile;
    var keyFile = options.key || options.keyFile;
    if ( ! env ) {
      return cb({error:"missing environment"});
    }
    if ( ! name ) {
      return cb({error:"missing keystore name"});
    }
    if ( ! options.alias ) {
      return cb({error:"missing alias name"});
    }
    if ( ! certFile ) {
      return cb({error:"missing certificate"});
    }

    common.mergeRequestOptions(conn, function(requestOptions) {
      var rando = Math.random().toString(36).slice(2);
      var boundary = 'YYY' + rando;
      requestOptions.headers['content-type'] = sprintf('multipart/form-data; boundary="%s"', boundary);
      requestOptions.headers.Accept = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, sprintf('e/%s/keystores/%s/aliases?alias=%s&format=keycertfile',
                                                         env, name, options.alias));
      // build the multipart form body
      var bodyLines = [];
      bodyLines.push('--' + boundary);
      bodyLines.push('Content-Disposition: form-data; name="certFile"; filename="file.cert"');
      bodyLines.push('Content-Type: application/octet-stream\r\n');
      bodyLines.push( fs.readFileSync(certFile, 'utf8') );
      if (options.keyFile) {
        bodyLines.push('--' + boundary);
        bodyLines.push('Content-Disposition: form-data; name="keyFile"; filename="file.key"');
        bodyLines.push('Content-Type: application/octet-stream\r\n');
        bodyLines.push( fs.readFileSync(keyFile, 'utf8') );
        if (options.keyPassword) {
          bodyLines.push('--' + boundary);
          bodyLines.push('Content-Disposition: form-data; name="password"');
          bodyLines.push(options.keyPassword);
        }
      }
      bodyLines.push('--' + boundary + '\r\n');
      requestOptions.body = bodyLines.join('\r\n');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  };

  module.exports = Keystore;

}());
