// organization.js
// ------------------------------------------------------------------
//
// Tests for Developer operations.
//
// Copyright 2018-2020 Google LLC
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
// last saved: <2020-December-03 19:22:12>

/* global describe, faker, it */

const common = require('./common');
const util = require('util');

describe('Organization', function() {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);
  common.connectEdge(function(edgeOrg){
    const contrivedPropertyName1 = faker.random.alphaNumeric(22),
          contrivedPropertyName2 = faker.random.alphaNumeric(22);

    describe('getProps', function() {

      it('should get properties of the org', () =>
         edgeOrg.getProperties()
         .then( (result) => {
           assert.equal(typeof result, "object");
           assert.isAtLeast(Object.keys(result).length, 2);
           assert.notExists(result[contrivedPropertyName1]);
           assert.notExists(result[contrivedPropertyName2]);
         })
         .catch( reason => assert.fail('should not be reached'))
        );

    });

    describe('addProps', function() {

      it('should add a property to the org', () => {
        var propertyHash = {};
        propertyHash[contrivedPropertyName1] = 42;

        return edgeOrg.addProperties(propertyHash)
          .then( (result) => {
            assert.equal(typeof result, "object");
            if (result.error) {
              console.log(result.error.stack);
            }
            assert.equal(result[contrivedPropertyName1], "42");
          });
      });

      it('should silently not modify an existing property on the org', () => {
        var propertyHash = {};
        propertyHash[contrivedPropertyName1] = 928;

        return edgeOrg.addProperties(propertyHash)
          .then( (result) => {
            assert.equal(typeof result, "object");
            assert.equal(result[contrivedPropertyName1], 42);
          })
          .catch( reason => assert.fail('should not be reached'));
      });

    });


    describe('setProps', function() {

      it('should set(overwrite) an existing property on the org', () => {
        var propertyHash = {};
        propertyHash[contrivedPropertyName1] = 187;

        return edgeOrg.setProperties(propertyHash)
          .then( (result) => {
            assert.equal(typeof result, "object");
            assert.equal(result[contrivedPropertyName1], 187);
          })
          .catch( reason => {
            console.log(util.format(reason));
            assert.fail('should not be reached');
          });
      });

      it('should set a new property on the org', () => {
        var propertyHash = {};
        propertyHash[contrivedPropertyName2] = "hello";

        return edgeOrg.setProperties(propertyHash)
          .then( (result) => {
            assert.equal(typeof result, "object");
            assert.equal(result[contrivedPropertyName2], "hello");
          })
          .catch( reason => {
            console.log(util.format(reason));
            assert.fail('should not be reached');
          });
      });

    });


    describe('removeProps', function() {

      it('should remove two existing properties on the org', () => {
        var propertyArray = [contrivedPropertyName1, contrivedPropertyName2];

        return edgeOrg.removeProperties(propertyArray)
          .then( (result) => {
            assert.equal(typeof result, "object");
            assert.notExists(result[contrivedPropertyName1]);
            assert.notExists(result[contrivedPropertyName2]);
          })
          .catch( reason => {
            console.log(util.format(reason));
            assert.fail('should not be reached');
          });
      });

    });


    describe('setLengths', function() {

      it('should set the consumer key length for the org', () => {
        return edgeOrg.setConsumerKeyLength(42)
          .then( result => {
            assert.equal(typeof result, "object");
            assert.exists(result['keymanagement.consumer.key.length']);
            assert.equal(result['keymanagement.consumer.key.length'], "42");
          })
          .catch( reason => {
            console.log(util.format(reason));
            assert.fail('should not be reached');
          });
      });

      it('should set the consumer secret length for the org', () => {
        return edgeOrg.setConsumerSecretLength(48)
          .then( result => {
            assert.equal(typeof result, "object");
            assert.exists(result['keymanagement.consumer.secret.length']);
            assert.equal(result['keymanagement.consumer.secret.length'], "48");
          })
          .catch( reason => {
            console.log(util.format(reason));
            assert.fail('should not be reached');
          });
      });

      it('should fail to set the consumer key length for the org', () => {
        return edgeOrg.setConsumerKeyLength(101010)
          .then( r => assert.fail('should not be reached'))
          .catch( error => {
            assert.exists(error);
            assert.exists(error.stack);
            assert.equal(error.message, "invalid argument");
          });
      });

      it('should fail to set the consumer secret length for the org', () => {
        return edgeOrg.setConsumerSecretLength(179238)
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.exists(error);
            assert.exists(error.stack);
            assert.equal(error.message, "invalid argument");
          });
      });


    });


  });

});
