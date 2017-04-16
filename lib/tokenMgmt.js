// tokenMgmt.js
// ------------------------------------------------------------------
//
// functions for helping with management of user tokens for Apigee Edge Admin APIs.
//
// created: Sun Apr 16 14:57:16 2017
// last saved: <2017-April-16 15:57:59>

var path = require('path'),
    fs = require('fs'),
    os = require('os');

module.exports = {
  currentToken   : currentToken,
  readTokenStash : readTokenStash,
  stashToken     : stashToken
};

var tokenStashFile = path.join(os.homedir(), '.apigee-edge-tokens');

function isNotExpired(token) {
  var fudge = 120 * 1000; // in seconds
  var now = (new Date()).valueOf() - fudge;
  var result = token && token.expires_in && token.access_token &&
    token.issued_at && (token.issued_at + (token.expires_in * 1000) > now);
  return result;
}

function readTokenStash() {
  if (fs.existsSync(tokenStashFile)) {
    var tokens = JSON.parse(fs.readFileSync(tokenStashFile, 'utf8'));
    return tokens;
  }
  return null;
}

function currentToken(user) {
  var tokens = readTokenStash();
  var userEntry = tokens && tokens[user];
  if (userEntry) {
    return (isNotExpired(userEntry)) ? userEntry : null;
  }
  return null;
}

function stashToken(user, newToken) {
  var tokens = readTokenStash();
  if ( ! tokens) { tokens = {}; }
  newToken.issued_at = (new Date()).valueOf();
  tokens[user] = newToken;
  // keep only unexpired tokens
  tokens = Object.keys(tokens)
          .filter( key => isNotExpired(tokens[key]) )
          .reduce( (res, key) => (res[key] = tokens[key], res), {} );
  fs.writeFileSync(tokenStashFile, JSON.stringify(tokens, null, 2));
  fs.chmodSync(tokenStashFile, '600');
  return tokens;
}
