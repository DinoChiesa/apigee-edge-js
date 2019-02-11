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

const path           = require('path'),
      fs             = require('fs'),
      os             = require('os'),
      tokenStashFile = path.join(os.homedir(), '.apigee-edge-tokens');

var stashedTokens;

function expiry(token) {
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

function stashToken(user, loginBaseUrl, mgmtServer, newToken) {
  let tokens = readTokenStash();
  if ( ! tokens) { tokens = {}; }
  const key = getTokenStashKey(user, loginBaseUrl, mgmtServer);
  tokens[key] = newToken;  // possibly overwrite existing entry

  // keep only unexpired tokens
  tokens = Object.keys(tokens)
          .filter( k => !isInvalidOrExpired(tokens[k]) )
          .reduce( (res, key) => (res[key] = tokens[key], res), {} );
  fs.writeFileSync(tokenStashFile, JSON.stringify(tokens, null, 2));
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
