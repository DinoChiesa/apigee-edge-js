// edge.js
// library of functions for Apigee Edge.
// ------------------------------------------------------------------
// Copyright 2017-2018 Google LLC.
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

  const netrc               = require('netrc')(),
        urljoin             = require('url-join'),
        sprintf             = require('sprintf-js').sprintf,
        tokenMgmt           = require('./tokenMgmt.js'),
        utility             = require('./utility.js'),
        common              = require('./common.js'),
        loginBaseUrl        = require('./loginBaseUrl.js'),
        promiseWrap         = require('./promiseWrap.js'),
        Organization        = require('./organization.js'),
        Connection          = require('./connection.js'),
        request             = require('request'),
        gEdgeSaasMgmtServer = 'https://api.enterprise.apigee.com';

  //require('request-debug')(request);
  function trimSlash(s) {
    if (s.slice(-1) == '/') { s = s.slice(0, -1); }
    return s;
  }

  function maybeSetSsoParams(c, options) {
    c.loginBaseUrl = loginBaseUrl(options);
    if (options.ssoClientId && options.ssoClientSecret) {
      c.basicAuthBlobForLogin = common.base64Encode(options.ssoClientId + ':' + options.ssoClientSecret);
    }
  }

  function checkMgmtServerFormat(mgmtserver) {
    if ( ! mgmtserver || ! (mgmtserver.startsWith('http://') || mgmtserver.startsWith('https://'))) {
      throw new Error("use an http or https url for the management server.");
    }
  }

  function Edge(){}

  Edge.prototype.connect = promiseWrap(function(options, cb) {
    var org;
    // NB: user and username are used interchangeably. user precedes.
    //
    // options = {user: "foo", password: "bar", org: "orgname"}
    // ==> will use the provided password to obtain a token
    //
    // options = {user: "foo", password: "bar", org: "orgname", no_token: true}
    // ==> will use HTTP Basic auth with the provided username and password (no token)
    //
    // options = {user: "foo", org: "orgname"}
    // ==> will prompt for password, then obtain a token
    //
    // options = {user: "foo", org: "orgname", no_token: true}
    // ==> will prompt for password, then use HTTP Basic auth
    //
    // options = {org: "orgname", netrc: true}
    // ==> will retrieve username and password from .netrc
    //
    // options = {org: "orgname", ssoZone: 'foo', passcode: 'xyz'}
    // ==> will exchange passcode for token within the ssozone
    function maybeGetNewToken() {
      if (!options.passcode && (!options.user || !options.password)) {
        throw new Error("missing username or password");
      }
      if (!options.no_token) {
        org = new Organization(c);
        c.org = org;
        let arg1 = {password:options.password}; // maybe undefined
        if (options.mfa_code) { arg1.mfa_code = options.mfa_code; }
        if (options.passcode) { arg1.passcode = options.passcode; }
        return c.getNewToken(arg1, function(e, result){ cb(e, org); });
      }
      else {
        // for some reason, the caller does not want to use tokens
        c.requestHeaders.authorization = 'Basic ' + common.base64Encode(options.user + ':' + options.password);
        org = new Organization(c);
        c.org = org;
        return org.get('', function(e, result){ cb(e, org); });
      }
    }

    var mgmtServer = trimSlash(options.mgmtServer || gEdgeSaasMgmtServer);
    var c = new Connection();
    if ( typeof cb != 'function' ) {
      throw new Error("missing callback");
    }
    if ( ! options.org ) {
      throw new Error("missing org");
    }
    c.orgname = options.org;

    maybeSetSsoParams(c, options);

    if ( options.netrc ) {
      if (options.verbosity) {
        utility.logWrite('searching .netrc for credentials....');
      }

      let authUrl = (options.ssoZone) ? c.loginBaseUrl : mgmtServer;
      authUrl = require('url').parse(authUrl);

      if ( ! netrc[authUrl.hostname]) {
        throw new Error("there is no entry for the management/login server in in the .netrc file.");
      }
      options.user = netrc[authUrl.hostname].login;
      options.password = netrc[authUrl.hostname].password;
    }

    let user = options.user || options.username;
    if ( ! user ) {
      throw new Error("missing user");
    }
    c.user = user;

    checkMgmtServerFormat(mgmtServer);
    c.mgmtServer = mgmtServer;
    if (options.verbosity) {
      utility.logWrite('connect: ' + JSON.stringify(c));
    }
    c.urlBase = urljoin(mgmtServer, '/v1/o/', options.org);
    c.requestHeaders = { accept : 'application/json'} ;
    c.verbosity = options.verbosity || 0;

    if ( ! options.no_token ) {
      let stashedToken;
      if (!options.no_token) {
          stashedToken = tokenMgmt.currentToken(user, c.loginBaseUrl, mgmtServer);
      }
      if (stashedToken) {
        if (options.verbosity) {
          utility.logWrite('found stashed token.');
        }
        org = new Organization(c);
        c.org = org;
        if ( tokenMgmt.isInvalidOrExpired(stashedToken)) {
          if (options.verbosity) {
            utility.logWrite('invalid or expired');
          }
          return c.refreshToken(stashedToken, function(e, result){
            if ( ! e ) { return cb(null, org); }
            if (c.verbosity) {
              utility.logWrite('refresh failed: ' + JSON.stringify(e) + '//' + JSON.stringify(result));
            }
            // failure can happen here if the refresh token is expired
            return maybeGetNewToken();
          });
        }
        if (options.verbosity) {
          utility.logWrite('valid and not expired');
        }
        c.requestHeaders.authorization = 'Bearer ' + stashedToken.access_token;
        return cb(null, org);
      }
      else {
        if (options.verbosity) {
          utility.logWrite('found no stashed token.');
        }
        return maybeGetNewToken();
      }
    }
    else {
      if (!options.password ) {
        throw new Error("missing password");
      }
      c.requestHeaders.authorization = 'Basic ' + common.base64Encode(user + ':' + options.password);
      org = new Organization(c);
      c.org = org;
      return org.get('', function(e, result){ cb(e, org); });
    }
  });

  module.exports = Edge;

}());
