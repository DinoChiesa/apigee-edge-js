// utility.js
// common utility functions used by the loader, exportAllItems, and deleteAllItems scripts.
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

(function (){
  const util         = require('util'),
        netrc        = require('netrc')(),
        tokenMgmt    = require('./tokenMgmt.js'),
        readlineSync = require('readline-sync');

  const commonOptions = [
      ['M' , 'mgmtserver=ARG', 'the base path, including optional port, of the Edge mgmt server. Defaults to https://api.enterprise.apigee.com . '],
      ['u' , 'username=ARG', 'org user with permissions to read Edge configuration.'],
      ['p' , 'password=ARG', 'password for the org user.'],
      ['n' , 'netrc', 'retrieve the username + password from the .netrc file. In lieu of -u/-p'],
      ['o' , 'org=ARG', 'the Edge organization.'],
      ['v' , 'verbose'],
      ['h' , 'help']
  ];

  function logWrite() {
    var time = (new Date()).toString(),
        tstr = '[' + time.substr(11, 4) + '-' +
      time.substr(4, 3) + '-' + time.substr(8, 2) + ' ' +
      time.substr(16, 8) + '] ';
    console.log(tstr + util.format.apply(null, arguments));
  }

  function elapsedToHHMMSS (elapsed) {
    function leadingPad(n, p, c) {
      var pad_char = typeof c !== 'undefined' ? c : '0';
      var pad = new Array(1 + p).join(pad_char);
      return (pad + n).slice(-pad.length);
    }
    elapsed = (typeof(elapsed) != 'number') ? parseInt(elapsed, 10) : elapsed;
    var hours   = Math.floor(elapsed / (3600 * 1000)),
        minutes = Math.floor((elapsed - (hours * 3600 * 1000)) / (60 * 1000)),
        seconds = Math.floor((elapsed - (hours * 3600 * 1000) - (minutes * 60 * 1000)) / 1000),
        ms = elapsed - (hours * 3600 * 1000) - (minutes * 60 * 1000) - seconds * 1000;

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds + '.' + leadingPad(ms, 3);
    return time;
  }


  function trimSlash(url) {
    if (url.endsWith('/')) { url = url.substring(0, url.length -1); }
    return url;
  }

  function verifyCommonRequiredParameters(options, getopt) {
    if ( !options.mgmtserver ) {
      options.mgmtserver = 'https://api.enterprise.apigee.com';
    }

    if ( !options.org ) {
      var org = process.env.ORG;
      if ( ! org ) {
        console.log('You must specify an Edge organization');
        getopt.showHelp();
        process.exit(1);
      }
      options.org = org;
    }

    if (options.netrc) {
      let mgmtUrl = require('url').parse(options.mgmtserver);
      if ( !mgmtUrl || !mgmtUrl.hostname) {
        console.log('The specified management server ('+ options.mgmtserver +') could not be parsed.');
        getopt.showHelp();
        process.exit(1);
      }
      if ( ! netrc[mgmtUrl.hostname]) {
        console.log('The specified host ('+ mgmtUrl.hostname +') is not present in the .netrc file.');
        getopt.showHelp();
        process.exit(1);
      }

      options.username = netrc[mgmtUrl.hostname].login;
      options.password = netrc[mgmtUrl.hostname].password;
    }

    if ( !options.username) {
      options.username = readlineSync.question(' USER NAME  : ');
    }

    var stashedToken = tokenMgmt.currentToken(options.username);
    if ( stashedToken && options.mgmtserver == 'https://api.enterprise.apigee.com') {
      options.token = stashedToken;
    }
    else {
      if ( !options.password) {
        options.password = readlineSync.question(' Password for ' + options.username + ' : ',
                                                 {hideEchoBack: true});
      }
    }

    if ( !options.token && (!options.username || !options.password)) {
      console.log('You must provide some way to authenticate to the Edge Management API');
      getopt.showHelp();
      process.exit(1);
    }
  }

  module.exports = {
    logWrite        : logWrite,
    trimSlash       : trimSlash,
    elapsedToHHMMSS : elapsedToHHMMSS,
    commonOptions   : commonOptions,
    verifyCommonRequiredParameters : verifyCommonRequiredParameters
  };

}());
