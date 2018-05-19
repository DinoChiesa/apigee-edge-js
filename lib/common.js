// common.js
// ------------------------------------------------------------------
//
// created: Tue Apr 10 16:11:16 2018
// last saved: <2018-May-18 17:53:05>

(function (){
  'use strict';
  const tokenMgmt = require('./tokenMgmt.js'),
        utility   = require('./utility.js'),
        jsonRe    = new RegExp("application/json"),
        merge     = require('merge');

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
      if (okstatuses.indexOf(response.statusCode) > -1) {
        if (jsonRe.test(response.headers["content-type"])) {
          result = JSON.parse(body);
        }
        cb(null, result || body);
      }
      else {
        result = body ? JSON.parse(body): null;
        cb({error: 'bad status', statusCode: response.statusCode }, result);
      }
    };
  }

  // to handle expiry of the oauth token
  function mergeRequestOptions(conn, cb) {
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
    var hash = {};
    properties.forEach(function(item) {
      hash[item.name] = item.value;
    });
    return hash;
  }

  function hashToArrayOfKeyValuePairs(hash) {
    return Object.keys(hash).map(function(key){
      return { name : key, value : hash[key]};
    });
  }


  module.exports = {
    mergeRequestOptions : mergeRequestOptions,
    callback : callback,
    base64Encode: base64Encode,
    arrayOfKeyValuePairsToHash: arrayOfKeyValuePairsToHash,
    hashToArrayOfKeyValuePairs : hashToArrayOfKeyValuePairs
  };

}());
