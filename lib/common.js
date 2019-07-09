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
/* global Buffer */

(function (){
  'use strict';
  const tokenMgmt = require('./tokenMgmt.js'),
        utility   = require('./utility.js'),
        merge     = require('merge'),
        jsonRe    = new RegExp("application/json");

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

  function safeJsonParse(response, body) {
    let isJson = jsonRe.test(response.headers["content-type"]);
    // this simple approach does not work because the
    // Edge API sometimes claims application/json erroneously.

    //return (isJson) ? (body ? JSON.parse(body): null) : body;

    if ( ! isJson) { return body; } // no parse
    if (body){
      try {
        //console.log('jsonparse ' + body);
        return JSON.parse(body);
      }
      catch (e) {
        response.headers["content-type"] = 'application/octet-stream';
        return body;
      }
    }
    return null;
  }

  function callback(conn, okstatuses, cb) {
    return function (error, response, body) {
      if (conn.verbosity>0) {
        if (response) {
          utility.logWrite('status: ' + response.statusCode);
        } else {
          utility.logWrite('no response');
        }
      }
      if ( ! response) {
        return cb(error || new Error("no response"), null);
      }
      if (error) {
        return cb(error, safeJsonParse(response, body));
      }
      if ( !okstatuses || (okstatuses.length == 0) || (okstatuses.indexOf(response.statusCode) > -1)) {
        cb(null, safeJsonParse(response, body));
      }
      else {
        let result = safeJsonParse(response, body);
        if (conn.verbosity>0) {
          utility.logWrite('result: ' + JSON.stringify(result) );
        }
        cb(new Error('bad status: ' + response.statusCode), result);
      }
    };
  }

  // to handle expiry of the oauth token
  function insureFreshToken(conn, cb) {
    var rh = conn.requestHeaders;
    if (rh && rh.authorization &&
        conn.user && rh.authorization.indexOf('Bearer ') === 0) {
      var stashedToken = tokenMgmt.currentToken(conn.user, conn.loginBaseUrl, conn.mgmtServer);
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
