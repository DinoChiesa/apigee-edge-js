// common.js
// ------------------------------------------------------------------
//
// Copyright 2017-2018 Google LLC
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
// last saved: <2018-December-05 16:35:35>

/* global exports, global */

const assert = require('chai').assert;
const path   = require('path');
const apigee = require('../index.js');
const faker  = require('faker');
//var sprintf = require('sprintf-js').sprintf;

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

// export some global vars for all tests
global.assert = assert;
global.path = path;
global.aej = apigee;
global.config = config;
global.faker = faker;
//global.sprintf = sprintf;
global.apigee = apigee;

function connectEdge(cb) {
  let options = Object.assign({}, config);
  //options.verbosity = 1;
  if (cb) {
    return apigee.edge.connect(options, function(e, org){
      assert.isNull(e, JSON.stringify(e));
      cb(org);
    });
  }
  else {
    return apigee.edge.connect(options);
  }
}

exports.connectEdge = connectEdge;
exports.testTimeout = config.timeout || 35000;
exports.slowThreshold = config.slowThreshold || 5000;
