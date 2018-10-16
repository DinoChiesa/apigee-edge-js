// developerApp.js
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
  const request = require('request'),
        utility = require('./utility.js'),
        path    = require('path'),
        merge   = require('merge'),
        urljoin = require('url-join'),
        sprintf = require('sprintf-js').sprintf,
        common  = require('./common.js'),
        DEFAULT_CREDENTIAL_EXPIRY = -1;

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
        keyExpiresIn = common.resolveExpiry(options.expiry);
      }
      else {
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('Using default expiry of %d', keyExpiresIn));
        }
      }
      // inbound attributes can be one of 3 forms:
      // - array of string (wach string a colon-separated pair)
      // - js hash of prop:value pairs
      // - array of hash, each containing key/value pair
      var attributes1 = common.maybeReformAttributes(options.attributes);
      var appAttributes = common.hashToArrayOfKeyValuePairs(merge(attributes1 || {}, {
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
    var discriminator = options.developer || options.developerId || options.developerEmail || options.email ;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete App %s for Developer %s', name, discriminator));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'developers', discriminator, 'apps', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  DeveloperApp.prototype.get = function(options, cb) {
    var conn = this.conn;
    var name = options.appName || options.name || options.app;
    var discriminator = options.developer || options.developerId || options.developerEmail || options.email ;
    if (!discriminator) {
      throw new Error("missing developer email or id");
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (name) ?
        urljoin(conn.urlBase, 'developers', discriminator, 'apps', name) :
        urljoin(conn.urlBase, 'developers', discriminator, 'apps') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  function revokeOrApprove(conn, options, cb) {
    // POST -H content-type:application/octet-stream
    //  /v1/o/ORGNAME/developers/DEVELOPERID/apps/APPNAME?action=ACTION
    if(options.action != 'revoke' && options.action != 'approve') {
      return cb({error:"missing or invalid action"});
    }
    var discriminator = options.developer || options.developerId || options.developerEmail || options.email ;
    if( ! discriminator ) {
      return cb({error:"missing developer ID or email"});
    }

    if( ! options.app && ! options.appName ) {
      return cb({error:"missing app and appName"});
    }

    let urlTail = sprintf('developers/%s/apps/%s',
                          discriminator, options.app || options.appName);

    if (conn.verbosity>0) {
      utility.logWrite(sprintf('%s app %s', options.action, urlTail));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('%s?action=%s', urlTail, options.action));
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [204], cb));
    });
  }

  DeveloperApp.prototype.revoke = function(options, cb) {
    var conn = this.conn;
    revokeOrApprove(conn, merge(options, {action:'revoke'}), cb);
  };

  DeveloperApp.prototype.approve = function(options, cb) {
    var conn = this.conn;
    revokeOrApprove(conn, merge(options, {action:'approve'}), cb);
  };

  module.exports = DeveloperApp;

}());
