// apiproduct.js
// ------------------------------------------------------------------

(function (){
  'use strict';
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        request = require('request'),
        path    = require('path'),
        merge   = require('merge'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf;

  function ApiProduct(conn) { this.conn = conn; }

  ApiProduct.prototype.create = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/apiproducts/:product
    // Content-Type: application/json
    // Authorization: :edge-auth
    //
    // {
    //   "name" : ":product",
    //   "attributes" : [ {"name": "created by", "value" : "emacs"} ],
    //   "approvalType" : "manual",
    //   "displayName" : ":product",
    //   "proxies" : ["proxy1", "proxy2"],
    //   "scopes" : ["read", "write", "something"],
    //   "environments" : [ "prod" ]
    // }
    var conn = this.conn;
    if (conn.verbosity>0) {
      if (options.proxy) {
        utility.logWrite(sprintf('Create API Product %s with proxy %s', options.productName, options.proxy));
      }
      else if (options.proxies) {
        utility.logWrite(sprintf('Create API Product %s with proxies %s', options.productName, JSON.stringify(options.proxies)));
      } else {
        utility.logWrite(sprintf('Create API Product %s with no proxy', options.productName));
      }
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'apiproducts');
      var prodAttributes = common.hashToArrayOfKeyValuePairs(merge(options.attributes || {}, {
            "tool": "nodejs " + path.basename(process.argv[1])
          }));
      var rOptions = {
            name : options.productName || options.name,
            proxies : [ ],
            attributes : prodAttributes,
            approvalType : options.approvalType || "manual",
            displayName : options.displayName || options.productName || options.name,
            environments : options.environments || options.envs,
            scopes : options.scopes
          };
      if (options.proxy) {
        rOptions.proxies.push(options.proxy);
      }
      else if (options.proxies && Array.isArray(options.proxies) ) {
        rOptions.proxies = options.proxies;
      }
      requestOptions.body = JSON.stringify(rOptions);

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      // request.debug = true;
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  };

  ApiProduct.prototype.get = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apiproducts
    // or
    // GET :mgmtserver/v1/o/:orgname/apiproducts/NAME_OF_PRODUCT
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'apiproducts', options.name) :
        urljoin(conn.urlBase, 'apiproducts') + (options.expand ? '?expand=true' : '');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  ApiProduct.prototype.update = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/apiproducts/NAME_OF_PRODUCT
    var name = options.productName || options.name;
    if ( ! name ) {
      return cb(new Error('missing name for apiproduct'));
    }
    var conn = this.conn;
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apiproducts', name);
      requestOptions.body = JSON.stringify(options);
      requestOptions.headers['content-type'] = 'application/json';
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200], cb));
    });
  };

  ApiProduct.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apiproducts/:apiproductname
    // Authorization: :edge-auth
    var conn = this.conn;
    var name = options.productName || options.name;
    if (!name) {
      return cb(new Error('missing name for apiproduct'));
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete API Product %s', name));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apiproducts', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = ApiProduct;

}());
