// team.js
// ------------------------------------------------------------------
// Copyright 2019-2023 Google LLC.
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
// This module wraps the /consumers API, which is at this moment undocumented and
// unsupported, and subject to change.  That means this module may stop
// functioning at some point.  Use it at your own risk!
//

const utility = require("./utility.js"),
  common = require("./common.js"),
  promiseWrap = require("./promiseWrap.js"),
  //Readable = require("stream").Readable,
  //path = require("path"),
  //fs = require("fs"),
  request = require("postman-request"),
  urljoin = require("url-join"),
  sprintf = require("sprintf-js").sprintf;

// uncomment to debug
//request.debug = true;

function Team(conn) {
  this.conn = conn;
}

function apiUrlRoot(conn) {
  return "https://apigee.com";
}

function urlBase(conn) {
  return urljoin(apiUrlRoot(conn), "/consumers/api");
}

Team.prototype.get = promiseWrap(function (options, cb) {
  // GET :apigeecom/consumers/api/providers/:zone/teams/:team?organization=:org
  //   -or-
  // GET :apigeecom/consumers/api/providers/:zone/teams?organization=:org
  const conn = this.conn,
    zone = options.zone,
    team = options.team;
  if (!zone) {
    return cb(new Error("missing zone"));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(urlBase(conn), "providers", zone, "teams");
    if (team) {
      requestOptions.url = urljoin(requestOptions.url, team);
    }
    requestOptions.url = requestOptions.url + "?organization=" + conn.orgname;
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("GET %s", requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

Team.prototype.listAudiences = promiseWrap(function (options, cb) {
  // GET :apigeecom/consumers/api/providers/:zone/audiences?organization=:org
  let conn = this.conn,
    zone = options.zone;
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url =
      urljoin(urlBase(conn), "providers", zone, "audiences") +
      "?organization=" +
      conn.orgname;
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("GET %s", requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

module.exports = Team;
