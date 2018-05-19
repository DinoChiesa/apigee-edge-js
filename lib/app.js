// app.js
// ------------------------------------------------------------------
//
// created: Tue Apr 10 17:23:25 2018
// last saved: <2018-May-18 17:43:42>

(function (){
  'use strict';
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        request = require('request'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf;

  function App(conn) {this.conn = conn;}

  App.prototype.get = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apps
    // or
    // GET :mgmtserver/v1/o/:orgname/apps/ID_OF_APP
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.id) ?
        urljoin(conn.urlBase, 'apps', options.id) :
        urljoin(conn.urlBase, 'apps') + (options.expand ? '?expand=true' : '');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  App.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apps/:appid
    // Authorization: :edge-auth
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete App %s', options.appId || options.id));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apps', options.appId || options.id);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = App;

}());
