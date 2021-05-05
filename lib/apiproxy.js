// apiproxy.js
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

const utility         = require('./utility.js'),
      common          = require('./common.js'),
      deployableAsset = require('./deployableAsset.js'),
      promiseWrap     = require('./promiseWrap.js'),
      path            = require('path'),
      request         = require('request'),
      urljoin         = require('url-join'),
      sprintf         = require('sprintf-js').sprintf;

function ApiProxy(conn) { this.conn = conn; }

ApiProxy.prototype.get = promiseWrap(function(options, cb) {
  const conn = this.conn;
  if ( ! cb) { cb = options; options = {}; }
  return deployableAsset.get('apis', conn, options, cb);
});

ApiProxy.prototype.update = promiseWrap(function(options, value, cb) {
  const conn = this.conn;
  return deployableAsset.update('apis', conn, options, value, cb);
});

ApiProxy.prototype.getRevisions = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions
  const conn = this.conn;
  return deployableAsset.getRevisions(conn, 'proxy', 'apis', options, cb);
});

ApiProxy.prototype.getDeployments = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/apis/:name/revisions/:revision/deployments
  // or
  // GET :mgmtserver/v1/o/:orgname/apis/:name/deployments
  // or?
  // GET :mgmtserver/v1/o/:orgname/deployments
  const conn = this.conn;
  if ( ! cb) { cb = options; options = {}; }
  return deployableAsset.getDeployments(conn, 'proxy', 'apis', options, cb);
});

ApiProxy.prototype.getResourcesForRevision = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:revision/resources
  const conn = this.conn;
  return deployableAsset.getResourcesForRevision(conn, 'proxy', 'apis', options, cb);
});

ApiProxy.prototype.getResourceForRevision = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/policies1<
  const conn = this.conn;
  if ( ! options.resource) {
    return cb(new Error('missing resource'));
  }
  return deployableAsset.getResourcesForRevision(conn, 'proxy', 'apis', options, cb);
});


ApiProxy.prototype.getPoliciesForRevision = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/policies
  const conn = this.conn;
  return deployableAsset.getPoliciesForRevision(conn, 'proxy', 'apis', options, cb);
});

ApiProxy.prototype.getPolicyForRevision = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/policies
  const conn = this.conn;
  if ( ! options.policy) {
    return cb(new Error('missing policy'));
  }
  return deployableAsset.getPoliciesForRevision(conn, 'proxy', 'apis', options, cb);
});

function getEndpoints0(conn, options, t, cb) {
  // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/proxies
  //-or-
  // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/targets

  const name = options.name || options.apiproxy;
  if (!name) {
    return cb(new Error('missing name for apiproxy'));
  }
  if (!options.revision) {
    return cb(new Error('missing revision for apiproxy'));
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, 'apis', name, 'revisions', options.revision, t);
    if (options.endpoint && t === 'proxies') {
      requestOptions.url += '/' + options.endpoint;
    }
    else if (options.target && t === 'targets') {
      requestOptions.url += '/' + options.target;
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
}

ApiProxy.prototype.getProxyEndpoints = promiseWrap(function(options, cb) {
  return getEndpoints0(this.conn, options, 'proxies', cb);
});

ApiProxy.prototype.getEndpoints = promiseWrap(function(options, cb) {
  return getEndpoints0(this.conn, options, 'proxies', cb);
});

ApiProxy.prototype.getEndpoint = promiseWrap(function(options, cb) {
  if ( ! options.endpoint) {
    return cb(new Error('missing endpoint for apiproxy'));
  }
  return getEndpoints0(this.conn, options, 'proxies', cb);
});

ApiProxy.prototype.getTargets = promiseWrap(function(options, cb) {
  return getEndpoints0(this.conn, options, 'targets', cb);
});

ApiProxy.prototype.getTarget = promiseWrap(function(options, cb) {
  if ( ! options.target) {
    return cb(new Error('missing target for apiproxy'));
  }
  return getEndpoints0(this.conn, options, 'targets', cb);
});

ApiProxy.prototype.del = promiseWrap(function(options, cb) {
  // DELETE :mgmtserver/v1/o/:orgname/apis/:name
  // or
  // DELETE :mgmtserver/v1/o/:orgname/apis/:name/revisions/:revision
  const conn = this.conn;
  return deployableAsset.del('apis', conn, options, cb);
});

ApiProxy.prototype.deploy = promiseWrap(function(options, cb) {
  return deployableAsset.deploy(this.conn, options, 'apiproxy', cb);
});

ApiProxy.prototype.undeploy = promiseWrap(function(options, cb) {
  return deployableAsset.undeploy(this.conn, options, 'apiproxy', cb);
});

ApiProxy.prototype.export = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/apis/:name/revisions/:rev?format=bundle
  const conn = this.conn;
  deployableAsset.export0(conn, 'apiproxy', 'apis', options, cb);
});

ApiProxy.prototype.importFromDir = promiseWrap(function(options, cb) {
  let conn = this.conn,
      srcDir = path.resolve(options.srcDir || options.source);
  if (srcDir.endsWith('/apiproxy')) {
    srcDir = path.resolve(path.join(srcDir, '..'));
  }
  // if (conn.verbosity>0) {
  //   utility.logWrite(sprintf('import proxy %s from dir %s', optionsName, srcDir));
  // }
  return deployableAsset.importFromDir(conn, options.name, 'apiproxy', srcDir, cb);
});

ApiProxy.prototype.importFromZip = promiseWrap(function(options, cb) {
  // curl -X POST "${mgmtserver}/v1/o/$org/apis?action=import&name=$proxyname" -T $zipname -H "Content-Type: application/octet-stream"
  const conn = this.conn,
        source = path.resolve(options.zipArchive || options.source);
  if (conn.verbosity>0) {
    utility.logWrite(sprintf('import proxy %s from zip %s', options.name, source));
  }
  return deployableAsset.importFromZip(conn, options.name, 'apiproxy', source, cb);
});

ApiProxy.prototype.import = promiseWrap(function(options, cb) {
  // import from either a zip or a directory.
  const conn = this.conn;
  return deployableAsset.import0(conn, options, 'apiproxy', cb);
});

module.exports = ApiProxy;
