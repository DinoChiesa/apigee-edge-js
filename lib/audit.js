// audit.js
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

const utility     = require('./utility.js'),
      common      = require('./common.js'),
      promiseWrap = require('./promiseWrap.js'),
      request     = require('request'),
      urljoin     = require('url-join'),
      sprintf     = require('sprintf-js').sprintf;

function Audit(conn) { this.conn = conn; }

Audit.prototype.get = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/audits/organizations/ORG?expand=true&endTime=1528205107564&startTime=1528190706564',
  if ( ! cb) { cb = options; options = {}; }
  const conn = this.conn;
  let startTime, endTime;
  if (options.startTime) {
    startTime = new Date(options.startTime);
  }
  else {
    startTime = new Date();
    startTime.setHours(0,0,0,0);
  }
  if (options.endTime) {
    endTime = new Date(options.endTime);
  }
  else {
    endTime = new Date();
  }
  endTime = endTime.getTime();
  startTime = startTime.getTime();
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.mgmtServer, 'v1', 'audits', 'organizations', conn.orgname) +
      sprintf('?expand=true&endTime=%d&startTime=%d', endTime, startTime);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

module.exports = Audit;
