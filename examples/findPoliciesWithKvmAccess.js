#! /usr/local/bin/node
/*jslint node:true */
// findPoliciesWithKvmAccess.js
// ------------------------------------------------------------------
// In an Apigee Edge organization, find all policies in all proxies that
// reference a KVM, and maybe a particular KVM.  This uses a brute-force
// client-side search, so it will take a while to run on an org that has many
// proxy revisions.
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
// last saved: <2019-February-11 12:55:17>

var async = require('async'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20190211-1254',
    getopt = new Getopt(common.commonOptions.concat([
      ['M' , 'kvm=ARG', 'Optional. KVM name to find.'],
      ['S' , 'scope=ARG', 'Optional. Scope to match. Should be one of: (organization, environment, apiproxy)'],
      ['L' , 'list', 'Optional. don\'t find. list the available KVMs for the org/environment.'],
      ['R' , 'latestrevisionnumber', 'Optional. only look in the latest revision number for each proxy.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge KVM check tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

function handleError(e) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    common.logWrite(JSON.stringify(result, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
}

function policyUrl(proxyName, revision, policyName) {
  return sprintf("/v1/o/%s/apis/%s/revisions/%s/policies/%s",
                 opt.options.org, proxyName, revision, policyName);
}

function examineOnePolicy(org, proxyName, revision) {
  return function(policyName, callback) {
    org.proxies.get({ name: proxyName, revision: revision, policy: policyName }, function(e, result) {
      handleError(e);
      // return true if KVM and if the mapIdentifier is as specified, and the scope is as specified
      var boolResult = (result.policyType == 'KeyValueMapOperations') &&
        ( ! opt.options.kvm || (opt.options.kvm == result.mapIdentifier)) &&
        ( ! opt.options.scope || (opt.options.scope == result.scope));
      callback(null, boolResult);
    });
  };
}

function getOneRevision (org, proxyName) {
  return function (revision, cb) {
    org.proxies.get({ name: proxyName, revision: revision }, function(e, result) {
      async.filterSeries(result.policies, examineOnePolicy(org, proxyName, revision), function(e, results) {
        // results now equals an array of the KVM policies in this revision
        cb(null, results.map(function(policyName){ return policyUrl(proxyName, revision, policyName);}));
      });
    });
  };
}

function doneAllRevisions(proxyName, callback) {
  return function(e, results) {
    handleError(e);
    // results is an array of arrays
    var flattened = [].concat.apply([], results);
    common.logWrite(proxyName + ' ' + JSON.stringify(flattened));
    callback(null, flattened);
  };
}

function doneAllProxies(e, results) {
  handleError(e);
  var flattened = [].concat.apply([], results);
  common.logWrite(sprintf('there were %d matching KVM policies: %s', flattened.length, JSON.stringify(flattened)));
}

function analyzeOneProxy(org) {
  return function(proxyName, callback) {
    org.proxies.get({ name: proxyName }, function(e, result) {
      handleError(e);
      if (opt.options.latestrevisionnumber) {
        result.revision.sort();
        result.revision = [result.revision.pop()];
      }
      async.mapSeries(result.revision, getOneRevision(org, proxyName), doneAllRevisions(proxyName, callback));
    });
  };
}

common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  handleError(e);
  common.logWrite('connected');
  if (opt.options.list) {
    org.kvms.get({}, function(e, result){
      console.log(JSON.stringify(result));
    });
  }
  else {
    org.proxies.get({}, function(e, result){
      handleError(e);
      common.logWrite('found %d proxies', result.length);
      async.mapSeries(result, analyzeOneProxy(org), doneAllProxies);
    });
  }
});
