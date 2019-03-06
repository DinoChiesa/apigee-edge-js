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
        promiseWrap   = require('./promiseWrap.js'),
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
        TargetServer  = require('./targetserver.js'),
        Resourcefile  = require('./resourcefile.js'),
        Stat          = require('./stat.js'),
        MaskConfig    = require('./maskconfig.js');

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
    this.targetservers  = new TargetServer(conn);
    this.resourcefiles  = new Resourcefile(conn);
    this.environments   = new Environment(conn);
    this.stats          = new Stat(conn);
    this.maskconfigs    = new MaskConfig(conn);
  }

  Organization.prototype.get = promiseWrap(function(url, cb) {
    if ( ! cb) { cb = url; url = ''; }
    var conn = this.conn;
    url = urljoin(conn.urlBase, url);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', url));
    }
    common.insureFreshToken(conn, function({headers}) {
      request.get(url, {headers}, common.callback(conn, [200], cb));
    });
  });

  Organization.prototype.getProperties = promiseWrap(function(cb) {
    var conn = this.conn;
    this.get(function(e, result) {
      if (e) { return cb(e, result); }
      conn.orgProperties = common.arrayOfKeyValuePairsToHash(result.properties.property);
      result = conn.orgProperties;
      cb(null, result);
    });
  });

  function setProps(conn, hashOfNewProperties, mergeBehavior, cb) {
    var merged = Object.assign({}, conn.orgProperties);
    for (var p in hashOfNewProperties) {
      if ((mergeBehavior === 'add' && ! merged[p]) || (mergeBehavior === 'overwrite')) {
        merged[p] = hashOfNewProperties[p];
      }
      else if (mergeBehavior === 'remove') {
        delete merged[p];
      }
    }
    // At this point it is possible the desired merged props do not differ from
    // the cached org props. But this library won't rely on the internal cache,
    // because there may be other writers. Last Write Wins.
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({
        properties: {
          property: common.hashToArrayOfKeyValuePairs(merged)
        }
      });
      requestOptions.uri = conn.urlBase;

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200], function(e, result){
        if (e) { return cb(e, result); }
        // update cache
        conn.orgProperties = common.arrayOfKeyValuePairsToHash(result.properties.property);
        result = conn.orgProperties;
        cb(null, result);
      }));
    });
  }

  function postProps(conn, propertyHash, mergeBehavior, cb) {
    if ( ! conn.orgProperties) {
      conn.org.getProperties(function(e, result) {
        if (e) { return cb(e, result); }
        setProps(conn, propertyHash, mergeBehavior, cb);
      });
    }
    else {
      setProps(conn, propertyHash, mergeBehavior, cb);
    }
  }

  Organization.prototype.addProperties = promiseWrap(function(propertyHash, cb) {
    const conn = this.conn;
    postProps(conn, propertyHash, 'add', cb);
  });

  Organization.prototype.setProperties = promiseWrap(function(propertyHash, cb) {
    const conn = this.conn;
    postProps(conn, propertyHash, 'overwrite', cb);
  });

  Organization.prototype.removeProperties = promiseWrap(function(propertyArray, cb) {
    const conn = this.conn;
    var propertyHash = {};
    propertyArray.forEach( (item) => { propertyHash[item] = 1; });
    postProps(conn, propertyHash, 'remove', cb);
  });


  Organization.prototype.setConsumerSecretLength = promiseWrap(function(length, cb) {
    const conn = this.conn;
    if (typeof length != 'number' || length < 16 || length > 128) {
      return cb(new Error("invalid argument"));
    }
    postProps(conn, {'keymanagement.consumer.secret.length':length}, 'overwrite', cb);
  });

  Organization.prototype.setConsumerKeyLength = promiseWrap(function(length, cb) {
    const conn = this.conn;
    if (typeof length != 'number' || length < 16 || length > 128) {
      return cb(new Error("invalid argument"));
    }
    postProps(conn, {'keymanagement.consumer.key.length':length}, 'overwrite', cb);
  });

  module.exports = Organization;

}());
