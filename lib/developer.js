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
        merge       = require('merge'),
        path        = require('path'),
        sprintf     = require('sprintf-js').sprintf;

  function Developer(conn) { this.conn = conn; }

  Developer.prototype.create = promiseWrap(function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/developers
    // Authorization: :edge-auth
    // Content-type: application/json
    //
    // {
    //   "attributes": [ {
    //     "name" : "tag1",
    //     "value" : "whatever you like" }],
    //   "status": "active",
    //   "userName": "test-3a-HiDxfHvHrB",
    //   "lastName": "Martino",
    //   "firstName": "Dino",
    //   "email": "tet-3a-HiDxfHvHrB@apigee.com"
    // }
    var conn = this.conn;
    var email = options.developerEmail || options.email;
    if ( !email || !options.firstName || !options.lastName || !options.userName) {
      return cb(new Error("missing required inputs, one of {email, firstName, lastName, userName}"));
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create Developer %s', email));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'developers');
      var devAttributes = common.hashToArrayOfKeyValuePairs(merge(options.attributes, {
            "tool": "nodejs " + path.basename(process.argv[1])
          }));
      requestOptions.body = JSON.stringify({
        attributes : devAttributes,
        userName : options.userName,
        firstName : options.firstName,
        lastName : options.lastName,
        email: email
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      //request.debug = true;
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  });

  Developer.prototype.del = promiseWrap(function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/developers/:developer
    // Authorization: :edge-auth
    var conn = this.conn;
    if ( !options.developerEmail) {
      return cb(new Error("missing developerEmail"));
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete Developer %s', options.developerEmail));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerEmail);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  });

  Developer.prototype.get = promiseWrap(function(options, cb) {
    var conn = this.conn;
    if ( ! cb) { cb = options; options = {}; }
    common.insureFreshToken(conn, function(requestOptions) {
      var discriminator = options.developerEmail || options.email || options.developerId || options.id;
      requestOptions.url = (discriminator) ?
        urljoin(conn.urlBase, 'developers', discriminator) :
        urljoin(conn.urlBase, 'developers');

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  });

  function revokeOrApprove(conn, options, cb) {
    // POST -H content-type:application/octet-stream
    //  /v1/o/ORGNAME/developers/DEVELOPERID?action=ACTION
    if(options.action != 'revoke' && options.action != 'approve') {
      return cb(new Error("missing or invalid action"));
    }
    var discriminator = options.developer || options.developerId || options.developerEmail || options.email ;
    if( ! discriminator) {
      return cb(new Error("missing developer ID or email"));
    }

    let urlTail = sprintf('developers/%s', discriminator);

    if (conn.verbosity>0) {
      utility.logWrite(sprintf('%s developer %s', options.action, urlTail));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('%s?action=%s', urlTail,
                                           (options.action == 'revoke') ? 'inactive':'active'));
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [204], cb));
    });
  }

  Developer.prototype.revoke = promiseWrap(function(options, cb) {
    var conn = this.conn;
    revokeOrApprove(conn, merge(options, {action:'revoke'}), cb);
  });

  Developer.prototype.approve = promiseWrap(function(options, cb) {
    var conn = this.conn;
    revokeOrApprove(conn, merge(options, {action:'approve'}), cb);
  });

  module.exports = Developer;

}());
