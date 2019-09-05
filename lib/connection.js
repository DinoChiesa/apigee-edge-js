// connection.js
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
  const merge       = require('merge'),
        request     = require('request'),
        sprintf     = require('sprintf-js').sprintf,
        utility     = require('./utility.js'),
        common      = require('./common.js'),
        tokenMgmt   = require('./tokenMgmt.js'),
        promiseWrap = require('./promiseWrap.js'),
        qs          = require('qs'),
        gDefaultBasicAuthBlobForLogin = 'ZWRnZWNsaTplZGdlY2xpc2VjcmV0';

  function mask(orig) {
    var obj = {};
    Object.keys(orig).forEach( (key) => {
      obj[key] = ((key === 'access_token') || (key === 'refresh_token')) ? '***' : orig[key];
    });
    return obj;
  }

  function shortString(s){
    if (s.length > 32)
      s = s.substring(0, 32) + '...';
      return s.replace(new RegExp('\n', 'g'), ' ');
  }

  function invokeTokenEndpoint(conn, formparams, cb) {
    var requestOptions = {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization' : 'Basic ' + (conn.basicAuthBlobForLogin || gDefaultBasicAuthBlobForLogin )
          },
          body : qs.stringify(formparams),
          url : conn.loginBaseUrl + '/oauth/token'
        };
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, common.callback(conn, [200], function(e, result) {
      if (conn.verbosity>0) {
        if (e) {
          utility.logWrite('POST error: ' + e.message);
        }
        else if (typeof result == 'string') {
          utility.logWrite('POST result (string): ' + shortString(result));
        }
        else {
          var masked = mask(result);
          utility.logWrite('POST result: ' + JSON.stringify(masked));
        }
      }
      if (e) {
        return cb(e, result);
      }
      if (result && typeof result == 'object' && result.access_token) {
        result.issued_at = (new Date()).valueOf();
        if (formparams.username) {
          conn.user = formparams.username;
        }
        tokenMgmt.stashToken(conn.user, conn.loginBaseUrl, conn.mgmtServer, result);
        conn.requestHeaders.authorization = 'Bearer ' + result.access_token;
        delete conn.org.passcode;
        delete conn.org.password;
        return cb(null, result);
      }

      return cb(new Error("invalid token response"), result);
    }));
  }

  function Connection() { }

  Connection.prototype.getExistingToken = promiseWrap(function(cb) {
    let conn = this;
    let existingToken = tokenMgmt.currentToken(conn.user, conn.loginBaseUrl, conn.mgmtServer);
    cb(null, existingToken);
  });

  Connection.prototype.refreshToken = promiseWrap(function(expiredToken, cb) {
    let conn = this;
    if (cb == null) { cb = expiredToken; expiredToken = null;}
    let existingToken = expiredToken || tokenMgmt.currentToken(conn.user, conn.loginBaseUrl, conn.mgmtServer);
    let formparams = {
          refresh_token: existingToken.refresh_token,
          grant_type : 'refresh_token'
        };
    return invokeTokenEndpoint(conn, formparams, cb);
  });

  Connection.prototype.getNewToken = promiseWrap(function(arg1, cb) {
    var conn = this;
    var formparams = { grant_type : 'password' };
    if ( typeof arg1 == 'string' ) {
      // assume it is a password
      formparams = merge(formparams, { username: conn.user, password: arg1 });
    }
    else if (arg1.passcode) {
      // exchange passcode for token
      formparams = merge(formparams, { response_type: 'token', passcode: arg1.passcode });
    }
    else if (arg1.password) {
      // this is not well tested
      formparams = merge(formparams, { username: conn.user, password: arg1.password });
      if (arg1.mfa_token) {
        formparams = merge(formparams, { mfa_token: arg1.mfa_token });
      }
    }
    return invokeTokenEndpoint(conn, formparams, cb);
  });

  module.exports = Connection;

}());
