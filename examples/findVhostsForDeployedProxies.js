#! /usr/local/bin/node
/*jslint node:true, esversion:6 */
// findVhostsForDeployedProxies.js
// ------------------------------------------------------------------
// In Apigee Edge, for all proxies, find the latest deployed revision and
// identify the vhosts used within. Optionally filter the list for proxies that
// have endpoints with names that match a specific regexp. Example, to find
// proxies that listen on the default vhost:
//
//  node ./examples/findVhostsForDeployedProxies.js -n -v -o myorgname -R default
//
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
// last saved: <2019-February-11 13:01:26>

const async      = require('async'),
      edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      merge      = require('merge'),
      version    = '20190211-1300',
      getopt     = new Getopt(common.commonOptions.concat([
        ['R' , 'regexp=ARG', 'Optional. List proxies with vhosts matching this regexp.']
      ])).bindHelp();

var gRegexp;

// ========================================================

console.log(
  'Apigee Edge vhost-for-proxy query tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');
var opt = getopt.parse(process.argv.slice(2));

function handleError(e) {
    if (e) {
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

function getVhostForProxyEndpoint(org, proxy, revision) {
  return function(endpoint, cb) {
    org.proxies.getEndpoint({apiproxy:proxy, revision:revision, endpoint:endpoint}, function(e, result){
      return cb(e, { name:endpoint, virtualHosts : result.connection.virtualHost});
    });
  };
}

function checkDeployedRevisionOfProxy(org, proxyName){
  return function(revEnvironment, cb) {
    if ( ! revEnvironment.environments || revEnvironment.environments.length == 0) {
      cb(null, []);
    }
    org.proxies.getProxyEndpoints({apiproxy:proxyName, revision: revEnvironment.revision}, function(e, result){
      handleError(e);
      async.mapSeries(result, getVhostForProxyEndpoint(org, proxyName, revEnvironment.revision), function(e, result){
        var endpoints = result;
        if (opt.options.regexp) {
          endpoints = result.filter( endpt => {
            var matchingVhosts = endpt.virtualHosts.filter( item => gRegexp.test(item) );
            return matchingVhosts.length>0;
          });
        }
        return cb(e, (endpoints.length>0)? {name: revEnvironment.revision, environments: revEnvironment.environments, endpoints:result} : null);
      });
    });
  };
}

function remap(proxyDeployment) {
  var item = { proxyname : proxyDeployment.name, deployments: [] };
  proxyDeployment.environment.forEach( environmentDeployment => {
    //console.log(JSON.stringify(environmentDeployment, null, 2) + '\n');
    environmentDeployment.revision.forEach ( rev => {
      var list = item.deployments.find( x => x.revision == rev.name );
      if ( ! list ) {
        list = { revision: rev.name, environments: []} ;
        item.deployments.push(list);
      }
      list.environments.push(environmentDeployment.name);
    });
  });
  return item;
}


function findLatestDeployments(org) {
  return function(itemName, cb) {
    org.proxies.getDeployments({ name: itemName }, function(e, result) {
      handleError(e);
      result = remap(result);
      // if (opt.options.verbose) {
      //   common.logWrite('deployments: %s', JSON.stringify(result));
      // }
      async.mapSeries(result.deployments, checkDeployedRevisionOfProxy(org, itemName), function(e, result){
        var revisions = result.filter( item => item );
        return cb(e, (revisions.length>0)? {proxy:itemName, revisions:result }: null);
      });
    });
  };
}

common.verifyCommonRequiredParameters(opt.options, getopt);

if (opt.options.regexp) {
  gRegexp = new RegExp(opt.options.regexp);
}
apigeeEdge.connect(common.optToOptions(opt), function(e, org){
  handleError(e);

  var readOptions = {};
  org.proxies.get(readOptions, function(e, results) {
    if (opt.options.verbose) {
      common.logWrite('proxies: %s', JSON.stringify(results));
    }
    if (results.length > 0) {
      async.mapSeries(results, findLatestDeployments(org), function(e, results){
        handleError(e);
        results = results.filter( item => item ); // null item means no regexp match for that proxy
        console.log(JSON.stringify({results, count:results.length}, null, 2) + '\n');
      });
    }
  });
});
