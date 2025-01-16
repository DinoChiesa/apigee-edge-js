// organization.js
// ------------------------------------------------------------------
//
// Tests for Developer operations.
//
// Copyright 2018-2025 Google LLC
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
// created: Sat Apr 29 09:17:48 2017
// last saved: <2025-January-16 21:59:51>

/* global describe, faker, it, assert */

const common = require("./common");
//const util = require("util");

describe("Organization", function () {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);
  common.connectApigee(function (org) {
    const contrivedPropertyName1 = faker.random.alphaNumeric(22),
      contrivedPropertyName2 = faker.random.alphaNumeric(22);

    describe("getName", function () {
      it("should get the name of the org", () =>
        org
          .getName()
          .then((name) => {
            assert.isNotNull(name);
            assert.equal(name, config.org);
          })
          .catch((_reason) => assert.fail("should not be reached")));
    });

    describe("getProps", function () {
      it("should get properties of the org", () =>
        org
          .getProperties()
          .then((result) => {
            assert.equal(typeof result, "object");
            assert.isAtLeast(Object.keys(result).length, 2);
            assert.notExists(result[contrivedPropertyName1]);
            assert.notExists(result[contrivedPropertyName2]);
          })
          .catch((_reason) => assert.fail("should not be reached")));
    });

    describe("addProps", function () {
      it("should fail to add a property to the org (this used to be possible)", () => {
        const propertyHash = {};
        propertyHash[contrivedPropertyName1] = 42;

        return org
          .addProperties(propertyHash)
          .then((_result) => {
            assert.fail("should not be reached");
          })
          .catch((reason) => assert.ok(reason));
      });
    });

    describe("setProps", function () {
      it("should fail to set(overwrite) an existing property on the org", () => {
        const propertyHash = {};
        propertyHash[contrivedPropertyName1] = 187;

        return org
          .setProperties(propertyHash)
          .then((_result) => {
            assert.fail("should not be reached");
          })
          .catch((reason) => {
            //console.log(util.format(reason));
            assert.ok(reason);
          });
      });

      it("should fail to set a new property on the org", () => {
        const propertyHash = {};
        propertyHash[contrivedPropertyName2] = "hello";

        return org
          .setProperties(propertyHash)
          .then((result) => {
            assert.fail("should not be reached");
          })
          .catch((reason) => {
            //console.log(util.format(reason));
            assert.ok(reason);
          });
      });
    });

    describe("removeProps", function () {
      it("should fail to remove two existing properties on the org", () => {
        const propertyArray = [contrivedPropertyName1, contrivedPropertyName2];

        return org
          .removeProperties(propertyArray)
          .then((_result) => {
            assert.fail("should not be reached");
          })
          .catch((reason) => {
            //console.log(util.format(reason));
            assert.ok(reason);
          });
      });
    });

    describe("setLengths", function () {
      it("should fail to set the consumer key length for the org", () => {
        return org
          .setConsumerKeyLength(42)
          .then((_result) => {
            assert.fail("should not be reached");
          })
          .catch((reason) => {
            //console.log(util.format(reason));
            assert.ok(reason);
          });
      });

      it("should fail to set the consumer secret length for the org", () => {
        return org
          .setConsumerSecretLength(48)
          .then((_result) => {
            assert.fail("should not be reached");
          })
          .catch((reason) => {
            //console.log(util.format(reason));
            assert.ok(reason);
          });
      });

      it("should fail to set the consumer key length for the org", () => {
        return org
          .setConsumerKeyLength(101010)
          .then((r) => assert.fail("should not be reached"))
          .catch((error) => {
            assert.exists(error);
            assert.exists(error.stack);
            assert.equal(error.message, "invalid argument");
          });
      });

      it("should fail to set the consumer secret length for the org", () => {
        return org
          .setConsumerSecretLength(179238)
          .then(() => assert.fail("should not be reached"))
          .catch((error) => {
            assert.exists(error);
            assert.exists(error.stack);
            assert.equal(error.message, "invalid argument");
          });
      });
    });
  });
});
