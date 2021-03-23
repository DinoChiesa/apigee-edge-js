// query.js
// ------------------------------------------------------------------
// Copyright 2019 Google LLC.
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
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        promiseWrap = require('./promiseWrap.js'),
        request = require('request'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf,
        waitInterval = 8200;

  function Query(conn) {this.conn = conn;}

  let statusFn = promiseWrap(function(options, cb) {
        if ( ! cb) { cb = options; options = {}; }
        let conn = this.conn;
        let uri = options.uri || options.self;
        if (uri) {
          let parts = uri.split(new RegExp('/', 'g'));
          uri = urljoin(conn.urlBase, parts.slice(3).join('/'));
        }
        else {
          let env = options.env || options.environment;
          let id = options.id;
          uri = urljoin(conn.urlBase, 'e', env, 'queries', id);
        }
        common.insureFreshToken(conn, function(requestOptions) {
          requestOptions.url = uri;
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('GET %s', requestOptions.url));
          }
          request.get(requestOptions, common.callback(conn, [200], cb));
        });
      });

  Query.prototype.status = statusFn;

  Query.prototype.wait = function(options) {
    let self = this;
    function check() {
      return statusFn.call(self, options)
        .then( result => {
          if (result.state == 'running' || result.state == 'enqueued')
            return new Promise((resolve) => setTimeout( () => resolve(check()), waitInterval));
          if (result.state == 'completed')
            return Promise.resolve({uri:result.result.self});
          return Promise.reject(new Error('unknown state: ' + result.state));
        });
    }
    return check();
  };

  Query.prototype.create = promiseWrap(function(options, cb) {
    // POST :mgmtserver/v1/o/:org/e/:env/queries?tzo=-480
    // Authorization: :apigee-auth
    // Content-type: application/json
    //
    // { .... }
    let conn = this.conn;
    let env = options.env || options.environment;
    let query = options.query || options.payload;
    if (!env) {
      return cb(new Error('missing environment name for cache'));
    }
    if (!query) {
      return cb(new Error("missing query description"));
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create Query...'));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'queries'); //+ '?tzo=-480';
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify(query);

      // example of the query:
      // {
      //   metrics:[
      //     {
      //       name:"message_count",
      //       'function' :"sum",
      //       alias:"count",
      //       operator:"/",
      //       value:"1000"
      //     }
      //   ],
      //   dimensions:[
      //     "apiproxy"
      //   ],
      //   timeRange: {
      //     start: "2019-01-01T00:00:00",
      //     end: "2019-12-31T00:18:00"
      //   },
      //   groupByTimeUnit: "month",
      //   limit: 20,
      //   filter:"(message_count ge 0)",
      //   outputFormat: "json"
      // }

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  });

  Query.prototype.getResults = promiseWrap(function(options, cb) {
    if ( ! cb) { cb = options; options = {}; }
    let conn = this.conn;
    let uri = options.uri || options.self;
    if (uri) {
      let parts = uri.split(new RegExp('/', 'g'));
      uri = urljoin(conn.urlBase, parts.slice(3).join('/'));
    }
    else {
      let env = options.env || options.environment;
      let id = options.id;
      uri = urljoin(conn.urlBase, 'e', env, 'queries', id);
    }
    if ( ! uri.endsWith('/result')) {
      uri = urljoin(uri, 'result');
    }
    //request.debug = true;
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = uri;
      requestOptions.encoding = null;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, function(e, response, body){
        if (conn.verbosity>0) {
          if (response) {
            utility.logWrite('status: ' + response.statusCode);
          } else {
            utility.logWrite('no response');
          }
        }
        return cb(e, { response, body } );
      });
    });
  });

  module.exports = Query;

}());
