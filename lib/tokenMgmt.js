// tokenMgmt.js
// ------------------------------------------------------------------
//
// functions for helping with management of user tokens for Apigee Edge Admin APIs.
//
// created: Sun Apr 16 14:57:16 2017
// last saved: <2017-April-25 18:24:24>

var path = require('path'),
    fs = require('fs'),
    os = require('os'),
    stashedTokens;

module.exports = {
  expiry         : expiry,
  isNotExpired   : isNotExpired,
  currentToken   : currentToken,
  readTokenStash : readTokenStash,
  stashToken     : stashToken
};

var tokenStashFile = path.join(os.homedir(), '.apigee-edge-tokens');

function expiry(token) {
  return token.issued_at + (token.expires_in * 1000);
}

function isNotExpired(token) {
  var fudge = 90 * 1000; // in milliseconds
  var now = (new Date()).valueOf() - fudge;
  var result = token && token.expires_in && token.access_token &&
    token.issued_at && (expiry(token) > now);
  return result;
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

function currentToken(user) {
  var tokens = readTokenStash();
  var userEntry = tokens && tokens[user];
  return userEntry;
}

function stashToken(user, newToken) {
  var tokens = readTokenStash();
  if ( ! tokens) { tokens = {}; }
  newToken.issued_at = (new Date()).valueOf();
  tokens[user] = newToken;  // possibly overwrite existing entry
  // keep only unexpired tokens
  tokens = Object.keys(tokens)
          .filter( key => isNotExpired(tokens[key]) )
          .reduce( (res, key) => (res[key] = tokens[key], res), {} );
  fs.writeFileSync(tokenStashFile, JSON.stringify(tokens, null, 2));
  fs.chmodSync(tokenStashFile, '600');
  stashedTokens = tokens;
  return tokens;
}
