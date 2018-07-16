#! /usr/local/bin/node
/*jslint node:true, esversion:6 */
// cleanOldRevisions.js
// ------------------------------------------------------------------
// In Apigee Edge, for all proxies or sharedflows in an org, remove all
// but the latest N revisions. (Never remove a deployed revision).
//
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
// last saved: <2018-July-16 08:58:18>

var async = require('async'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    merge = require('merge'),
    version = '20180716-0845',
    gRegexp,
    getopt = new Getopt(common.commonOptions.concat([
      ['R' , 'regexp=ARG', 'Optional. Cull only proxies with names matching this regexp.'],
      ['K' , 'numToKeep=ARG', 'Required. Max number of revisions of each proxy to retain.'],
      ['S' , 'sharedflows', 'Optional. Cull only sharedflows, not apiproxies.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Proxy / Sharedflow revision cleaner tool, version: ' + version + '\n' +
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

function checkAndMaybeRemoveRevision (org, collectionName, itemName) {
  return function (revision, callback) {
    var options = { name:itemName, revision:revision };
    org[collectionName].getDeployments(options, function(e, deployments) {
      if (opt.options.verbose) {
        common.logWrite('deployments (%s r%s): %s', itemName, revision, JSON.stringify(deployments));
      }
      if (! deployments.environment || deployments.environment.length === 0) {
        org[collectionName].del(options, function(e, result) {
          callback(e, options);
        });
      }
      else {
        callback(e, null);
      }
    });
  };
}

function doneAllRevisions(collectionName, itemName, callback) {
  return function(e, results) {
    handleError(e);
    // results is an array of arrays
    var flattened = [].concat.apply([], results);
    common.logWrite(collectionName + ': '+ itemName + ' ' + JSON.stringify(flattened));
    callback(null, flattened);
  };
}

function doneAllItems(e, results) {
  handleError(e);
  var flattened = [].concat.apply([], results);
  common.logWrite('result %s', JSON.stringify(flattened));
}

function analyzeOneItem(org, collectionName) {
  return function(itemName, callback) {
    org[collectionName].getRevisions({ name: itemName }, function(e, result) {
      handleError(e);
      common.logWrite('revisions %s: %s', itemName, JSON.stringify(result));
      if (result && result.length > opt.options.numToKeep) {
        result.sort(function(a, b) { return b - a; });
        result.reverse();
        var revisionsToExamine = result.slice(0, result.length - opt.options.numToKeep);
        revisionsToExamine.reverse();
        async.mapSeries(revisionsToExamine,
                        checkAndMaybeRemoveRevision(org, collectionName, itemName),
                        doneAllRevisions(collectionName, itemName, callback));
      }
      else {
        return callback(null, []);
      }
    });
  };
}

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.numToKeep ) {
  console.log('You must specify a number of revisions to retain. (-K)');
  getopt.showHelp();
  process.exit(1);
}

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      no_token: opt.options.notoken,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org){
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }

  var readOptions = {};
  var collectionName = (opt.options.sharedflows) ? "sharedflows" : "proxies";
  org[collectionName].get(readOptions, function(e, results) {
    if (opt.options.regexp) {
      var re1 = new RegExp(opt.options.regexp);
      results = results.filter(function(item) { return re1.test(item); });
    }
    if (opt.options.verbose) {
      common.logWrite('%s%s: %s', (opt.options.regexp)?"matching ":"", collectionName, JSON.stringify(results));
    }
    if (results.length > 0) {
      async.mapSeries(results, analyzeOneItem(org, collectionName), doneAllItems);
    }
  });
});
