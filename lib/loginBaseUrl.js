/* jshint esversion: 6, node: true, strict:false */

module.exports = function getLoginBaseUrl(options) {
  if (options.ssoZone) {
    return 'https://' + options.ssoZone + '.login.apigee.com';
  }
  if (options.ssoUrl) {
    return options.ssoUrl;
  }
  if (options.keyfile) {
    return 'https://oauth2.googleapis.com/token';
  }
  return 'https://login.apigee.com';
};
