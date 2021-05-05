// sharedflow.js
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
      promiseWrap     = require('./promiseWrap.js'),
      deployableAsset = require('./deployableAsset.js'),
      path            = require('path'),
      sprintf         = require('sprintf-js').sprintf;

function SharedFlow(conn) { this.conn = conn; }

SharedFlow.prototype.get = promiseWrap(function(options, cb) {
  const conn = this.conn;
  if ( ! cb) { cb = options; options = {}; }
  return deployableAsset.get('sharedflows', conn, options, cb);
});

SharedFlow.prototype.getRevisions = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/sharedflows/:sharedflow/revisions
  const conn = this.conn;
  return deployableAsset.getRevisions(conn, 'sharedflow', 'sharedflows', options, cb);
});

SharedFlow.prototype.getDeployments = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/sharedflows/:name/revisions/:revision/deployments
  // or
  // GET :mgmtserver/v1/o/:orgname/sharedflows/:name/deployments
  const conn = this.conn;
  return deployableAsset.getDeployments(conn, 'sharedflow', 'sharedflows', options, cb);
});

SharedFlow.prototype.getResourcesForRevision = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/sharedflows/:sf/revisions/:REV/resources
  const conn = this.conn;
  return deployableAsset.getResourcesForRevision(conn, 'sharedflow', 'sharedflows', options, cb);
});

SharedFlow.prototype.getPoliciesForRevision = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/sharedflows/:name/revisions/:revision/policies
  const conn = this.conn;
  return deployableAsset.getPoliciesForRevision(conn, 'sharedflow', 'sharedflows', options, cb);
});

SharedFlow.prototype.del = promiseWrap(function(options, cb) {
  // DELETE :mgmtserver/v1/o/:orgname/sharedflows/:name
  // or
  // DELETE :mgmtserver/v1/o/:orgname/sharedflows/:name/revision/:revision
  const conn = this.conn;
  return deployableAsset.del('sharedflows', conn, options, cb);
});

SharedFlow.prototype.deploy = promiseWrap(function(options, cb) {
  const conn = this.conn;
  return deployableAsset.deploy(conn, options, 'sharedflowbundle', cb);
});

SharedFlow.prototype.undeploy = promiseWrap(function(options, cb) {
  const conn = this.conn;
  return deployableAsset.undeploy(conn, options, 'sharedflowbundle', cb);
});

SharedFlow.prototype.export = promiseWrap(function(options, cb) {
  // GET :mgmtserver/v1/o/:orgname/sharedflows/:name/revisions/:revision?format=bundle
  const conn = this.conn;
  deployableAsset.export0(conn, 'sharedflow', 'sharedflows', options, cb);
});

SharedFlow.prototype.importFromDir = promiseWrap(function(options, cb) {
  const conn = this.conn;
  let srcDir = path.resolve(options.srcDir || options.source);
  if (srcDir.endsWith('/sharedflowbundle')) {
    srcDir = path.resolve(path.join(srcDir, '..'));
  }
  // if (conn.verbosity>0) {
  //   utility.logWrite(sprintf('import sharedflow %s from dir %s', options.name, options.srcDir));
  // }
  return deployableAsset.importFromDir(conn, options.name, 'sharedflowbundle', srcDir, cb);
});

SharedFlow.prototype.importFromZip = promiseWrap(function(options, cb) {
  // curl -X POST "${mgmtserver}/v1/o/$org/sharedflows?action=import&name=$sfname" -T $zipname -H "Content-Type: application/octet-stream"
  const conn = this.conn,
        source = path.resolve(options.zipArchive || options.source);
  if (conn.verbosity>0) {
    utility.logWrite(sprintf('import sharedflow %s from zip %s', options.name, source));
  }
  return deployableAsset.importFromZip(conn, options.name, 'sharedflowbundle', source, cb);
});

SharedFlow.prototype.import = promiseWrap(function(options, cb) {
  // import from either a zip or a directory.
  const conn = this.conn;
  return deployableAsset.import0(conn, options, 'sharedflowbundle', cb);
});

module.exports = SharedFlow;
