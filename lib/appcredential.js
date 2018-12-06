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
  const utility     = require('./utility.js'),
        common      = require('./common.js'),
        promiseWrap = require('./promiseWrap.js'),
        request     = require('request'),
        merge       = require('merge'),
        urljoin     = require('url-join'),
        sprintf     = require('sprintf-js').sprintf,
        DEFAULT_CREDENTIAL_EXPIRY = -1;

  // comment out to debug
  //request.debug = true;

  function AppCredential(conn) {this.conn = conn;}

  AppCredential.prototype.add = promiseWrap(function(options, cb) {
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

    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
        var attributes = (options.attributes) ?
          common.hashToArrayOfKeyValuePairs(options.attributes) : [];

      if (options.consumerKey || options.clientId) {
        // attach the specified {key, secret} to the app as a new credential
        requestOptions.url = urljoin(conn.urlBase,
                                     sprintf('developers/%s/apps/%s/keys/create',
                                             options.developerEmail,
                                             options.appName));
        requestOptions.body = JSON.stringify({
          consumerKey : options.consumerKey || options.clientId,
          consumerSecret : options.consumerSecret || options.clientSecret || common.generateRandomString()
        });
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('POST %s', requestOptions.url));
        }

        request.post(requestOptions, function(e, result) {
          // {
          //   "apiProducts": [],
          //   "attributes": [],
          //   "consumerKey": "17D7ECDF93314B9CBBDE8025308DC",
          //   "consumerSecret": "XYZzzz1098198198198",
          //   "issuedAt": 1538506759471,
          //   "scopes": [],
          //   "status": "approved"
          // }

          if (e) {return cb(e);}
          // now add the product to the credential
          requestOptions.url = urljoin(conn.urlBase,
                                       sprintf('developers/%s/apps/%s/keys/%s',
                                               options.developerEmail,
                                               options.appName,
                                               options.consumerKey || options.clientId));
          requestOptions.body = JSON.stringify({
            apiProducts : [options.apiProduct],
            attributes: attributes
          });
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('POST %s', requestOptions.url));
          }
          request.post(requestOptions, common.callback(conn, [200], cb));
        });
      }
      else {
        // ask Edge to generate a new credential
        requestOptions.url = urljoin(conn.urlBase,
                                     sprintf('developers/%s/apps/%s',
                                             options.developerEmail,
                                             options.appName));
        var keyExpiresIn = DEFAULT_CREDENTIAL_EXPIRY;
        if (options.expiry) {
          keyExpiresIn = common.resolveExpiry(options.expiry);
        }
        requestOptions.body = JSON.stringify({
          apiProducts : options.products || options.apiProducts || [],
          attributes : attributes,
          keyExpiresIn : keyExpiresIn
        });
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('POST %s', requestOptions.url));
        }
        request.post(requestOptions, common.callback(conn, [201], cb));
      }
    });
  });

  AppCredential.prototype.del = promiseWrap(function(options, cb) {
    // DELETE /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY
    var conn = this.conn;
    var urlTail = sprintf('developers/%s/apps/%s/keys/%s',
                          options.developerEmail || options.email,
                          options.appName,
                          options.key);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete credential %s', urlTail));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, urlTail);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  });

  AppCredential.prototype.find = promiseWrap(function(options, cb) {
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('find key %s', options.key));
    }
    conn.org.apps.get({expand:true}, function(e, result) {
      // will this fail for large number of apps?
      // need to page?
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
  });

  function revokeOrApprove0(conn, options, cb) {
    // POST -H content-type:application/octet-stream
    //  /v1/o/ORGNAME/developers/DEVELOPERID/apps/APPNAME/keys/CONSUMERKEY?action=ACTION
    //
    // -or-
    //
    // POST -H content-type:application/octet-stream
    //  /v1/o/ORGNAME/developers/DEVELOPERID/apps/APPNAME/keys/CONSUMERKEY/apiproducts/PRODUCT?action=ACTION
    let item = 'credential';
    let devDiscriminator = options.developer || options.developerId || options.developerEmail || options.email;
    let urlTail = sprintf('developers/%s/apps/%s/keys/%s',
                          devDiscriminator,
                          options.appName,
                          options.key);
    if (options.product) {
      urlTail +=  sprintf('/apiproducts/%s', options.product);
      item = 'product';
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('%s %s %s', options.action, item, urlTail));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('%s?action=%s', urlTail, options.action));
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [204], cb));
    });
  }

  function revokeOrApprove(conn, options, cb) {
    if(options.action != 'revoke' && options.action != 'approve') {
      return cb({error:"missing or invalid action"});
    }
    if( ! options.key) {
      return cb({error:"missing key"});
    }
    var devDiscriminator = options.developer || options.developerId || options.developerEmail || options.email;
    if( devDiscriminator && options.appName) {
      return revokeOrApprove0(conn, options, cb);
    }

    // first, need to find the key
    conn.org.appcredentials.find({key:options.key}, function(e, found) {
      if (e) { return cb(e);}
      if ( ! found) {return cb(null, false);}
      var options2 = {
            developerId : found.developerId,
            key : found.key,
            appName : found.appName,
            action : options.action
          };
      revokeOrApprove0(conn, options2, (e, result) => {
        return cb(e, true);
      });
    });
  }

  AppCredential.prototype.revoke = promiseWrap(function(options, cb) {
    var conn = this.conn;
    revokeOrApprove(conn, merge(options, {action:'revoke'}), cb);
  });

  AppCredential.prototype.approve = promiseWrap(function(options, cb) {
    var conn = this.conn;
    revokeOrApprove(conn, merge(options, {action:'approve'}), cb);
  });

  module.exports = AppCredential;

}());
