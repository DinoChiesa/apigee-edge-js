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
// last saved: <2021-March-22 18:53:37>

/* global exports, global */

const chai = require('chai');
const assert = chai.assert;
const path   = require('path');
const apigeejs = require('../index.js');
const faker  = require('faker');
//var sprintf = require('sprintf-js').sprintf;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

var config = require('../testConfig.json');
// testConfig.json ought to look something like this:
//
// {
//   "mgmtServer" : "https://api.enterprise.apigee.com",
//   "org"        : "my-apigee-org-name",
//   "netrc"      : true
// }
//
// or
// {
//   "mgmtServer" : "https://api.enterprise.apigee.com",
//   "org"        : "my-apigee-org-name",
//   "user"       : "Dchiesa@google.com"
//   "password"   : "Secret-BB208846F523"
// }
//
// It can also have a verbosity flag. (truthy/falsy)
//...which you can override here:
//config.verbosity = true;

// export some global vars for all tests
global.assert = assert;
global.path = path;
global.aej = apigeejs;
global.config = config;
global.faker = faker;
//global.sprintf = sprintf;
global.apigeejs = apigeejs;

function connectApigee(cb) {
  let options = Object.assign({}, config);
  //options.verbosity = 1;
  if (cb) {
    return apigeejs.apigee.connect(options, function(e, org){
      assert.isNull(e, JSON.stringify(e));
      cb(org);
    });
  }
  else {
    return apigeejs.apigee.connect(options);
  }
}

function selectNRandom(list, N, promiseFn, done) {
  function reducer(promise, num) {
    let ix = Math.floor(Math.random() * list.length);
    return promise.then( () => promiseFn(list[ix], ix, list))
      .then( () => (1+num >= N) ? done(): {});
  }
  Array.from(Array(N).keys()).reduce(reducer, Promise.resolve());
}


exports.selectNRandom = selectNRandom;
exports.connectApigee = connectApigee;
exports.testTimeout = config.timeout || 35000;
exports.slowThreshold = config.slowThreshold || 5000;
