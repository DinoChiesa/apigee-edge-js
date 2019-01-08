// common.js
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
  const tokenMgmt = require('./tokenMgmt.js'),
        utility   = require('./utility.js'),
        jsonRe    = new RegExp("application/json"),
        merge     = require('merge');

  function generateRandomString(L) {
    return generateRandomAlphaString(L);
  }

  function generateRandomAlphaString(L) {
    function c() {
      return (Math.floor(Math.random() * 5)<1) ?
        (Math.floor(Math.random() * 10) + 48) : // number
        String.fromCharCode(65 + Math.floor(Math.random() * 26) + (Math.floor(Math.random() * 2) * 32)); // alpha
    }
    var i, s = '';
    L = L || (Math.floor(Math.random() * 7) + 13);
    for (i=0; i<L; i++) {
      s += c();
    }
    return s;
  }

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

  function callback(conn, okstatuses, cb) {
    return function (error, response, body) {
      var result;
      if (conn.verbosity>0) {
        utility.logWrite('status: ' + response.statusCode );
      }
      if (error) {
        result = body ? JSON.parse(body): null;
        return cb(error, result);
      }
      if ( !okstatuses || (okstatuses.length == 0) || (okstatuses.indexOf(response.statusCode) > -1)) {
        if (jsonRe.test(response.headers["content-type"])) {
          result = JSON.parse(body);
        }
        cb(null, result || body);
      }
      else {
        result = body ? JSON.parse(body): null;
        cb(new Error({error: 'bad status', statusCode: response.statusCode }), result);
      }
    };
  }

  // to handle expiry of the oauth token
  function insureFreshToken(conn, cb) {
    var rh = conn.requestHeaders;
    if (rh && rh.authorization &&
        conn.user && rh.authorization.indexOf('Bearer ') === 0) {
      var stashedToken = tokenMgmt.currentToken(conn.user, conn.mgmtServer);
      if (tokenMgmt.isInvalidOrExpired(stashedToken)) {
        return conn.refreshToken(stashedToken, function(e, result){
          if (e) {
            throw new Error('error refreshing token: ' + e );
          }
          cb(merge(true, { headers: rh}));
        });
      }
      else {
        cb(merge(true, { headers: rh}));
      }
    }
    else {
      cb(merge(true, { headers: rh}));
    }
  }

  function base64Encode(s) {
    return new Buffer.from(s).toString('base64');
  }

  function arrayOfKeyValuePairsToHash(properties) {
    if (Array.isArray(properties)) {
      var hash = {};
      properties.forEach(function(item) {
        hash[item.name] = item.value;
      });
      return hash;
    }
    return properties;
  }

  function hashToArrayOfKeyValuePairs(hash) {
    if (Array.isArray(hash)) { return hash; }
    return Object.keys(hash).map(function(key){
      return { name : key, value : hash[key]};
    });
  }

  function maybeReformAttributes(ary1) {
    if (Array.isArray(ary1)) {
      if (typeof ary1[0] == 'string') {
        let ary2 = [];
        ary1.forEach((item) => {
          var parts = item.split(':');
          ary2[parts[0]] = parts[1];
        });
        return ary2;
      }
    }
    return ary1;
  }

  module.exports = {
    insureFreshToken,
    callback,
    resolveExpiry,
    generateRandomString,
    base64Encode,
    arrayOfKeyValuePairsToHash,
    hashToArrayOfKeyValuePairs,
    maybeReformAttributes
  };

}());
