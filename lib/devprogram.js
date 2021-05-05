// devprogram.js
// ------------------------------------------------------------------
// Copyright 2019-2021 Google LLC.
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

// DISCLAIMER
//
// This module wraps the /portals API, which is at this moment undocumented and
// unsupported, and subject to change.  That means this module may stop
// functioning at some point.  Use it at your own risk!
//

const utility     = require('./utility.js'),
      common      = require('./common.js'),
      promiseWrap = require('./promiseWrap.js'),
      Readable    = require('stream').Readable,
      path        = require('path'),
      fs          = require('fs'),
      request     = require('request'),
      urljoin     = require('url-join'),
      sprintf     = require('sprintf-js').sprintf;

// uncomment to debug
//request.debug = true;

function DevProgram(conn) { this.conn = conn; }

function apiUrlRoot(conn) {
  return "https://apigee.com";
}

function urlBase(conn) {
  return urljoin(apiUrlRoot(conn), '/portals/api');
}

DevProgram.prototype.getZones = promiseWrap(function(cb) {
  // GET :apigeecom/portals/api/zones?organization=:org
  let conn = this.conn;
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(urlBase(conn), 'zones') + '?organization=' + conn.orgname;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

DevProgram.prototype.isAudiencesEnabled = promiseWrap(function(options, cb) {
  // GET :apigeecom/portals/api/zone/:zone/audiencesenabled
  let conn = this.conn,
      zone = options.zone;
  if ( ! zone) {
    return cb(new Error("missing zone"));
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(urlBase(conn), 'zone', 'audiencesenabled');
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, function(error, response, body) {
      if (error) {
        utility.logWrite(error);
        return cb(error, body);
      }
      let data = JSON.parse(body).data;
      return cb(null, data.audiencesEnabled); // true / false
    });
  });
});

DevProgram.prototype.getZone = promiseWrap(function(options, cb) {
  // GET :apigeecom/portals/api/zones/:zone?organization=xxx
  let conn = this.conn,
      zone = options.zone;
  if ( ! zone) {
    return cb(new Error("missing zone"));
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(urlBase(conn), 'zones', zone)  + '?organization=' + conn.orgname;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

module.exports = DevProgram;
