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

  function Spec(conn) {this.conn = conn;}

  function specUrlRoot(conn) {
    return "https://apigee.com";
  }

  function specUrlBase(conn) {
    return urljoin(specUrlRoot(conn), '/organizations', conn.orgname);
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
        let contents = JSON.parse(body).contents,
            names = contents.map( x => x.name );
          return cb(null, names);
      });
    });
  });

  Spec.prototype.getMeta = promiseWrap(function(options, cb) {
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
        let contents = JSON.parse(body).contents,
            selected = contents.find( x => x.name == name);
        if (selected) {
          requestOptions.url = urljoin(specUrlRoot(conn), selected.self);
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

  Spec.prototype.get = promiseWrap(function(options, cb) {
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
        let contents = JSON.parse(body).contents,
            selected = contents.find( x => x.name == name);
        if (selected) {
          requestOptions.url = urljoin(specUrlRoot(conn), selected.content);
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('GET %s', requestOptions.url));
          }
          request.get(requestOptions, common.callback(conn, [200, 204], cb));
        }
        else {
          return cb(new Error("not found"));
        }
      });
    });
  });

  function verifyFilename(options) {
    let filename = options.file || options.filename;
    if (! filename) {
      return [null, new Error('Missing filename')];
    }
    filename = path.resolve(filename);
    if ( ! fs.existsSync(filename)) {
      return [null, new Error('The resourcefile does not exist')];
    }
    return [filename, null];
  }

  // function readableFromString(s) {
  //   let stream = new Readable();
  //   stream.push(s);
  //   stream.push(null);
  //   return stream;
  // }

  function putContent(conn, requestOptions, docMetdata, newContent, cb) {
    requestOptions.url = urljoin(specUrlRoot(conn), docMetdata.content);
    requestOptions.headers['content-type'] = 'text/plain';
    requestOptions.body = newContent;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('PUT %s', requestOptions.url));
    }

    let afterPut =
      function(e, result) {
        if (conn.verbosity>0) {
          if (e) {
            const util = require('util');
            utility.logWrite('PUT error: ' + util.format(e));
          }
        }
        return cb(e, result);
      };

    // streaming (Chunked transfer encoding) is apparently not supported by the /dapi.
    // So we cannot do
    //  fs.createReadStream(filename).pipe(request.put(...));
    //
    request.put(requestOptions, common.callback(conn, [200], afterPut));
  }

  Spec.prototype.create = promiseWrap(function(options, cb) {
    // POST :apigeecom/dapi/api/organizations/:org/specs/doc
    //  .. followed by...
    // PUT :apigeecom/dapi/api/organizations/:org/specs/doc/203024/content
    // Content-type: text/plain
    //
    let conn = this.conn,
        name = options.name,
        filename;

    if (!name) {
      return cb(new Error('missing name for Doc'));
    }
    if (!options.content && !options.filename) {
      return cb(new Error('missing content and filename for Doc'));
    }
    if (options.filename) {
      let e;
      [filename, e] = verifyFilename(options);
      if (e) {
        return cb(e);
      }
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
        let docMetadata = JSON.parse(body);
        if (docMetadata.content) {
          putContent(conn, requestOptions, docMetadata,
                     (filename) ? fs.readFileSync(filename, 'utf8') : options.content,
                     cb);
        }
        else {
          return cb(new Error("content path was not found"));
        }
      });
    });
  });


  Spec.prototype.update = promiseWrap(function(options, cb) {
    // GET :apigeecom/organizations/:org/specs/folder/home
    // ...followed by...
    // PUT :apigeecom/dapi/api/organizations/:org/specs/doc/203024/content
    // Content-type: text/plain

    let conn = this.conn,
        name = options.name,
        filename;
    if (!name) {
      return cb(new Error("missing name for Doc"));
    }
    if (!options.content && !options.filename) {
      return cb(new Error('missing content and filename for Doc'));
    }
    if (options.filename) {
      let e;
      [filename, e] = verifyFilename(options);
      if (e) {
        return cb(e);
      }
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
        let contents = JSON.parse(body).contents,
            docMetadata = contents.find( x => x.name == name);
        if (docMetadata) {
          putContent(conn, requestOptions, docMetadata,
                     (filename) ? fs.readFileSync(filename, 'utf8') : options.content,
                     cb);
        }
        else {
          return cb(new Error("name wasnot found"));
        }
      });
    });
  });

  Spec.prototype.del = promiseWrap(function(options, cb) {
    // GET :apigeecom/organizations/:org/specs/folder/home
    // ...followed by...
    // GET :apigeecom/dapi/api/organizations/gaccelerate3/specs/doc/203024
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
        let contents = JSON.parse(body).contents,
            selected = contents.find( x => x.name == name);
        if (selected) {
          requestOptions.url = urljoin(specUrlRoot(conn), selected.self);
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('GET %s', requestOptions.url));
          }
          request.get(requestOptions, function(error, response, body) {
            if (error) {
              utility.logWrite(error);
              return cb(error, body);
            }
            requestOptions.headers['if-match'] = response.headers.etag;
            if (conn.verbosity>0) {
              utility.logWrite(sprintf('DELETE %s', requestOptions.url));
            }
            request.del(requestOptions, common.callback(conn, [200, 204], cb));
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
