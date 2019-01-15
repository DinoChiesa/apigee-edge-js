// targetserver.js
// ------------------------------------------------------------------
// Copyright 2018-2019 Google LLC.
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
        request     = require('request'),
        urljoin     = require('url-join'),
        sprintf     = require('sprintf-js').sprintf;

  function TargetServer(conn) { this.conn = conn; }

  TargetServer.prototype.get = promiseWrap(function(options, cb) {
    // GET :mgmtserver/v1/o/:org/e/:env/targetservers
    // or
    // GET :mgmtserver/v1/o/:org/e/:env/targetservers/:targetserver
    if ( ! cb) { cb = options; options = {}; }
    var env = options.environment || options.env;
    if ( ! env) {
      return cb(new Error('missing required parameter: environment'));
    }
    var conn = this.conn;

    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'e', env, 'targetservers', options.name) :
        urljoin(conn.urlBase, 'e', env, 'targetservers') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  });

  function enableOrDisable(conn, wantEnable, params, cb){
    let name = params.name;
    if ( ! name) {
      return cb(new Error('missing required parameter: name'));
    }
    let checkOptions = {
          environment : params.environment,
          name: name
        };
    // insure the targetserver exists
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', params.environment, 'targetservers', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], function(e, target) {
        if (e || !target || (target.code && target.message)) {
          cb(e || new Error('not found'), target);
        }
        target.isEnabled = wantEnable;
        conn.org.targetservers.update({environment:params.environment, target:target}, cb);
      }));
    });
  }

  TargetServer.prototype.enable = promiseWrap(function(options, cb) {
    let conn = this.conn;
    enableOrDisable(conn, true, options, cb);
  });

  TargetServer.prototype.disable = promiseWrap(function(options, cb) {
    let conn = this.conn;
    enableOrDisable(conn, false, options, cb);
  });

  TargetServer.prototype.update = promiseWrap(function(options, cb) {
    // PUT :mgmtserver/v1/o/:org/e/:env/targetservers/:targetserver
    // {
    //   "name" : "{target}",
    //   "host" : "{hostname}",
    //   "isEnabled" : {true | false},
    //   "port" : {port_num},
    //   "sSLInfo": {
    //       "enabled": "true | false",
    //       "clientAuthEnabled": "true | false",
    //       "keyStore": "{keystore_name}",
    //       "trustStore": "{truststore_name}",
    //       "keyAlias": "{key_alias}",
    //       "ignoreValidationErrors": "true | false",
    //       "ciphers": [ "{cipher_1}", "{cipher_2}", ... ],
    //       "protocols": [ "{protocol_1}", "{protocol_2}", ...]
    //     }
    //  }
    var env = options.environment || options.env;
    if ( ! env) {
      return cb(new Error('missing required parameter: environment'));
    }
    var payload = options.targetserver || options.target;
    if ( ! payload) {
      return cb(new Error('missing required parameter: target'));
    }
    if ( ! payload.name) {
      return cb(new Error('missing: target.name'));
    }
    if ( ! payload.host) {
      return cb(new Error('missing: target.host'));
    }
    var conn = this.conn;
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'targetservers', payload.name);
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify(payload);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('PUT %s', requestOptions.url));
      }
      request.put(requestOptions, common.callback(conn, [200], cb));
    });
  });

  TargetServer.prototype.del = promiseWrap(function(options, cb) {
    // DELETE :mgmtserver/v1/o/:org/e/:env/targetservers/:targetserver
    var conn = this.conn;
    var env = options.environment || options.env;
    if ( ! env) {
      return cb(new Error('missing required parameter: environment'));
    }
    if ( ! options.name) {
      return cb(new Error('missing required parameter: name'));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'targetservers', options.name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  });

  TargetServer.prototype.create = promiseWrap(function(options, cb) {
    // POST :mgmtserver/v1/o/:org/e/:env/targetservers
    // {
    //   "name" : "{target}",
    //   "host" : "{hostname}",
    //   "isEnabled" : {true | false},
    //   "port" : {port_num},
    //   "sSLInfo": {
    //       "enabled": "true | false",
    //       "clientAuthEnabled": "true | false",
    //       "keyStore": "{keystore_name}",
    //       "trustStore": "{truststore_name}",
    //       "keyAlias": "{key_alias}",
    //       "ignoreValidationErrors": "true | false",
    //       "ciphers": [ "{cipher_1}", "{cipher_2}", ... ],
    //       "protocols": [ "{protocol_1}", "{protocol_2}", ...]
    //     }
    //  }
    var env = options.environment || options.env;
    if ( ! env) {
      return cb(new Error('missing required parameter: environment'));
    }
    var payload = options.targetserver || options.target;
    if ( ! payload) {
      return cb(new Error('missing required parameter: target'));
    }
    if ( ! payload.name) {
      return cb(new Error('missing: target.name'));
    }
    if ( ! payload.host) {
      return cb(new Error('missing: target.host'));
    }
    var conn = this.conn;
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'targetservers');
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify(payload);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  });

  module.exports = TargetServer;

}());
