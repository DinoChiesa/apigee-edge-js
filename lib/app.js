// app.js
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

(function (){
  'use strict';
  const utility     = require('./utility.js'),
        common      = require('./common.js'),
        promiseWrap = require('./promiseWrap.js'),
        request     = require('request'),
        urljoin     = require('url-join'),
        sprintf     = require('sprintf-js').sprintf;

  function App(conn) {this.conn = conn;}

  App.prototype.get = promiseWrap(function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apps
    // or
    // GET :mgmtserver/v1/o/:orgname/apps/ID_OF_APP
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = (options.id) ?
        urljoin(conn.urlBase, 'apps', options.id) :
        urljoin(conn.urlBase, 'apps') + (options.expand ? '?expand=true' : '');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  });

  App.prototype.del = promiseWrap(function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apps/:appid
    // Authorization: :edge-auth
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete App %s', options.appId || options.id));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apps', options.appId || options.id);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  });

  module.exports = App;

}());
