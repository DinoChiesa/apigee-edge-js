// environment.js
// ------------------------------------------------------------------
//
// created: Tue Apr 10 16:23:26 2018
// last saved: <2018-April-13 14:02:25>

(function (){
  'use strict';
  const common  = require('./common.js'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf,
        request = require('request'),
        utility = require('./utility.js');

  function Environment(conn) {this.conn = conn;}

  function internalGetEnvironments(conn, options, cb) {
    // if (conn.environments) {
    //   return cb(null, conn.environments);
    // }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'e', options.name):
        urljoin(conn.urlBase, 'e') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], function(e, result){
        //if ( ! e) {conn.environments = result;} // cache
        cb(e, result);
      }));
    });
  }

  Environment.prototype.get = function(options, cb) {
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite('get environments');
    }
    internalGetEnvironments(conn, options, cb);
  };

  Environment.prototype.getVhosts = function(options, cb) {
    var conn = this.conn;
    var name = options.environmentName || options.environment || options.name;
    if (!name) {
      throw new Error("missing environment name");
    }
    if (conn.verbosity>0) {
      utility.logWrite('get vhosts');
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.vhost) ?
        urljoin(conn.urlBase, 'e', name, 'virtualhosts', options.vhost):
        urljoin(conn.urlBase, 'e', name, 'virtualhosts');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = Environment;

}());
