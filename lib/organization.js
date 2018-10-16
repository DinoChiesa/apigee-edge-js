// organization.js
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
  const request       = require('request'),
        urljoin       = require('url-join'),
        sprintf       = require('sprintf-js').sprintf,
        utility       = require('./utility.js'),
        common        = require('./common.js'),
        ApiProxy      = require('./apiproxy.js'),
        Cache         = require('./cache.js'),
        Audit         = require('./audit.js'),
        Kvm           = require('./kvm.js'),
        Keystore      = require('./keystore.js'),
        Reference     = require('./reference.js'),
        Developer     = require('./developer.js'),
        DeveloperApp  = require('./developerApp.js'),
        App           = require('./app.js'),
        SharedFlow    = require('./sharedflow.js'),
        ApiProduct    = require('./apiproduct.js'),
        AppCredential = require('./appcredential.js'),
        FlowHook      = require('./flowhook.js'),
        Environment   = require('./environment.js'),
        Stat          = require('./stat.js');

  function Organization(conn) {
    this.conn           = conn;
    this.proxies        = new ApiProxy(conn);
    this.caches         = new Cache(conn);
    this.audits         = new Audit(conn);
    this.kvms           = new Kvm(conn);
    this.keystores      = new Keystore(conn);
    this.references     = new Reference(conn);
    this.developers     = new Developer(conn);
    this.developerapps  = new DeveloperApp(conn);
    this.apps           = new App(conn);
    this.sharedflows    = new SharedFlow(conn);
    this.products       = new ApiProduct(conn);
    this.appcredentials = new AppCredential(conn);
    this.flowhooks      = new FlowHook(conn);
    this.environments   = new Environment(conn);
    this.stats          = new Stat(conn);
  }

  Organization.prototype.get = function(url, cb) {
    if ( ! cb) { cb = url; url = ''; }
    var conn = this.conn;
    url = urljoin(conn.urlBase, url);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', url));
    }
    request.get(url, {headers: conn.requestHeaders}, common.callback(conn, [200], cb));
  };

  Organization.prototype.getProperties = function(cb) {
    var conn = this.conn;
    this.get(function(e, result) {
      if (e) { return cb(e, result); }
      conn.orgProperties = common.arrayOfKeyValuePairsToHash(result.properties.property);
      result.properties = conn.orgProperties;
      cb(null, result);
    });
  };

  module.exports = Organization;

}());
