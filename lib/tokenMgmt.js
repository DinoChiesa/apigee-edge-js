// tokenMgmt.js
// functions for helping with management of user tokens for Apigee Edge Admin APIs.
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
/* global Buffer */

const path           = require('path'),
      fs             = require('fs'),
      os             = require('os'),
      tokenStashFile = path.join(os.homedir(), '.apigee-edge-tokens');

var stashedTokens;

function expiry(token) {
  // issued_at is in milliseconds; expires_in is in seconds. gah.
  return token.issued_at + (token.expires_in * 1000);
}

function isInvalidOrExpired(token) {
  if (!token || !token.expires_in || !token.access_token || !token.issued_at ){
    return true; // invalid
  }
  var now = (new Date()).getTime();
  var tokenExpiry = expiry(token);
  var adjustmentInMilliseconds = 30 * 1000;
  var adjustedNow = now + adjustmentInMilliseconds;
  var invalidOrExpired = (tokenExpiry < adjustedNow);
  return invalidOrExpired;
}

function readTokenStash() {
  if (stashedTokens) {
    return stashedTokens;
  }
  if (fs.existsSync(tokenStashFile)) {
    stashedTokens = JSON.parse(fs.readFileSync(tokenStashFile, 'utf8'));
    return stashedTokens;
  }
  return null;
}

function getTokenStashKey(user, loginBaseUrl, mgmtServer) {
  return user + '##' + mgmtServer + '##' + loginBaseUrl;
}

function currentToken(user, loginBaseUrl, mgmtServer) {
  const tokens = readTokenStash(),
        key = getTokenStashKey(user, loginBaseUrl, mgmtServer),
        userEntry = tokens && tokens[key];
  return userEntry;
}

function enhanceToken(token) {
  var iso = {};
  if (token.access_token) {
    //console.log('token: ' + JSON.stringify(token, null, 2));
    let parts = token.access_token.split(new RegExp('\\.'));
    if (parts && parts.length == 3) {
      try {
        let payload = Buffer.from(parts[1], 'base64').toString('utf-8'),
            claims = JSON.parse(payload);
        // The issued_at and expires_in properties on the token
        // WRAPPER are inconsistent with the actual token. So let's
        // overwrite them.
        if (claims.iat) {
          let d = new Date(claims.iat * 1000);
          token.issued_at = d.getTime(); // milliseconds
          iso.issued_at = d.toISOString();
        }
        if (claims.exp) {
          let d = new Date(claims.exp * 1000);
          iso.expires = d.toISOString();
          token.expires_in = claims.exp - claims.iat; // seconds
        }
      }
      catch (e) {
        // not a JWT; probably a googleapis opaque oauth token
        if (token.issued_at) {
          let d = new Date(token.issued_at);
          iso.issued_at = d.toISOString();
          if (token.expires_in) {
            let d = new Date(token.issued_at + token.expires_in * 1000);
            iso.expires = d.toISOString();
          }
        }
      }
    }
  }
  token.ISO = iso;
  return token;
}

function stashToken(user, loginBaseUrl, mgmtServer, newToken) {
  let tokens = readTokenStash();
  if ( ! tokens) { tokens = {}; }
  const key = getTokenStashKey(user, loginBaseUrl, mgmtServer);
  tokens[key] = newToken;  // possibly overwrite an existing entry

  // tokens = Object.keys(tokens)                                  // map object to array of keys
  //   .filter( k => !isInvalidOrExpired(tokens[k]) )              // keep only unexpired tokens
  //   .reduce( (res, key) => (res[key] = tokens[key], res), {} ); // map back to object

  let keptTokens = {};
  Object.keys(tokens).forEach( key => {
    if ( ! isInvalidOrExpired(tokens[key] )) {
      keptTokens[key] = enhanceToken(tokens[key]);
    }
  });
  fs.writeFileSync(tokenStashFile, JSON.stringify(keptTokens, null, 2));
  fs.chmodSync(tokenStashFile, '600');
  stashedTokens = tokens;
  return tokens;
}

module.exports = {
  expiry,
  isInvalidOrExpired,
  currentToken,
  readTokenStash,
  stashToken
};
