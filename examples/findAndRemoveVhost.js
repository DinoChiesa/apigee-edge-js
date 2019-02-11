#! /usr/local/bin/node
/*jslint node:true, esversion:6 */
// findAndRemoveVhost.js
// ------------------------------------------------------------------
//
// In Apigee Edge, find all proxies with a reference vhost. Optionally remove
// the vhost from the proxy if it is not the only vhost. Can be helpful in
// removing the 'default' (insecure) vhost from all proxies.
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
// last saved: <2019-February-11 12:52:45>

var async = require('async'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    merge = require('merge'),
    regexp1,
    version = '20190211-1252',
    getopt = new Getopt(common.commonOptions.concat([
      ['V' , 'vhost=ARG', 'Required. The vhost to look for.'],
      ['R' , 'remove', 'Optional. Remove vhost from such proxies.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge VHost finder / remover tool, version: ' + version + '\n' +
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

function getOneEndpoint (collection, assetName, revision) {
  return function (proxyendpoint, callback) {
    var options = {name:assetName, revision:revision, proxyendpoint: proxyendpoint};
    collection.get(options, function(e, result) {
      if (e) {
        return callback(e, []);
      }
      var isMatch = result.connection.connectionType === 'httpConnection' &&
        result.connection.virtualHost.indexOf(opt.options.vhost) >= 0 ;
      var response = merge(options, {vhosts: result.connection.virtualHost});
      if (opt.options.remove && isMatch && result.connection.virtualHost.length>1) {
        // modify the endpoint here
        result.connection.virtualHost = result.connection.virtualHost.filter(item => item !== opt.options.vhost);
        collection.update(options, result, function(e, result) {
          callback(null, isMatch? response : {});
        });
      }
      else
        callback(null, isMatch? response : {});
    });
  };
}

function doneAllEndpoints(callback) {
  return function(e, results) {
    handleError(e);
    callback(null, results);
  };
}

function getOneRevision (collection, collectionName, assetName) {
  return function (revision, callback) {
    var options = {name:assetName, revision:revision};
    collection.getProxyEndpoints(options, function(e, result){
      if (e) {
        return callback(e, []);
      }
      async.mapSeries(result, getOneEndpoint(collection, assetName, revision), doneAllEndpoints(callback));
    });
  };
}

function doneAllRevisions(assetName, collectionName, callback) {
  return function(e, results) {
    handleError(e);
    // results is an array of arrays
    var flattened = [].concat.apply([], results);
    flattened = flattened.filter(item => item.name)
      .map( item => {
      var newItem = merge(true, item);
      delete newItem.name;
      return newItem;
    });
    var rvalue = { name: assetName, revisions: flattened};
    common.logWrite(collectionName.slice(0, -1) + ': ' + JSON.stringify(rvalue));
    callback(null, rvalue);
  };
}

function doneAllAssets(collectionName) {
  return function(e, results) {
    handleError(e);
  };
}

function analyzeOneAsset(collection, collectionName) {
  return function(assetName, callback) {
    collection.get({ name: assetName }, function(e, result) {
      handleError(e);
      async.mapSeries(result.revision, getOneRevision(collection, collectionName, assetName), doneAllRevisions(assetName, collectionName, callback));
    });
  };
}

// ========================================================================================

common.verifyCommonRequiredParameters(opt.options, getopt);
if ( ! opt.options.vhost) {
  console.log('The vhost is required.');
  getopt.showHelp();
  process.exit(1);
}
apigeeEdge.connect(common.optToOptions(opt), function(e, org){
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    process.exit(1);
  }

  org.proxies.get({}, function(e, proxies) {
    async.mapSeries(proxies, analyzeOneAsset(org.proxies, 'apis'), function (e, proxyResults) {
      handleError(e);
      var flattened = [].concat.apply([], proxyResults);
      flattened = flattened.filter( (item) => item.revisions && item.revisions.length);
      common.logWrite('uses of vhost \'%s\' within proxies: %d', opt.options.vhost, flattened.length);
      console.log(JSON.stringify(flattened, null, 2));
    });
  });
});
