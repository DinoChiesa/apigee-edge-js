#! /usr/local/bin/node
/*jslint node:true */
// findFlowCallouts.js
// ------------------------------------------------------------------
// In an Apigee Edge organization, find all proxies that include a FlowCallout,
// and optionally a calloput to a specific (named) sharedflow.  This uses a
// brute-force client-side search, so it will take a while to run on an org that
// has many proxy revisions.
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
// last saved: <2019-September-17 06:26:41>

var async = require('async'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20190211-1253',
    getopt = new Getopt(common.commonOptions.concat([
      ['F' , 'sharedflow=ARG', 'Optional. find only FlowCallouts referencing a specific Sharedflow.'],
      ['L' , 'list', 'Optional. don\'t find. just list the SharedFlows in the org.'],
      ['R' , 'latestrevisionnumber', 'Optional. only look in the latest revision number for each proxy.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge FlowCallout check tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

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
      // return true if FlowCallout and maybe if the particular sharedflow is referenced.
      callback(null, (result.policyType === 'FlowCalloutBean') &&
          ( ! opt.options.sharedflow || (opt.options.sharedflow == result.sharedFlowBundle)));
    });
  };
}

function getOneRevision (org, proxyName) {
  return function (revision, cb) {
    org.proxies.get({ name: proxyName, revision: revision }, function(e, result) {

      async.filterSeries(result.policies, examineOnePolicy(org, proxyName, revision), function(e, results) {
        handleError(e);
        console.log('results: ' + JSON.stringify(results));
        // results now equals an array of the sought policies (FlowCallout, and maybe to a particular SF) in this revision
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
  common.logWrite(sprintf('there were %d matching FlowCallout policies: %s', flattened.length, JSON.stringify(flattened)));
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
    org.sharedflows.get({}, (e, result) => {
      common.logWrite('found %d sharedflows', result.length);
      common.logWrite(result.join(', '));
    });
    return;
  }

  org.proxies.get({}, function(e, result){
    handleError(e);
    common.logWrite('found %d proxies', result.length);
    async.mapSeries(result, analyzeOneProxy(org), doneAllProxies);
  });

});
