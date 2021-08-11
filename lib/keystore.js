// keystore.js
// ------------------------------------------------------------------
// Copyright 2018-2021 Google LLC.
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
/* jshint esversion:9, node:true, strict:implied */

const utility     = require('./utility.js'),
      common      = require('./common.js'),
      promiseWrap = require('./promiseWrap.js'),
      fs          = require('fs'),
      request     = require('request'),
      urljoin     = require('url-join'),
      sprintf     = require('sprintf-js').sprintf;

function Keystore(conn) {  this.conn = conn; }

Keystore.prototype.get = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/e/:env/keystores
  // GET :mgmtserver/v1/o/:orgname/e/:env/keystores/:name
  if ( ! cb) { cb = options; options = {}; }
  let conn = this.conn,
      env = (options.environment) ? (options.environment.name || options.environment) : options.environment;
  if ( ! env)  {
    return cb({error:"missing environment"});
  }
  common.insureFreshToken(conn, function(requestOptions) {
    var name = options.name || options.keystore;
    requestOptions.url = (name)?
      urljoin(conn.urlBase, 'environments', env, 'keystores', name) :
      urljoin(conn.urlBase, 'environments', env, 'keystores');
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

Keystore.prototype.getAlias = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/e/:env/keystores/:name/aliases
  // GET :mgmtserver/v1/o/:orgname/e/:env/keystores/:name/aliases/:alias
  let conn = this.conn,
      env = options.environment.name || options.environment,
      name = options.name || options.keystore;
  if ( ! env ) {
    return cb({error:"missing environment"});
  }
  if ( ! name ) {
    return cb({error:"missing keystore name"});
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, 'environments', env, 'keystores', name, 'aliases');
    if (options.alias) {
      requestOptions.url = urljoin(requestOptions.url, options.alias);
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

Keystore.prototype.create = promiseWrap(function(options, cb) {
  // POST :mgmtserver/v1/o/:orgname/e/:env/keystores
  let conn = this.conn,
      env = options.environment.name || options.environment,
      name = options.name || options.keystore;
  if ( ! env ) {
    return cb({error:"missing environment"});
  }
  if ( ! name ) {
    return cb({error:"missing keystore name"});
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, 'environments', env, 'keystores');
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.body = JSON.stringify({ name : name });
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, common.callback(conn, [200, 201], cb));
  });
});

Keystore.prototype.del = promiseWrap(function(options, cb) {
  // DELETE :mgmtserver/v1/o/:orgname/e/:env/keystores/:keystore
  // Authorization: :apigee-auth
  let conn = this.conn,
      env = options.environment.name || options.environment,
      name = options.name || options.keystore;
  if ( ! env ) {
    return cb({error:"missing environment"});
  }
  if ( ! name ) {
    return cb({error:"missing keystore name"});
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, 'environments', env, 'keystores', name);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, common.callback(conn, [200], cb));
  });
});

Keystore.prototype.importCert = promiseWrap(function(options, cb) {
  // POST :mgmtserver/v1/o/:orgname/e/:env/keystores/:keystore
  // Authorization: :apigee-auth
  let conn = this.conn,
      env = options.environment.name || options.environment,
      name = options.name || options.keystore,
      certData = options.certificate || options.cert;
  if ( ! certData) {
    let certFile = options.certificateFile || options.certFile;
    if (certFile) {
      certData = fs.readFileSync(certFile, 'utf8');
    }
  }
  let keyData = options.key;
  if ( ! keyData) {
    if (options.keyFile) {
      keyData = fs.readFileSync(options.keyFile, 'utf8');
    }
  }
  if ( ! env ) {
    return cb(new Error("missing environment"));
  }
  if ( ! name ) {
    return cb(new Error("missing keystore name"));
  }
  if ( ! options.alias ) {
    return cb(new Error("missing alias name"));
  }
  if ( ! certData ) {
    return cb(new Error("missing certificate"));
  }

  common.insureFreshToken(conn, function(requestOptions) {
    let rando = Math.random().toString(36).slice(2),
        boundary = 'YYY' + rando;
    requestOptions.headers['content-type'] = sprintf('multipart/form-data; boundary="%s"', boundary);
    requestOptions.headers.Accept = 'application/json';
    requestOptions.url =
      urljoin(conn.urlBase, sprintf('environments/%s/keystores/%s/aliases?alias=%s&format=keycertfile',
                                    env, name, options.alias));
    // build the multipart form body
    let bodyLines = [
          '--' + boundary,
          'Content-Disposition: form-data; name="certFile"; filename="file.cert"',
          'Content-Type: application/octet-stream\r\n',
          certData
        ];
    if (keyData) {
      bodyLines.push('--' + boundary);
      bodyLines.push('Content-Disposition: form-data; name="keyFile"; filename="file.key"');
      bodyLines.push('Content-Type: application/octet-stream\r\n');
      bodyLines.push( keyData );
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
    request.post(requestOptions, common.callback(conn, [200, 201], cb));
  });
});

module.exports = Keystore;
