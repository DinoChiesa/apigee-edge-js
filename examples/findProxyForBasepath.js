// findProxyForBasepath.js
// ------------------------------------------------------------------
//
// Copyright 2018-2019 Google LLC.
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
// created: Mon Mar 20 09:57:02 2017
// last saved: <2019-February-11 13:11:17>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      async      = require('async'),
      Getopt     = require('node-getopt'),
      version    = '20190211-1310',
      getopt     = new Getopt(common.commonOptions.concat([
        ['B' , 'basepath=ARG', 'Required. the basepath to find.'],
        ['R' , 'regexp', 'Optional. Treat the -B option as a regexp. Default: perform string match.']
      ])).bindHelp();

function handleError(e) {
    if (e) {
      //console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

function getOneEndpoint (org, proxyName, revision) {
  return function (endpoint, callback) {
    var options = {name:proxyName, revision:revision, endpoint:endpoint};
    org.proxies.getEndpoint(options, function(e, result){
        if (e) {
          return callback(null, null);
        }
      //console.log('getOneEndpoint: ' + JSON.stringify(result, null, 2));
      var isMatch = (opt.options.regexp) ?
        opt.options.regexp.test(result.connection.basePath) :
        (result.connection.basePath == opt.options.basepath);
      callback(null, (isMatch)? {name:proxyName, revision:revision, endpoint:endpoint}: null);
    });
  };
}

function doneAllEndpoints(proxyName, revision, callback) {
  return function(e, results) {
    handleError(e);
    // results is an array of arrays
    var flattened = [].concat.apply([], results)
      .filter( item => item );
    //common.logWrite('proxy %s r%d %s', proxyName, revision, JSON.stringify(flattened));
    callback(null, flattened);
  };
}
function getOneRevision (org, proxyName) {
  return function (revision, callback) {
    var options = {name:proxyName, revision:revision};
    org.proxies.getEndpoints(options, function(e, result) {
        if (e) {
          return callback(e, null);
        }
      //console.log('getOneRevision: ' + JSON.stringify(result));
      async.mapSeries(result, getOneEndpoint(org, proxyName, revision), doneAllEndpoints(proxyName, revision, callback));
    });
  };
}

function doneAllRevisions(proxyName, callback) {
  return function(e, results) {
    handleError(e);
      // results is an array of arrays
      var flattened = [].concat.apply([], results);
      //common.logWrite('proxy: '+ proxyName + ' ' + JSON.stringify(flattened));
      callback(null, flattened);
  };
}


function doneAllProxies(e, results) {
  handleError(e);
  var flattened = [].concat.apply([], results);
  common.logWrite('proxy/rev/endpoint with basepath %s%s\n%s',
                  (opt.options.regexp)? "(regexp)" : "",
                  opt.options.basepath,
                  JSON.stringify(flattened, null, 2));
}

function analyzeOneProxy(org) {
  return function(proxyName, callback) {
    org.proxies.get({ name: proxyName }, function(e, result) {
      handleError(e);
      async.mapSeries(result.revision, getOneRevision(org, proxyName), doneAllRevisions(proxyName, callback));
    });
  };
}



// ========================================================

console.log(
  'Apigee Edge findProxyForBasepath.js tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.basepath ) {
  console.log('You must specify a basepath to search for');
  getopt.showHelp();
  process.exit(1);
}

if (opt.options.regexp) {
  opt.options.regexp = new RegExp(opt.options.basepath);
}

apigeeEdge.connect(common.getOptToOptions(opt), function(e, org) {
  handleError(e);
  //common.logWrite('searching...');
  org.proxies.get(function(e, apiproxies) {
    handleError(e);
    if (opt.opions.verbose) {
      common.logWrite('total count of API proxies for that org: %d', apiproxies.length);
    }
    async.mapSeries(apiproxies, analyzeOneProxy(org), doneAllProxies);
  });
});
