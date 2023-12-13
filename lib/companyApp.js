// companyApp.js
// ------------------------------------------------------------------
// Copyright 2018-2023 Google LLC.
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

const utility = require("./utility.js"),
  common = require("./common.js"),
  promiseWrap = require("./promiseWrap.js"),
  request = require("postman-request"),
  urljoin = require("url-join"),
  sprintf = require("sprintf-js").sprintf;

function CompanyApp(conn) {
  this.conn = conn;
}

CompanyApp.prototype.create = promiseWrap(function (options, cb) {
  const conn = this.conn;
  // POST -H content-type:application/octet-stream
  if (options.name) {
    return cb(new Error("missing name"));
  }

  if (!options.company) {
    return cb(new Error("missing company ressource"));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(
      conn.urlBase,
      "companies",
      options.company,
      "apps"
    );
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("POST %s", requestOptions.url));
    }
    request.post(requestOptions, common.callback(conn, [201], cb));
  });
});

CompanyApp.prototype.get = promiseWrap(function (options, cb) {
  const conn = this.conn,
    name = options.appName || options.name || options.app;
  if (options.company) {
    return cb(new Error("missing name"));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = name
      ? urljoin(conn.urlBase, "companies", options.company, "apps")
      : urljoin(conn.urlBase, "companies", options.company, "apps", name);
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("GET %s", requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

module.exports = CompanyApp;
