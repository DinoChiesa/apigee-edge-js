// resourcefile.js
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
        fs          = require('fs'),
        path        = require('path'),
        request     = require('request'),
        urljoin     = require('url-join'),
        sprintf     = require('sprintf-js').sprintf;

  function Resourcefile(conn) {  this.conn = conn; }

  function resolveResourceFileUrlPath(conn, options) {
    if (options && (options.env || options.environment)) {
      return urljoin(conn.urlBase, 'e', (options.env || options.environment), 'resourcefiles');
    }
    if (options && options.proxy && options.revision) {
      return urljoin(conn.urlBase, 'apis', options.proxy, 'revisions', options.revision, 'resourcefiles');
    }
    return urljoin(conn.urlBase, 'resourcefiles');
  }

  function xlateResourceType(resourceType) {
    if (resourceType) { resourceType = resourceType.slice(1);}
    switch (resourceType) {
      case 'js': return 'jsc';
      case 'jar': return 'java';
    }
    return resourceType;
  }

  function validResourceType(resourcetype) {
    return resourcetype &&
    ['wsdl', 'jsc', 'xsd', 'xsl', 'node', 'java', 'py' ]
  }

  Resourcefile.prototype.get = promiseWrap(function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/resourcefiles
    // GET :mgmtserver/v1/o/:orgname/resourcefiles/:type/:name
    // GET :mgmtserver/v1/o/:orgname/apis/:apiproxy/resourcefiles
    // GET :mgmtserver/v1/o/:orgname/apis/:apiproxy/resourcefiles/:type/:name
    // GET :mgmtserver/v1/o/:orgname/e/:env/resourcefiles
    // GET :mgmtserver/v1/o/:orgname/e/:env/resourcefiles/:type/:name
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    var name = options.name;
    let type = null;
    if (name) {
      var xlate = xlateResourceType(path.extname(name));
      type = options.type || xlate || 'unspecified';
    }
    common.insureFreshToken(conn, function(requestOptions) {
      var baseUrlPath = resolveResourceFileUrlPath(conn, options);
      requestOptions.url = (name) ? urljoin(baseUrlPath, type, name) : baseUrlPath;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
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

  function createResource(conn, options, cb) {
    const [filename, e] = verifyFilename(options);
    if (e) {
      return cb(e);
    }
    const name = options.name || path.basename(filename);
    let resourceType = options.type || xlateResourceType(path.extname(name));
    if ( ! validResourceType(resourceType) ) {
      return cb(new Error("invalid resource type"));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      var baseUrlPath = resolveResourceFileUrlPath(conn, options);
      requestOptions.url = sprintf('%s?type=%s&name=%s', baseUrlPath, resourceType, name);
      requestOptions.headers['content-type'] = 'application/octet-stream';
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      let afterCreate =
        function(e, result) {
          if (conn.verbosity>0) {
            if (e) {
              utility.logWrite('Create error: ' + JSON.stringify(e));
            }
            else {
              utility.logWrite('Create result: ' + JSON.stringify(result));
            }
          }
          return cb(e, result);
        };

      fs.createReadStream(filename)
        .pipe(request.post(requestOptions, common.callback(conn, [201], afterCreate)));
    });
  }

  function updateResource(conn, options, cb) {
    const [filename, e] = verifyFilename(options);
    if (e) {
      return cb(e);
    }
    const name = options.name || path.basename(filename);
    const resourceType = options.type || xlateResourceType(path.extname(name));
    if ( ! validResourceType(resourceType) ) {
      return cb(new Error("invalid resource type"));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      var baseUrlPath = resolveResourceFileUrlPath(conn, options);
      requestOptions.url = sprintf('%s/%s/%s', baseUrlPath, resourceType, name);
      requestOptions.headers['content-type'] = 'application/octet-stream';
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('PUT %s', requestOptions.url));
      }
      let afterUpdate =
        function(e, result) {
          if (conn.verbosity>0) {
            if (e) {
              utility.logWrite('Update error: ' + JSON.stringify(e));
            }
            else {
              utility.logWrite('Update result: ' + JSON.stringify(result));
            }
          }
          return cb(e, result);
        };

      fs.createReadStream(options.filename)
        .pipe(request.put(requestOptions, common.callback(conn, [200], afterUpdate)));
    });
  }

  Resourcefile.prototype.create = promiseWrap(function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/e/:env/resourcefiles?type=xsl&name=foo.xsl -d @foo.xsl
    // POST :mgmtserver/v1/o/:orgname/resourcefiles?type=xsl&name=foo.xsl -d @foo.xsl
    // POST :mgmtserver/v1/o/:orgname/apis/:apiproxy/revisions/1/resourcefiles?type=xsl&name=foo.xsl -d @foo.xsl
    const conn = this.conn;
    createResource(conn, options, cb);
  });

  Resourcefile.prototype.createOrUpdate = promiseWrap(function(options, cb) {
    const conn = this.conn;
    const [filename, e] = verifyFilename(options);
    if (e) {
      return cb(e);
    }
    const name = options.name || path.basename(filename);
    const resourceType = options.type || xlateResourceType(path.extname(name));
    if ( ! validResourceType(resourceType) ) {
      return cb(new Error("invalid resource type"));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      var baseUrlPath = resolveResourceFileUrlPath(conn, options);
      requestOptions.url = sprintf('%s/%s/%s', baseUrlPath, resourceType, name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      let afterCheck = function(e, response, body) {
            let result = body ? JSON.parse(body): null;
            if (conn.verbosity>0) {
              utility.logWrite('status: ' + response.statusCode );
            }
            if (response.statusCode == 404) {
              // does not exist, create it
              createResource(conn, {...options, ...{filename, name, type:resourceType}}, cb);
            }
            else if (response.statusCode == 200) {
              // exists, now update it
              updateResource(conn, {...options, ...{filename, name, type:resourceType}}, cb);
            }
            else {
              return cb(new Error({error: 'bad status', statusCode: response.statusCode }), result);
            }
          };
      request.get(requestOptions, afterCheck);
    });
  });

  Resourcefile.prototype.update = promiseWrap(function(options, cb) {
    // PUT :mgmtserver/v1/o/:orgname/e/:env/resourcefiles/xsl/foo.xsl -d @foo.xsl
    // PUT :mgmtserver/v1/o/:orgname/resourcefiles/xsl/foo.xsl -d @foo.xsl
    // PUT :mgmtserver/v1/o/:orgname/apis/:apiproxy/revisions/1/resourcefiles/xsl/foo.xsl -d @foo.xsl
    const conn = this.conn;
    updateResource(conn, options, cb);
  });


  Resourcefile.prototype.del = promiseWrap(function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/resourcefiles/xsl/foo.xsl
    const conn = this.conn;
    const name = options.name;
    if ( ! name ) {
      return cb(new Error("missing resourcefile name"));
    }
    const resourceType = options.type || xlateResourceType(path.extname(name));
    if ( ! validResourceType(resourceType) ) {
      return cb(new Error("invalid resource type"));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      var baseUrlPath = resolveResourceFileUrlPath(conn, options);
      requestOptions.url = sprintf('%s/%s/%s', baseUrlPath, resourceType, name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  });

  module.exports = Resourcefile;

}());
