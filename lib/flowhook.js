// flowhook.js
// ------------------------------------------------------------------
//
// created: Tue Apr 10 17:21:01 2018
// last saved: <2018-April-13 14:01:04>

(function (){
  'use strict';
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        request = require('request'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf;

    function FlowHook(conn) { this.conn = conn; }

  FlowHook.prototype.get = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/e/:envname/flowhooks
    // or
    // GET :mgmtserver/v1/o/:orgname/e/flowhooks/:flowhook
    var env = options.environment || options.env;
    if ( ! env) {
      return cb(new Error('missing option: environment'));
    }
    var conn = this.conn;
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'e', env, 'flowhooks', options.name) :
        urljoin(conn.urlBase, 'e', env, 'flowhooks') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  FlowHook.prototype.put = function(options, cb) {
    // PUT :mgmtserver/v1/o/:orgname/e/flowhooks/:flowhook
    // {
    //   "continueOnError" : "true",
    //   "name" : "myFlowHook2",
    //   "sharedFlow" : "CDX-SharedFlow"
    // }
    var env = options.environment || options.env;
    if ( ! env) {
      return cb(new Error('missing option: environment'));
    }
    if ( ! options.name) {
      return cb(new Error('missing option: name'));
    }
    if ( ! options.sharedFlow) {
      return cb(new Error('missing option: sharedFlow'));
    }
    var conn = this.conn;
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'flowhooks', options.name);
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({
        continueOnError: options.continueOnError || true,
        name : 'flowhook-' + new Date().valueOf(),
        sharedFlow : options.sharedFlow});
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('PUT %s', requestOptions.url));
      }
      request.put(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = FlowHook;

}());
