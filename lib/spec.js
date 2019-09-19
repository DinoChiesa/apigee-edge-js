// spec.js
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
        sprintf = require('sprintf-js').sprintf;

  // uncomment to debug
  //request.debug = true;

  function Spec(conn) {this.conn = conn;}

  function specUrlBase(conn) {
    return urljoin("https://apigee.com", '/organizations', conn.orgname);
  }

  Spec.prototype.getHome = promiseWrap(function(cb) {
    // GET :apigeecom/organizations/:org/specs/folder/home
    var conn = this.conn;
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(specUrlBase(conn), 'specs/folder/home');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  });

  Spec.prototype.list = promiseWrap(function(cb) {
    // GET :apigeecom/organizations/:org/specs/folder/home
    // followed by a filter
    var conn = this.conn;
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(specUrlBase(conn), 'specs/folder/home');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, function(error, response, body) {
        if (error) {
          utility.logWrite(error);
          return cb(error, body);
        }
        let content = JSON.parse(body).content,
            names = content.map( x => x.name );
          return cb(null, names);
      });
    });
  });

  Spec.prototype.getDoc = promiseWrap(function(options, cb) {
    // GET :apigeecom/organizations/:org/specs/folder/home
    // ...followed by...
    // GET :apigeecom/dapi/api/organizations/gaccelerate3/specs/doc/167649
    let conn = this.conn,
        name = options.name;
    if (!name) {
      return cb(new Error("missing name"));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(specUrlBase(conn), 'specs/folder/home');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, function(error, response, body) {
        if (error) {
          utility.logWrite(error);
          return cb(error, body);
        }
        let content = JSON.parse(body).content,
            selected = content.find( x => x.name == name);
        if (selected) {
          requestOptions.url = urljoin(specUrlBase(conn), selected.content);
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('GET %s', requestOptions.url));
          }
          request.get(requestOptions, common.callback(conn, [200], cb));
        }
        else {
          return cb(new Error("not found"));
        }
      });
    });
  });

  Spec.prototype.create = promiseWrap(function(options, cb) {
    // POST :apigeecom/dapi/api/organizations/:org/specs/doc
    //  .. followed by...
    // PUT :apigeecom/dapi/api/organizations/:org/specs/doc/203024/content
    // Content-type: text/plain
    //
    let conn = this.conn,
        name = options.name;

    if (!name) {
      return cb(new Error('missing name for Doc'));
    }
    if (!options.content) {
      return cb(new Error('missing content for Doc'));
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create Doc %s', name));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(specUrlBase(conn), 'specs/doc');
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({ kind: "Doc", name });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, function(error, response, body) {
        if (error) {
          utility.logWrite(error);
          return cb(error, body);
        }
        var content = JSON.parse(body);
        if (content.id) {
          requestOptions.url = urljoin(specUrlBase(conn), 'specs/doc', content.id, 'content');
          requestOptions.headers['content-type'] = 'text/plain';
          requestOptions.body = options.content;
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('PUT %s', requestOptions.url));
          }
          request.put(requestOptions, common.callback(conn, [200], cb));
        }
        else {
          return cb(new Error("content path was not found"));
        }
      });
    });
  });

  Spec.prototype.del = promiseWrap(function(options, cb) {
    // GET :apigeecom/organizations/:org/specs/folder/home
    // ...followed by...
    // DELETE :apigeecom/dapi/api/organizations/gaccelerate3/specs/doc/203024
    let conn = this.conn,
        name = options.name;
    if (!name) {
      return cb(new Error("missing name"));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(specUrlBase(conn), '/specs/folder/home');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, function(error, response, body) {
        if (error) {
          utility.logWrite(error);
          return cb(error, body);
        }
        let content = JSON.parse(body).content,
            selected = content.find( x => x.name == name);
        if (selected) {
          requestOptions.url = urljoin(specUrlBase(conn), 'specs/doc', selected.id);
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('GET %s', requestOptions.url));
          }
          request.get(requestOptions, function(error, response, body) {
            if (error) {
              utility.logWrite(error);
              return cb(error, body);
            }
            requestOptions.headers['if-match'] = response.headers.etag;
            request.del(requestOptions, common.callback(conn, [204], cb));
          });
        }
        else {
          return cb(new Error("not found"));
        }
      });
    });
  });


  module.exports = Spec;

}());
