#! /usr/local/bin/node
/*jslint node:true */
// undeployAndDelete.js
// ------------------------------------------------------------------
// undeploy and delete an Apigee Edge proxy that has a name with a specific prefix.
//
// Copyright 2017-2019 Google LLC.
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
// last saved: <2019-February-11 12:50:59>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      async      = require('async'),
      merge      = require('merge'),
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20190211-1250',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'prefix=ARG', 'required. name prefix. All API Proxies with names starting with this prefix will be removed.' ]
      ])).bindHelp();

// ========================================================

function handleError(e) {
    if (e) {
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

function undeployAndRemoveRevision (org, options) {
  return function (environment, callback) {
    var undeployOptions = merge(options, { environment: environment.name});
    org.proxies.undeploy(undeployOptions, function(e, deployments) {
      handleError(e);
      callback(e, null);
    });
  };
}

function checkAndMaybeRemoveRevision (org, proxyName) {
  return function (revision, callback) {
    var options = { name:proxyName, revision:revision };
    org.proxies.getDeployments(options, function(e, deployments) {
      if (! deployments.environment || deployments.environment.length === 0) {
        org.proxies.del(options, function(e, result) {
          callback(e, options);
        });
      }
      else {
        async.mapSeries(deployments.environment,
                        undeployAndRemoveRevision(org, options),
                        function(e, results) {
                          handleError(e);
                          org.proxies.del(options, function(e, ignoredResult) {
                            callback(e, options);
                          });
                        });
      }
    });
  };
}

function doneAllRevisions(org, proxyName, callback) {
  return function(e, results) {
    handleError(e);
    org.proxies.del({name: proxyName}, function(e, ignoredDeleteResult) {
      callback(e, {});
    });
  };
}

function removeOneProxy(org) {
  return function(proxyName, callback) {
    org.proxies.getRevisions({ name: proxyName }, function(e, result) {
      handleError(e);
      common.logWrite('revisions %s: %s', proxyName, JSON.stringify(result));
      async.mapSeries(result,
                      checkAndMaybeRemoveRevision(org, proxyName),
                      doneAllRevisions(org, proxyName, callback));
    });
  };
}

function doneAllProxies(e, results) {
  handleError(e);
  var flattened = [].concat.apply([], results);
  common.logWrite('result %s', JSON.stringify(flattened));
}

console.log(
  'Apigee Edge Proxy Undeploy + Delete tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));
if ( ! opt.options.prefix ) {
  console.log('You must specify a name prefix. (-P)');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt), function(e, org){
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    process.exit(1);
  }
  common.logWrite('connected');
  common.logWrite('undeploying and deleting...');
  org.proxies.get(function(e, proxies) {
    if (e) {
      common.logWrite('error: ' + JSON.stringify(e, null, 2));
      if (proxies) { common.logWrite(JSON.stringify(proxies, null, 2)); }
      process.exit(1);
    }
    proxies = proxies.filter( name => name.startsWith(opt.options.prefix));
    async.mapSeries(proxies, removeOneProxy(org), doneAllProxies);
  });
});
