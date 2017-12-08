// common.js
// ------------------------------------------------------------------
//
// Description goes here....
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
// created: Sun Apr 30 19:30:27 2017
// last saved: <2017-December-08 13:19:00>

var assert = require('chai').assert;
var path = require('path');
var aej = require('../index.js');
var faker = require('faker');
var sprintf = require('sprintf-js').sprintf;
var config = require('../testConfig.json');
// testConfig.json ought to look something like this:
//
// {
//   "mgmtServer" : "https://api.enterprise.apigee.com",
//   "org"        : "my-edge-org-name",
//   "netrc"      : true
// }
//
// or
// {
//   "mgmtServer" : "https://api.enterprise.apigee.com",
//   "org"        : "my-edge-org-name",
//   "user"       : "Dchiesa@google.com"
//   "password"   : "Secret-BB208846F523"
// }
//
// It can also have a verbosity flag. (truthy/falsy)
//

global.assert = assert;
global.path = path;
global.aej = aej;
global.config = config;
global.faker = faker;
global.sprintf = sprintf;
global.utility = aej.utility;
global.apigeeEdge = aej.edge;

function connectEdge(cb) {
  var options = Object.assign({}, config);
  //options.verbosity = 1;
  apigeeEdge.connect(options, function(e, org){
    assert.isNull(e, JSON.stringify(e));
    cb(org);
  });
}

exports.connectEdge = connectEdge;
exports.testTimeout = config.timeout || 35000;
