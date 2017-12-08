#! /usr/local/bin/node
/*jslint node:true, esversion:6 */
// findJavaPolicies.js
// ------------------------------------------------------------------
// In Apigee Edge, find all policies in all proxies that reference a Java callout.
// Or, alternatively, find proxies in an org that include a specific JAR as a resource.
//
// This tool does not examine environment-wide or organization-wide resources.
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
// last saved: <2017-December-08 13:14:02>

var async = require('async'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    merge = require('merge'),
    version = '20171207-1754',
    gRegexp,
    getopt = new Getopt(common.commonOptions.concat([
      ['J' , 'jar=ARG', 'Optional. JAR name to find. Default: search for all JavaCallout policies.'],
      ['R' , 'regexp', 'Optional. Treat the -J option as a regexp. Default: perform string match.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge JavaCallout/JAR check tool, version: ' + version + '\n' +
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

function examineOnePolicy(org, options) {
  return function(policyName, callback) {
    org.proxies.getPoliciesForRevision(merge(options, {policy:policyName}), function(e, result) {
      handleError(e);
      var boolResult = (result.policyType == 'JavaCallout');
      callback(boolResult);
    });
  };
}

function getOneRevision (org, proxyName) {
  return function (revision, callback) {
    var options = {name:proxyName, revision:revision};
    if ( opt.options.jar ) {
      // url = sprintf('apis/%s/revisions/%s/resources', proxyName, revision);
      if (opt.options.regexp && !gRegexp) {
        gRegexp = new RegExp(opt.options.jar);
      }
      org.proxies.getResourcesForRevision(options, function(e, result){
        if (e) {
          return callback(null, null);
        }
        var jars = result && result.filter(function(item){
              var isJava = item.startsWith('java://');
              if ( ! isJava ) return false;
              var jarName = item.substring(7);
              return (gRegexp)?gRegexp.test(jarName) : (jarName == opt.options.jar);
            });
        callback(null, (jars && jars.length>0)?sprintf('apis/%s/revisions/%s', proxyName, revision):null);
      });
    }
    else {
      //url = sprintf('apis/%s/revisions/%s/policies', proxyName, revision);
      org.proxies.getPoliciesForRevision(options, function(e, allPolicies){
        if (e) {
          return callback(e, []);
        }
        async.filterSeries(allPolicies, examineOnePolicy(org, options), function(results) {
          var javaPolicies = results.map(function(elt){ return sprintf('apis/%s/revisions/%s/policies/%s', proxyName, revision, elt); });
          callback(null, javaPolicies);
        });
      });
    }
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
  common.logWrite('matching Java %s: %s', (opt.options.jar)?"proxies":"policies", JSON.stringify(flattened));
}


function analyzeOneProxy(org) {
  return function(proxyName, callback) {
    org.proxies.get({ name: proxyName }, function(e, result) {
      handleError(e);
      async.mapSeries(result.revision, getOneRevision(org, proxyName), doneAllRevisions(proxyName, callback));
    });
  };
}


common.verifyCommonRequiredParameters(opt.options, getopt);

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
