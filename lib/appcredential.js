// appcredential.js
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
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        request = require('request'),
        merge   = require('merge'),
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
    var urlTail = sprintf('developers/%s/apps/%s/keys/%s',
                          options.developerEmail || options.email,
                          options.appName,
                          options.key);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete credential %s', urlTail));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, urlTail);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  AppCredential.prototype.find = function(options, cb) {
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('find key %s', options.key));
    }
    conn.org.apps.get({expand:true}, function(e, result) {
      if (e) {return cb(e);}
      var found = false;
      result.app.forEach(function(app) {
        if ( !found && app.credentials) app.credentials.forEach(function(cred){
          if ( !found && cred.consumerKey == options.key) { found = {app:app, cred:cred}; }
        });
      });

      if (found) {
        conn.org.developers.get({id:found.app.developerId}, function(e, developer) {
          if (e) {return cb(e);}
          return cb(null, {
            key : options.key,
            appName : found.app.name,
            appId : found.app.appId,
            developerId : found.app.developerId,
            developer : {
              firstName : developer.firstName,
              lastName : developer.lastName,
              userName : developer.userName,
              email : developer.email
            }
          });
        });
      }
      else {
        cb(null);
      }
    });
  };

  function revokeOrApprove(conn, options, cb) {
    // POST -H content-type:application/octet-stream
    //  /v1/o/ORGNAME/developers/DEVELOPERID/apps/APPNAME/keys/CONSUMERKEY?action=ACTION
    if(options.action != 'revoke' && options.action != 'approve') {
      return cb({error:"missing or invalid action"});
    }
    if( ! options.developerEmail) {
      return cb({error:"missing developerEmail"});
    }
    if( ! options.appName) {
      return cb({error:"missing appName"});
    }
    if( ! options.key) {
      return cb({error:"missing key"});
    }
    var urlTail = sprintf('developers/%s/apps/%s/keys/%s',
                          options.developerEmail || options.email,
                          options.appName,
                          options.key);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('%s credential %s', options.action, urlTail));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('%s?action=%s', urlTail, options.action));
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200], cb));
    });
  }

  AppCredential.prototype.revoke = function(options, cb) {
    var conn = this.conn;
    revokeOrApprove(conn, merge(options, {action:'revoke'}), cb);
  };

  AppCredential.prototype.approve = function(options, cb) {
    var conn = this.conn;
    revokeOrApprove(conn, merge(options, {action:'approve'}), cb);
  };

  module.exports = AppCredential;

}());
