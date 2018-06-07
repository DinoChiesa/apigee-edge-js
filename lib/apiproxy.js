// apiproxy.js
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
  const utility         = require('./utility.js'),
        path            = require('path'),
        common          = require('./common.js'),
        deployableAsset = require('./deployableAsset.js'),
        request         = require('request'),
        urljoin         = require('url-join'),
        sprintf         = require('sprintf-js').sprintf;

  function ApiProxy(conn) { this.conn = conn; }

  ApiProxy.prototype.get = function(options, cb) {
    var conn = this.conn;
    if (cb == null) {
      cb = options;
      options = {};
    }
    return deployableAsset.get('apis', conn, options, cb);
  };

  ApiProxy.prototype.update = function(options, value, cb) {
    var conn = this.conn;
    return deployableAsset.update('apis', conn, options, value, cb);
  };

  ApiProxy.prototype.getRevisions = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions
    var conn = this.conn;
    return deployableAsset.getRevisions(conn, 'proxy', 'apis', options, cb);
  };

  ApiProxy.prototype.getDeployments = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:name/revisions/:revision/deployments
    // or
    // GET :mgmtserver/v1/o/:orgname/apis/:name/deployments
    var conn = this.conn;
    return deployableAsset.getDeployments(conn, 'proxy', 'apis', options, cb);
  };

  ApiProxy.prototype.getResourcesForRevision = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:revision/resources
    var conn = this.conn;
    return deployableAsset.getResourcesForRevision(conn, 'proxy', 'apis', options, cb);
  };

  ApiProxy.prototype.getPoliciesForRevision = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/resources
    var conn = this.conn;
    return deployableAsset.getPoliciesForRevision(conn, 'proxy', 'apis', options, cb);
  };

  function getEndpoints0(conn, options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/proxies
    // var conn = this.conn;
    if (!options.name && !options.apiproxy) {
      return cb(new Error('missing name for apiproxy'));
    }
    if (!options.name) { options.name = options.apiproxy; }
    if (!options.revision) {
      return cb(new Error('missing revision for apiproxy'));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apis', options.name, 'revisions', options.revision, 'proxies');
      if (options.endpoint) {
        requestOptions.url += '/' + options.endpoint;
      }
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  }

  ApiProxy.prototype.getProxyEndpoints = function(options, cb) {
    return getEndpoints0(this.conn, options, cb);
  };
  ApiProxy.prototype.getEndpoints = function(options, cb) {
    return getEndpoints0(this.conn, options, cb);
  };
  ApiProxy.prototype.getEndpoint = function(options, cb) {
    if ( ! options.endpoint) {
      return cb(new Error('missing endpoint for apiproxy'));
    }
    return getEndpoints0(this.conn, options, cb);
  };

  ApiProxy.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apis/:name
    // or
    // DELETE :mgmtserver/v1/o/:orgname/apis/:name/revisions/:revision
    var conn = this.conn;
    return deployableAsset.del('apis', conn, options, cb);
  };

  ApiProxy.prototype.deploy = function(options, cb) {
    return deployableAsset.deploy(this.conn, options, 'apiproxy', cb);
  };

  ApiProxy.prototype.undeploy = function(options, cb) {
    return deployableAsset.undeploy(this.conn, options, 'apiproxy', cb);
  };

  ApiProxy.prototype.export = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:name/revisions/:rev?format=bundle
    var conn = this.conn;
    deployableAsset.export0(conn, 'apiproxy', 'apis', options, cb);
  };

  ApiProxy.prototype.importFromDir = function(options, cb) {
    var conn = this.conn;
    var srcDir = path.resolve(options.srcDir || options.source);
    if (srcDir.endsWith('/apiproxy')) {
      srcDir = path.resolve(path.join(srcDir, '..'));
    }
    // if (conn.verbosity>0) {
    //   utility.logWrite(sprintf('import proxy %s from dir %s', optionsName, srcDir));
    // }
    return deployableAsset.importFromDir(conn, options.name, 'apiproxy', srcDir, cb);
  };

  ApiProxy.prototype.importFromZip = function(options, cb) {
    // curl -X POST "${mgmtserver}/v1/o/$org/apis?action=import&name=$proxyname" -T $zipname -H "Content-Type: application/octet-stream"
    var conn = this.conn;
    var source = path.resolve(options.zipArchive || options.source);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('import proxy %s from zip %s', options.name, source));
    }
    return deployableAsset.importFromZip(conn, options.name, 'apiproxy', source, cb);
  };

  ApiProxy.prototype.import = function(options, cb) {
    // import from either a zip or a directory.
    var conn = this.conn;
    return deployableAsset.import0(conn, options, 'apiproxy', cb);
  };

  module.exports = ApiProxy;

}());
