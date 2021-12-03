// developer.js
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
/* global Buffer, process */

const utility     = require('./utility.js'),
      common      = require('./common.js'),
      promiseWrap = require('./promiseWrap.js'),
      request     = require('request'),
      urljoin     = require('url-join'),
      path        = require('path'),
      sprintf     = require('sprintf-js').sprintf;

function Developer(conn) { this.conn = conn; }

Developer.prototype.create = promiseWrap(function(options, cb) {
  // POST :mgmtserver/v1/o/:orgname/developers
  // Authorization: :apigee-auth
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
  let conn = this.conn,
      email = options.developerEmail || options.email;
  if ( !email || !options.firstName || !options.lastName || !options.userName) {
    return cb(new Error("missing required inputs, one of {email, firstName, lastName, userName}"));
  }
  if (conn.isGoogle()) {
    email = email.toLowerCase();
  }
  if (conn.verbosity>0) {
    utility.logWrite(sprintf('Create Developer %s', email));
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.url = urljoin(conn.urlBase, 'developers');
    let tool = 'nodejs ' + path.basename(process.argv[1]),
        devAttributes = common.hashToArrayOfKeyValuePairs({...options.attributes, tool});

    requestOptions.body = JSON.stringify({
      attributes : devAttributes,
      userName : options.userName,
      firstName : options.firstName,
      lastName : options.lastName,
      email
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
  // Authorization: :apigee-auth
  let conn = this.conn,
      email = options.developerEmail || options.email;

  if ( !email) {
    return cb(new Error('missing developerEmail'));
  }
  if (conn.isGoogle()) {
    email = email.toLowerCase();
  }
  if (conn.verbosity>0) {
    utility.logWrite(sprintf('Delete Developer %s', email));
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, 'developers', email);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, common.callback(conn, [200], cb));
  });
});

Developer.prototype.get = promiseWrap(function(options, cb) {
  let conn = this.conn;
  if ( ! cb) { cb = options; options = {}; }
  common.insureFreshToken(conn, function(requestOptions) {
    let email = options.developerEmail || options.email;
    if (email && conn.isGoogle()) {
      email = email.toLowerCase();
    }
    let discriminator = email || options.developerId || options.id;
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
    return cb(new Error('missing or invalid action'));
  }
  let email = options.developerEmail || options.email;
  if (email && conn.isGoogle()) {
    email = email.toLowerCase();
  }
  let discriminator = email || options.developer || options.developerId || options.id;

  if( ! discriminator) {
    return cb(new Error('missing developer ID or email'));
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
  let conn = this.conn;
  revokeOrApprove(conn, {...options, action:'revoke'}, cb);
});

Developer.prototype.approve = promiseWrap(function(options, cb) {
  let conn = this.conn;
  revokeOrApprove(conn, {...options, action:'approve'}, cb);
});

module.exports = Developer;
