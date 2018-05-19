// cache.js
// ------------------------------------------------------------------

(function (){
  'use strict';
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        request = require('request'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf;

  function Cache(conn) {this.conn = conn;}

  Cache.prototype.get = function(options, cb) {
    var conn = this.conn;
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', options.env, 'caches');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  Cache.prototype.create = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/e/:env/caches?name=whatev
    // Authorization: :edge-auth
    // Content-type: application/json
    //
    // { .... }
    var conn = this.conn;
    var name = options.name || options.cache || options.cacheName;
    var env = options.env || options.environment;
    if (!env) {
      return cb({error:"missing environment name for cache"});
    }
    if (!name) {
      return cb({error:"missing name for cache"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create Cache %s', name));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'caches') + '?name=' + name;
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({
        description: "cache for general purpose use",
        distributed : true,
        expirySettings: {
          timeoutInSec : { value : 86400 },
          valuesNull: false
        },
        compression: {
          minimumSizeInKB: 1024
        },
        persistent: false,
        skipCacheIfElementSizeInKBExceeds: "2048",
        diskSizeInMB: 0,
        overflowToDisk: false,
        maxElementsOnDisk: 1,
        maxElementsInMemory: 3000000,
        inMemorySizeInKB: 8000
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  };

  Cache.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/caches/:cachename
    // Authorization: :edge-auth
    var conn = this.conn;
    var name = options.name || options.cache || options.cacheName;
    var env = options.env || options.environment;
    if (!env) {
      return cb({error:"missing environment name for cache"});
    }
    if (!name) {
      return cb({error:"missing name for cache"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete Cache %s', name));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'caches', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = Cache;

}());
