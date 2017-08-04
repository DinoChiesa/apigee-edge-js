// tokenMgmt.js
// ------------------------------------------------------------------
//
// functions for helping with management of user tokens for Apigee Edge Admin APIs.
//
// created: Sun Apr 16 14:57:16 2017
// last saved: <2017-August-04 12:45:56>

var path = require('path'),
    fs = require('fs'),
    os = require('os'),
    stashedTokens;

module.exports = {
  expiry             : expiry,
  isInvalidOrExpired : isInvalidOrExpired,
  currentToken       : currentToken,
  readTokenStash     : readTokenStash,
  stashToken         : stashToken
};

var tokenStashFile = path.join(os.homedir(), '.apigee-edge-tokens');

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

function getTokenStashKey(user, mgmtServer) {
  return user + '##' + mgmtServer;
}

function currentToken(user, mgmtServer) {
  var tokens = readTokenStash();
  var key = getTokenStashKey(user, mgmtServer);
  var userEntry = tokens && tokens[key];
  return userEntry;
}

function stashToken(user, mgmtServer, newToken) {
  var tokens = readTokenStash();
  if ( ! tokens) { tokens = {}; }
  var key = getTokenStashKey(user, mgmtServer);
  tokens[key] = newToken;  // possibly overwrite existing entry

  // keep only unexpired tokens
  tokens = Object.keys(tokens)
          .filter( key => !isInvalidOrExpired(tokens[key]) )
          .reduce( (res, key) => (res[key] = tokens[key], res), {} );
  fs.writeFileSync(tokenStashFile, JSON.stringify(tokens, null, 2));
  fs.chmodSync(tokenStashFile, '600');
  stashedTokens = tokens;
  return tokens;
}
