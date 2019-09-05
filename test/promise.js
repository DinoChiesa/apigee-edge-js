// promise.js
// ------------------------------------------------------------------
//
// Tests for promise wrappers.
//
// Copyright 2018-2019 Google LLC.
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

/* global describe, faker, it, before */

var common = require('./common');

describe('Promise', function() {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  const num = faker.random.number(),
        word = faker.lorem.word(),
        entityName = "apigee-edge-js-test-" + word + '-' + num,
        cacheName = entityName + '-cache',
        firstName = faker.name.firstName(),
        lastName = faker.name.lastName(),
        developerEmail = lastName + '.' + firstName + "@apigee-edge-js-test.org";

  var environments = [];

  before(function(done) {
    common.connectEdge(function(edgeOrg) {
      edgeOrg.environments.get(function(e, result) {
        assert.isNull(e, "error listing: " + JSON.stringify(e));
        environments = result;
        done();
      });
    });
  });

  describe('get', function() {

    it('should connect and get the environments', () =>
      common.connectEdge()
       .then ( (org) => org.environments.get({}) )
       .then ( (result) => assert.isAtLeast(result.length, 1) )
      );

    it('should connect and get one environment', () =>
      common.connectEdge()
       .then ( (org) => org.environments.get({ env: environments[0] }) ) );

    it('should connect and get developers', () =>
      common.connectEdge()
       .then ( (org) => org.developers.get() )
       .then ( (result) => assert.isAtLeast(result.length, 1) )
      );

    it('should connect and get proxies', () =>
      common.connectEdge()
       .then ( (org) => org.proxies.get() )
       .then ( (result) => assert.isAtLeast(result.length, 1) )
      );

    it('should connect and get kvms', () =>
      common.connectEdge()
       .then ( (org) => org.kvms.get() )
       .then ( (result) => assert(Array.isArray(result) ) )
      );

    it('should connect and get kvms in an environment', () =>
      common.connectEdge()
       .then ( (org) => org.kvms.get({ env: environments[0]}) )
       .then ( (result) => assert(Array.isArray(result) ) )
      );

    it('should connect and get sharedflows', () =>
      common.connectEdge()
       .then ( (org) => org.sharedflows.get() )
       .then ( (result) => assert(Array.isArray(result) ) )
      );

    it('should connect and get flowhooks in an environment', () =>
      common.connectEdge()
       .then ( (org) => org.flowhooks.get({ env: environments[0]}) )
       .then ( (result) => assert(Array.isArray(result) ) )
      );

    it('should connect and fail to get flowhooks (no environment)', () =>
      common.connectEdge()
       .then ( (org) => org.flowhooks.get() )
       .then( () => assert.fail('should not be reached'))
       .catch( error => {
         assert.exists(error.message) ;
         assert.equal(error.message, "missing required parameter: environment");
       })
      );

    it('should connect and get a few things successfully via promises', function(done) {
      common.connectEdge()
        .then ( (org) => {
          org.environments.get()
            .then( result => org.environments.getVhosts({ env: environments[0] }) )
            .then( result => org.developers.get() )
            .then( result => {
              //console.log('developers: ' + JSON.stringify(result, null, 2));
            })
            .then( result => org.products.get( {} ) )
            .then( result => {
              //console.log('products: ' + JSON.stringify(result, null, 2));
            })
            .then( result => org.proxies.get( {} ) )
            .then( result => {
              //console.log('proxies: ' + JSON.stringify(result, null, 2));
            })
            .then( result => org.caches.get( { env:environments[0] }) )
            .then( result => org.kvms.get( {} ) )
            .then( result => org.kvms.get( { env:environments[0] }) )
            .catch( reason => {
              console.log('error: ' + reason.error.stack);
              assert.isTrue(false, "unexpected error");
            })
            .finally( done );
        });
    });

  });


  describe('cache', function() {

    it('should create a cache in an env via promises', () =>
       common.connectEdge()
       .then ( (org) => {
         //org.conn.verbosity = 1;
         return org.caches.create({cacheName, environment:environments[0]})
           .then( result => assert.equal(result.name, cacheName) )
           .catch(reason => assert.fail('should not be reached'));
       } )
      );

    it('should return proper error on failure to create a cache', () =>
       common.connectEdge()
       .then( org => org.caches.create({cacheName, environment:faker.random.alphaNumeric(22)}) )
       .then( () => assert.fail('should not be reached'))
       .catch( error => {
         assert.equal(error, "Error: bad status: 404");
         assert.equal(error.result.code, "messaging.config.beans.EnvironmentDoesNotExist");
       }));

    it('should delete a cache in an env via promises', () =>
      common.connectEdge()
       .then ( org =>
               org.caches.del({cacheName, environment:environments[0]}) )
       .then( result => assert.equal(result.name, cacheName) )
       .catch(reason => assert.fail('should not be reached'))
      );

    it('should return proper errors when failing to delete non-existent cache', () =>
      common.connectEdge()
        .then ( (org) =>
          org.caches.del({cacheName:faker.random.alphaNumeric(22), environment:environments[0]})
        )
       .then( () => assert.fail('should not be reached'))
       .catch( error => {
         assert.equal(error, "Error: bad status: 404");
         assert.equal(error.result.code, "messaging.config.beans.CacheDoesNotExist");
       })
      );

    it('should fail properly when on delete from non-existent env', () =>
      common.connectEdge()
        .then ( (org) =>
          org.caches.del({cacheName:faker.random.alphaNumeric(22), environment:faker.random.alphaNumeric(22)})
        )
       .then( () => assert.fail('should not be reached'))
       .catch( error => {
         assert.equal(error, "Error: bad status: 404");
         assert.equal(error.result.code, "messaging.config.beans.EnvironmentDoesNotExist");
       })
      );

    it('should fail properly on delete when name is unspecified', () =>
      common.connectEdge()
        .then ( (org) =>
          org.caches.del({environment:faker.random.alphaNumeric(22)})
        )
       .then( () => assert.fail('should not be reached'))
       .catch( error => {
         assert.equal(error, "Error: missing name for cache");
       })
      );

  });


  describe('developer', function() {

    it('should create a developer via promises', () =>
       common.connectEdge()
       .then ( org => {
         //org.conn.verbosity = 1;
         let devOptions = {
                 developerEmail,
                 lastName,
                 firstName,
                 userName : entityName + '-developer',
                 attributes: { uuid: faker.random.uuid() }
             };
         return org.developers.create(devOptions)
           .then( result => assert.isNotNull(result))
           .catch ( reason => {
             assert.fail('should not be reached');
           });
       })
      );

    it('should return proper error on failure to create a developer', () =>
       common.connectEdge()
        .then( org => org.developers.create({ lastName, firstName, userName : entityName + '-developer' }) )
       .then( () => assert.fail('should not be reached'))
       .catch( error => {
         assert.equal(error.message, "missing required inputs, one of {email, firstName, lastName, userName}");
       }));

    it('should get developers via promises', () =>
       common.connectEdge()
       .then ( org => {
         //org.conn.verbosity = 1;
         return org.developers.get()
           .then( result => assert.isTrue(Array.isArray(result)))
           .catch( reason => assert.fail('should not be reached'));
       })
      );

    it('should delete a developer via promises', () =>
      common.connectEdge()
       .then ( org => {
         //org.conn.verbosity = 1;
         return org.developers.del({developerEmail})
           .then( result => assert.equal(result.email, developerEmail) )
           .catch(reason => assert.fail('should not be reached'));
       })
      );

  });


});
