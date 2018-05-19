// developerApp.js
// ------------------------------------------------------------------
//
// created: Tue Apr 10 16:28:36 2018
// last saved: <2018-May-18 18:06:05>

(function (){
  'use strict';
  const request = require('request'),
        utility = require('./utility.js'),
        path    = require('path'),
        merge   = require('merge'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf,
        common  = require('./common.js'),
        DEFAULT_CREDENTIAL_EXPIRY = -1;

  /*
   * convert a simple timespan string, expressed in days, hours, minutes, or
   * seconds, such as 30d, 12d, 8h, 45m, 30s, into a numeric quantity in
   * seconds.
   */
  function resolveExpiry(subject) {
    var pattern = new RegExp('^([1-9][0-9]*)([smhdw])$','i');
    var multipliers = {s: 1, m: 60, h : 60*60, d:60*60*24, w: 60*60*24*7, y: 60*60*24*365};
    var match = pattern.exec(subject);
    if (match) {
      return match[1] * multipliers[match[2]] * 1000;
    }
    return -1;
  }

  function DeveloperApp(conn) {this.conn = conn;}

  DeveloperApp.prototype.create = function(options, cb) {
    // var THIRTY_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 30;
    // POST :e2emgmtserver/v1/o/dchiesa2/developers/Elaine@example.org/apps
    // Content-type: application/json
    // Authorization: :edge-auth-e2e
    //
    // {
    //   "attributes" : [ {
    //     "name" : "attrname",
    //     "value" : "attrvalue"
    //   } ],
    //   "apiProducts": [ "Manual-Approval-1" ],
    //   "keyExpiresIn" : "86400000",
    //   "name" : "ElaineApp2"
    // }
    var conn = this.conn;
    var name = options.appName || options.name || options.app;
    var email = options.developer || options.developerEmail || options.email ;
    if ( !email || !name || !options.apiProduct) {
      return cb({error: "missing required inputs, one of {developer, appName, apiProduct}"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create App %s for %s', name, email));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'developers', email, 'apps');
      var keyExpiresIn = DEFAULT_CREDENTIAL_EXPIRY;
      if (options.expiry) {
        keyExpiresIn = resolveExpiry(options.expiry);
      }
      else {
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('Using default expiry of %d', keyExpiresIn));
        }
      }
      var appAttributes = common.hashToArrayOfKeyValuePairs(merge(options.attributes || {}, {
            "tool": "nodejs " + path.basename(process.argv[1])
          }));
      requestOptions.body = JSON.stringify({
        attributes : appAttributes,
        apiProducts: [options.apiProduct],
        keyExpiresIn : keyExpiresIn,
        name: name
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      //request.debug = true;
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  };

  DeveloperApp.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/developers/:developer/apps/:appname
    // Authorization: :edge-auth
    var conn = this.conn;
    var name = options.appName || options.name || options.app;
    var email = options.developer || options.developerEmail || options.email ;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete App %s for Developer %s', name, email));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'developers', email, 'apps', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  DeveloperApp.prototype.get = function(options, cb) {
    var conn = this.conn;
    var name = options.appName || options.name || options.app;
    var email = options.developer || options.developerEmail || options.email ;
    if (!email) {
      throw new Error("missing developer email");
    }
    // if (conn.verbosity>0) {
    //   if (options.appName || options.name) {
    //   utility.logWrite(sprintf('Get Developer App %s/apps/%s',
    //                           options.developerEmail,
    //                            options.appName));
    //   }
    //   else {
    //     utility.logWrite(sprintf('Get Developer Apps %s',
    //                              options.developerEmail));
    //   }
    // }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (name) ?
        urljoin(conn.urlBase, 'developers', email, 'apps', name) :
        urljoin(conn.urlBase, 'developers', email, 'apps') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = DeveloperApp;

}());
