/* jshint esversion: 6, node: true, strict:false */

module.exports = function getLoginBaseUrl(options) {
  if (options.ssoZone) {
    return 'https://' + options.ssoZone + '.login.apigee.com';
  }
  else if (options.ssoUrl) {
    return options.ssoUrl;
  }
  else {
    return 'https://login.apigee.com';
  }
};
