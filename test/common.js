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
// last saved: <2025-September-16 20:48:00>

/* global exports, global */

const chai = require("chai");
const assert = chai.assert;
const path = require("node:path");
const fs = require("node:fs");
const apigeejs = require("../index.js");
const faker = require("faker");
//var sprintf = require('sprintf-js').sprintf;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

var config = require("../testConfig.json");
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
  // for verbose logging, uncomment the following.
  //options.verbosity = 1;
  if (cb) {
    return apigeejs.apigee.connect(options, function (e, org) {
      assert.isNull(e, JSON.stringify(e));
      cb(org);
    });
  } else {
    return apigeejs.apigee.connect(options);
  }
}

function selectNRandom(list, N, promiseFn, done) {
  function reducer(promise, num) {
    let ix = Math.floor(Math.random() * list.length);
    return promise
      .then(() => promiseFn(list[ix], ix, list))
      .then(() => (1 + num >= N ? done() : {}));
  }
  Array.from(Array(N).keys()).reduce(reducer, Promise.resolve());
}

/* *
 * Finds the latest .cert file in a directory that has a matching .key file.
 * The pattern is YYYYMMDD-HHmm.
 *
 * @param {string} resourceDir The directory to search.
 * @returns {string | null} The full path to the latest .cert file, or null if not found.
 */
function findLatestCertKeyPair(resourceDir) {
  const certRegex = /^(\d{8}-\d{4})\.cert$/;

  let latestTimestamp = "";
  let latestCertPath = null;

  try {
    const allFiles = fs.readdirSync(resourceDir);
    // for efficient O(1) lookups.
    const fileSet = new Set(allFiles);

    for (const file of allFiles) {
      const match = file.match(certRegex);
      if (match) {
        const baseName = match[1]; // e.g., "20250916-2022"
        const keyFile = `${baseName}.key`;
        if (fileSet.has(keyFile)) {
          // Because the format is YYYYMMDD, a simple string comparison works.
          if (baseName > latestTimestamp) {
            latestTimestamp = baseName;
            latestCertPath = path.join(resourceDir, file);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${resourceDir}:`, err.message);
    return null; // Return null on error
  }

  return latestCertPath;
}

exports.findLatestCertKeyPair = findLatestCertKeyPair;
exports.selectNRandom = selectNRandom;
exports.connectApigee = connectApigee;
exports.testTimeout = config.timeout || 35000;
exports.slowThreshold = config.slowThreshold || 5000;
