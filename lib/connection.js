// connection.js
// ------------------------------------------------------------------
//
// created: Tue Apr 10 16:18:21 2018
// last saved: <2018-May-18 17:39:54>

(function (){
  'use strict';
  const merge                         = require('merge'),
        request                       = require('request'),
        sprintf                       = require('sprintf-js').sprintf,
        utility                       = require('./utility.js'),
        common                        = require('./common.js'),
        tokenMgmt                     = require('./tokenMgmt.js'),
        qs                            = require('qs'),
        gDefaultBasicAuthBlobForLogin = 'ZWRnZWNsaTplZGdlY2xpc2VjcmV0';

  function mask(orig) {
    var obj = {};
    Object.keys(orig).forEach( (key) => {
      obj[key] = ((key === 'access_token') || (key === 'refresh_token')) ? '***' : orig[key];
    });
    return obj;
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
          utility.logWrite('POST error: ' + JSON.stringify(e));
        }
        else {
          var masked = mask(result);
          utility.logWrite('POST result: ' + JSON.stringify(masked));
        }
      }
      if ( ! e && result) {
        result.issued_at = (new Date()).valueOf();
        if (formparams.username) {
          conn.user = formparams.username;
        }
        tokenMgmt.stashToken(conn.user, conn.mgmtServer, result);
        conn.requestHeaders.authorization = 'Bearer ' + result.access_token;
      }
      cb(e, result);
    }));
  }

  function Connection() { }

  Connection.prototype.refreshToken = function(expiredToken, cb) {
    var conn = this;
    var formparams = {
          refresh_token: expiredToken.refresh_token,
          grant_type : 'refresh_token'
        };
    return invokeTokenEndpoint(conn, formparams, cb);
  };

  Connection.prototype.getNewToken = function(arg1, cb) {
    var conn = this;
    var formparams = { grant_type : 'password' };
    if ( typeof arg1 == 'string' ) {
      formparams = merge(formparams, { username: conn.user, password: arg1 });
    }
    else if (arg1.passcode) {
      formparams = merge(formparams, { response_type: 'token', passcode: arg1.passcode });
    }
    else if (arg1.password) {
      formparams = merge(formparams, { username: conn.user, password: arg1.password });
      if (arg1.mfa_token) {
        formparams = merge(formparams, { mfa_token: arg1.mfa_token });
      }
    }
    return invokeTokenEndpoint(conn, formparams, cb);
  };

  module.exports = Connection;

}());
