// environment.js
// ------------------------------------------------------------------
// Copyright 2018-2022 Google LLC.
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

const common      = require('./common.js'),
      utility     = require('./utility.js'),
      promiseWrap = require('./promiseWrap.js'),
      urljoin     = require('url-join'),
      sprintf     = require('sprintf-js').sprintf,
      request     = require('request');

function Environment(conn) {this.conn = conn;}

function internalGetEnvironments(conn, options, cb) {
  common.insureFreshToken(conn, function(requestOptions) {
    const name = options.environmentName || options.environment || options.name || options.env;
    requestOptions.url = (name) ?
      urljoin(conn.urlBase, 'environments', name):
      urljoin(conn.urlBase, 'environments') ;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], function(e, result){
      //if ( ! e) {conn.environments = result;} // cache
      cb(e, result);
    }));
  });
}

Environment.prototype.get = promiseWrap(function(options, cb) {
  if ( ! cb) { cb = options; options = {}; }
  var conn = this.conn;
  if (conn.verbosity>0) {
    utility.logWrite('get environments');
  }
  internalGetEnvironments(conn, options, cb);
});

const inquireVhost = function(conn, vhost, options, cb) {
        const env = options.environmentName || options.environment || options.env;
        if (!env) {
          throw new Error("missing environment name");
        }
        if (conn.verbosity>0) {
          const label = (options.vhost) ? ('vhost ' + vhost): 'vhosts';
          utility.logWrite(`get ${label}`);
        }
        common.insureFreshToken(conn, function(requestOptions) {
          requestOptions.url = (vhost) ?
            urljoin(conn.urlBase, 'environments', env, 'virtualhosts', vhost):
            urljoin(conn.urlBase, 'environments', env, 'virtualhosts');
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('GET %s', requestOptions.url));
          }
          request.get(requestOptions, common.callback(conn, [200], cb));
        });
      };

Environment.prototype.getVhosts = promiseWrap(function(options, cb) {
  let conn = this.conn,
      vhost = options.vhost || options.vhostName || options.virtualhost || options.name;
  if (vhost) {
    throw new Error("you must not specify a vhost name");
  }
  return inquireVhost(conn, null, options, cb);
});

Environment.prototype.getVhost = promiseWrap(function(options, cb) {
  let conn = this.conn,
      vhost = options.vhost || options.vhostName || options.virtualhost || options.name;
  if ( ! vhost) {
    throw new Error("missing vhost name");
  }
  return inquireVhost(conn, vhost, options, cb);
});

Environment.prototype.deleteVhost = promiseWrap(function(options, cb) {
  // DELETE  /v1/o/ORG/e/ENV/virtualhosts/VHOST
  const conn = this.conn,
        vhost = options.vhost || options.vhostName || options.virtualhost || options.name,
        env = options.environmentName || options.environment || options.env;
  if (!env) {
    throw new Error("missing environment name");
  }
  if ( ! vhost) {
    throw new Error("missing vhost name");
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, 'environments', env, 'virtualhosts', vhost);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, common.callback(conn, [200], cb));
  });
});

Environment.prototype.createVhost = promiseWrap(function(options, cb) {
  // POST  /v1/o/ORG/e/ENV/virtualhosts
  //  {
  //   "sSLInfo": {
  //     "protocols": [],
  //     "keyStore": "dino1",
  //     "keyAlias": "freetrial",
  //     "ignoreValidationErrors": false,
  //     "enabled": "true",
  //     "clientAuthEnabled": "false",
  //     "ciphers": []
  //   },
  //   "port": "9190",
  //   "name": "secure",
  //   "interfaces": [],
  //   "hostAliases": [
  //     "myhostname.dino.net"
  //   ]
  // }
  const conn = this.conn,
        vhost = options.vhost || options.vhostName || options.virtualhost || options.name,
        env = options.environmentName || options.environment || options.env;
  if (!env) {
    throw new Error("missing environment name");
  }
  if ( ! vhost) {
    throw new Error("missing vhost name");
  }
  if ( options.port && options.port != 443) {
    throw new Error("invalid port number");
  }
  if ( !options.aliases) {
    throw new Error("missing host aliases");
  }
  if ( !options.keyStore) {
    throw new Error("missing keyStore");
  }
  if ( !options.keyAlias) {
    throw new Error("missing keyAlias");
  }

  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, 'environments', env, 'virtualhosts');
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('POST %s', requestOptions.url));
    }
    const sslinfo = {
            keyStore : options.keyStore,
            trustStore : options.trustStore,
            keyAlias : options.keyAlias,
            enabled : true,
            ignoreValidationErrors : false,
            ciphers : options.ciphers,
            protocols : options.protocols
          };
    sslinfo.clientAuthEnabled = (options.trustStore) ? true : false;
    const payload = {
            port: options.port || 443,
            name: vhost,
            hostAliases: options.aliases,
            sSLInfo : sslinfo
          };
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.body = JSON.stringify(payload);
    request.post(requestOptions, common.callback(conn, [200, 201], cb));
  });
});

module.exports = Environment;
