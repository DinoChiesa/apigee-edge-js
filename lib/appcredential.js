// appcredential.js
// ------------------------------------------------------------------
//
// created: Tue Apr 10 17:26:02 2018
// last saved: <2018-May-18 17:51:01>

(function (){
  'use strict';
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        request = require('request'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf;

  function AppCredential(conn) {this.conn = conn;}

  AppCredential.prototype.add = function(options, cb) {
    // POST /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/create
    // {
    //   "consumerKey": "CDX-QAoqiu93ui20170301",
    //   "consumerSecret": "SomethingSomethingBeef"
    // }
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Add Credential %s/apps/%s',
                              options.developerEmail,
                              options.appName));
    }

    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('developers/%s/apps/%s/keys/create',
                                           options.developerEmail,
                                           options.appName));
      requestOptions.body = JSON.stringify({
        consumerKey : options.consumerKey,
        consumerSecret : options.consumerSecret
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  };

  AppCredential.prototype.del = function(options, cb) {
    // DELETE /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete Credential %s/apps/%s/keys/%s',
                              options.developerEmail,
                              options.appName,
                              options.key));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('developers/%s/apps/%s/keys/%s',
                                           options.developerEmail,
                                           options.appName,
                                           options.key));

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = AppCredential;

}());
