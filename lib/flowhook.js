// flowhook.js
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

function FlowHook(conn) { this.conn = conn; }

FlowHook.prototype.get = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:org/e/:env/flowhooks
  // or
  // GET :mgmtserver/v1/o/:org/e/:env/flowhooks/:flowhook
  if ( ! cb) { cb = options; options = {}; }
  const env = options.environment || options.env;
  if ( ! env) {
    return cb(new Error('missing required parameter: environment'));
  }
  const conn = this.conn;
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = (options.name) ?
      urljoin(conn.urlBase, 'environments', env, 'flowhooks', options.name) :
      urljoin(conn.urlBase, 'environments', env, 'flowhooks') ;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

FlowHook.prototype.put = promiseWrap(function(options, cb) {
  // PUT :mgmtserver/v1/o/:org/e/:env/flowhooks/:flowhook
  // {
  //   "continueOnError" : "true",
  //   "name" : "myFlowHook2",
  //   "sharedFlow" : "CDX-SharedFlow"
  // }
  const env = options.environment || options.env;
  if ( ! env) {
    return cb(new Error('missing required parameter: environment'));
  }
  if ( ! options.name) {
    return cb(new Error('missing required parameter: name'));
  }
  if ( ! options.sharedFlow) {
    return cb(new Error('missing required parameter: sharedFlow'));
  }
  const conn = this.conn;
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, 'environments', env, 'flowhooks', options.name);
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.body = JSON.stringify({
      continueOnError: options.continueOnError || true,
      name : 'flowhook-' + new Date().valueOf(),
      sharedFlow : options.sharedFlow});
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('PUT %s', requestOptions.url));
    }
    request.put(requestOptions, common.callback(conn, [200], cb));
  });
});

module.exports = FlowHook;
