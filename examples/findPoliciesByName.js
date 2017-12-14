#! /usr/local/bin/node
/*jslint node:true, esversion:6 */
// findPoliciesByName.js
// ------------------------------------------------------------------
// In Apigee Edge, find policies in all proxies and/or sharedflows that have a matching name.
//
// Copyright 2017 Google Inc.
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
// last saved: <2017-December-13 16:55:39>

var async = require('async'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    merge = require('merge'),
    regexp1,
    version = '20170822-0958',
    getopt = new Getopt(common.commonOptions.concat([
      ['P' , 'proxiesonly', 'Optional. Look for policies only within proxies.'],
      ['S' , 'sharedflowsonly', 'Optional. Look for policies only within sharedflows.'],
      ['R' , 'regexp=ARG', 'Required. Look for policies that match a regexp.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Policy finder tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

function handleError(e) {
    if (e) {
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

function getOneRevision (org, collection, collectionName, assetName) {
  return function (revision, callback) {
    var options = {name:assetName, revision:revision};
    collection.getPoliciesForRevision(options, function(e, result){
      if (e) {
        return callback(e, []);
      }
      var matchingPolicies = result
        .filter( x => x.match(regexp1))
        .map(function(elt){ return sprintf('%s/%s/revisions/%s/policies/%s', collectionName, assetName, revision, elt); });
      callback(null, matchingPolicies);
    });
  };
}

function doneAllRevisions(assetName, collectionName, callback) {
  return function(e, results) {
    handleError(e);
      // results is an array of arrays
      var flattened = [].concat.apply([], results);
      common.logWrite(collectionName.slice(0, -1) + ': ' + assetName + ' ' + JSON.stringify(flattened));
      callback(null, flattened);
  };
}

function doneAllAssets(collectionName) {
  return function(e, results) {
    handleError(e);
  };
}


function analyzeOneAsset(org, collection, collectionName) {
  return function(assetName, callback) {
    collection.get({ name: assetName }, function(e, result) {
      handleError(e);
      async.mapSeries(result.revision, getOneRevision(org, collection, collectionName, assetName), doneAllRevisions(assetName, collectionName, callback));
    });
  };
}

// ========================================================================================

common.verifyCommonRequiredParameters(opt.options, getopt);
if ( ! opt.options.regexp) {
  console.log('The regexp is required.');
  getopt.showHelp();
  process.exit(1);
}

if (opt.options.proxiesonly && opt.options.sharedflowsonly) {
  console.log('You can use at most one of --proxiesonly and --sharedflowsonly .');
  getopt.showHelp();
  process.exit(1);
}

regexp1 = new RegExp(opt.options.regexp);

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org){
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }

  if (opt.options.proxiesonly) {
    org.proxies.get({}, function(e, proxies) {
      async.mapSeries(proxies, analyzeOneAsset(org, org.proxies, 'apis'), function (e, proxyResults) {
            handleError(e);
            var flattened = [].concat.apply([], proxyResults);
            common.logWrite('occurrences within proxies: %s', JSON.stringify(flattened));
      });
    });
  }
  else if (opt.options.sharedflowsonly) {
    org.sharedflows.get({}, function(e, sharedflows) {
      async.mapSeries(sharedflows, analyzeOneAsset(org, org.sharedflows, 'sharedflows'), function(e, sharedFlowResults) {
        handleError(e);
        var flattened = [].concat.apply([], sharedFlowResults);
        common.logWrite('occurrences within sharedflows: %s', JSON.stringify(flattened));
      });
    });
  }
  else {
    org.proxies.get({}, function(e, proxies) {
      async.mapSeries(proxies, analyzeOneAsset(org, org.proxies, 'apis'), function (e, proxyResults) {
        org.sharedflows.get({}, function(e, sharedflows) {
          async.mapSeries(sharedflows, analyzeOneAsset(org, org.sharedflows, 'sharedflows'), function(e, sharedFlowResults) {
            handleError(e);
            var flattened = [].concat.apply([], proxyResults);
            common.logWrite('occurrences within proxies: %s', JSON.stringify(flattened));
            flattened = [].concat.apply([], sharedFlowResults);
            common.logWrite('occurrences within sharedflows: %s', JSON.stringify(flattened));
          });
        });
      });
    });
  }
});
