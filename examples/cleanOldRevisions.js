#! /usr/local/bin/node
/*jslint node:true, esversion:6 */
// cleanOldRevisions.js
// ------------------------------------------------------------------
// In Apigee Edge, for all proxies in an org, remove all but the latest N revisions.
// (Never remove a deployed revision).
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
// last saved: <2017-December-19 14:41:24>

var async = require('async'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    merge = require('merge'),
    version = '20171219-1413',
    gRegexp,
    getopt = new Getopt(common.commonOptions.concat([
      ['N' , 'num=ARG', 'Required. Max number of revisions of each proxy to retain.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Proxy revision cleaner tool, version: ' + version + '\n' +
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

function checkAndMaybeRemoveRevision (org, proxyName) {
  return function (revision, callback) {
    var options = { name:proxyName, revision:revision };
    org.proxies.getDeployments(options, function(e, deployments) {
      if (opt.options.verbose) {
        common.logWrite('deployments (%s r%s): %s', proxyName, revision, JSON.stringify(deployments));
      }
      if (! deployments.environment || deployments.environment.length === 0) {
        org.proxies.del(options, function(e, result) {
          callback(e, options);
        });
      }
      else {
        callback(e, null);
      }
    });
  };
}

function doneAllRevisions(proxyName, callback) {
  return function(e, results) {
    handleError(e);
    if (opt.options.jar) {
      results = results.filter(function(r) {return r;});
      if (results && results.length > 0) {
        //results = results.map(function(r) {return parseInt(r, 10);});
        common.logWrite('proxy: '+ proxyName + ' ' + JSON.stringify(results));
      }
      callback(null, results);
    }
    else {
      // results is an array of arrays
      var flattened = [].concat.apply([], results);
      common.logWrite('proxy: '+ proxyName + ' ' + JSON.stringify(flattened));
      callback(null, flattened);
    }
  };
}

function doneAllProxies(e, results) {
  handleError(e);
  var flattened = [].concat.apply([], results);
  common.logWrite('result %s', JSON.stringify(flattened));
}


function analyzeOneProxy(org) {
  return function(proxyName, callback) {
    org.proxies.getRevisions({ name: proxyName }, function(e, result) {
      handleError(e);
      common.logWrite('revisions %s: %s', proxyName, JSON.stringify(result));
      if (result && result.length > opt.options.num) {
        result.sort(function(a, b) { return b - a; });
        result.reverse();
        var revisionsToExamine = result.slice(0, result.length - opt.options.num);
        revisionsToExamine.reverse();
        async.mapSeries(revisionsToExamine,
                        checkAndMaybeRemoveRevision(org, proxyName),
                        doneAllRevisions(proxyName, callback));
      }
      else {
        return callback(null, []);
      }
    });
  };
}


common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.num ) {
  console.log('You must specify a number of revisions to retain. (-N)');
  getopt.showHelp();
  process.exit(1);
}

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

  org.proxies.get({}, function(e, proxies) {
    async.mapSeries(proxies, analyzeOneProxy(org), doneAllProxies);
  });

});
