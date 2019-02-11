#! /usr/local/bin/node
/*jslint node:true */
// exportApi.js
// ------------------------------------------------------------------
// export one or more Apigee Edge proxy bundles
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
// last saved: <2019-February-11 13:16:44>

const fs         = require('fs'),
      path       = require('path'),
      mkdirp     = require('mkdirp'),
      edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      async      = require('async'),
      Getopt     = require('node-getopt'),
      version    = '20190211-1316',
      defaults   = { destination : 'exported' },
      getopt     = new Getopt(common.commonOptions.concat([
        ['N' , 'name=ARG', 'name of existing API proxy or shared flow'],
        ['P' , 'pattern=ARG', 'regex pattern for name of existing API proxy or shared flow; this always exports the latest revision.'],
        ['D' , 'destination=ARG', 'directory for export. Default: exported'],
        ['t' , 'trial', 'trial only. Do not actually export'],
        ['R' , 'revision=ARG', 'revision of the asset to export. Default: latest']
      ])).bindHelp();

function exportOneProxyRevision(org, name, revision, cb) {
  if (opt.options.trial) {
    common.logWrite('WOULD EXPORT HERE %s, revision:%s', name, revision);
    return cb(null, sprintf("%s-%s.zip", name, revision));
  }
  else {
    org.proxies.export({name:name, revision:revision}, function(e, result) {
      if (e) {
        common.logWrite("ERROR:\n" + JSON.stringify(e, null, 2));
        if (result) { common.logWrite(JSON.stringify(result, null, 2)); }
        if (cb) { return cb(e); }
        process.exit(1);
      }
      fs.writeFileSync(path.join(opt.options.destination, result.filename), result.buffer);
      common.logWrite('export ok file: %s', result.filename);
      if (cb) { cb(null, result.filename); }
    });
  }
}

function exportLatestRevisionOfProxy(org, name, cb) {
  org.proxies.getRevisions({name:name}, function(e, result){
    if (e) {
      common.logWrite("ERROR:\n" + JSON.stringify(e, null, 2));
      if (cb) { return cb(e); }
      process.exit(1);
    }
    var latestRevision = result[result.length - 1];
    exportOneProxyRevision(org, name, latestRevision, cb);
  });
}

function proxyExporter(org) {
  return function(item, cb) {
    return exportLatestRevisionOfProxy(org, item, cb);
  };
}

function exportLatestRevisionOfMatchingProxies(org, pattern, cb) {
  org.proxies.get({}, function(e, result){
    if (e) {
      common.logWrite("ERROR:\n" + JSON.stringify(e, null, 2));
      if (cb) { return cb(e); }
      process.exit(1);
    }
    var re1 = new RegExp(pattern);
    result = result.filter( a => a.match(re1) );
    async.mapSeries(result, proxyExporter(org), function (e, results) {
      cb(e, results);
    });
  });
}

// ========================================================

console.log(
  'Apigee Edge Proxy Export tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.name && !opt.options.pattern ) {
  console.log('You must specify a name, or a pattern for the name, for the proxy or sharedflow to be exported');
  getopt.showHelp();
  process.exit(1);
}

if ( opt.options.name && opt.options.pattern ) {
  console.log('You must specify only one of a name, or a pattern for the name, for the proxy or sharedflow to be exported');
  getopt.showHelp();
  process.exit(1);
}

if ( opt.options.revision && opt.options.pattern) {
  console.log('You may not specify a revision when specifying a pattern. Doesn\'t make sense.');
  getopt.showHelp();
  process.exit(1);
}

if ( ! opt.options.destination) {
  opt.options.destination = defaults.destination;
}

mkdirp.sync(opt.options.destination);

common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  if (opt.options.name && opt.options.revision) {
    common.logWrite('exporting');
    exportOneProxyRevision(org, opt.options.name, opt.options.revision, function(e, result){
      common.logWrite('ok');
    });
  }
  else if (opt.options.name) {
    exportLatestRevisionOfProxy(org, opt.options.name, function(e, result){
      common.logWrite('ok');
    });
  }
  else if (opt.options.pattern) {
    exportLatestRevisionOfMatchingProxies(org, opt.options.pattern, function(e, result){
      common.logWrite('ok');
      console.log(JSON.stringify(result, null, 2) + '\n');
    });
  }
  else {
    common.logWrite("Unexpected input arguments: no name and no pattern.");
  }
});
