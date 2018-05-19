// organization.js
// ------------------------------------------------------------------

(function (){
  'use strict';
  const request       = require('request'),
        urljoin       = require('url-join'),
        sprintf       = require('sprintf-js').sprintf,
        utility       = require('./utility.js'),
        common        = require('./common.js'),
        ApiProxy      = require('./apiproxy.js'),
        Cache         = require('./cache.js'),
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
        Environment   = require('./environment.js');

  function Organization(conn) {
    this.conn           = conn;
    this.proxies        = new ApiProxy(conn);
    this.caches         = new Cache(conn);
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
