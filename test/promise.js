// promise.js
// ------------------------------------------------------------------
//
// Tests for promise wrappers.
//
// Copyright 2018 Google LLC.
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

    it('should connect and get a few things via promises', function(done) {
      common.connectEdge()
        .then ( (org) => {
          org.environments.get()
            .then( (result) => org.environments.getVhosts({ env: environments[0] }) )
            .then( (result) => org.developers.get() )
            .then( (result) => {
              //console.log('developers: ' + JSON.stringify(result, null, 2));
            })
            .then( (result) => org.products.get( {} ) )
            .then( (result) => {
              //console.log('products: ' + JSON.stringify(result, null, 2));
            })
            .then( (result) => org.proxies.get( {} ) )
            .then( (result) => {
              //console.log('proxies: ' + JSON.stringify(result, null, 2));
            })
            .then( (result) => org.caches.get( { env:environments[0] }) )
            .then( (result) => org.kvms.get( {} ) )
            .then( (result) => org.kvms.get( { env:environments[0] }) )
            .then( (result) => done() )
            .catch( (e) => {
              console.log('error: ' + e.stack);
              assert.isTrue(false, "unexpected error");
            });
        });
    });

  });


  describe('create', function() {
    it('should create a few things in an env via promises', function(done) {
      common.connectEdge()
        .then ( (org) => {

          org.caches.create({cacheName, environment:environments[0]})
            .then( (result) => assert.equal(result.name, cacheName) )
            .then( () => {
              var options = {
                    developerEmail,
                    lastName,
                    firstName,
                    userName : entityName + '-developer',
                    attributes: { uuid: faker.random.uuid() }
                  };
              return org.developers.create(options);
            })
            .then ( (result) => done() );

        })
        .catch( (e) => {
          console.log('error: ' + e.stack);
          assert.isTrue(false, "unexpected error");
        });
    });
  });


  describe('delete', function() {
    it('should delete a few things in an env via promises', function(done) {
      common.connectEdge()
        .then ( (org) => {

          const cacheName = entityName + '-cache';
          org.caches.del({cacheName, environment:environments[0]})
            .then( () => org.developers.del({developerEmail}) )
            .then ( (result) => done() );
        })

        .catch( (e) => {
          console.log('error: ' + e.stack);
          assert.isTrue(false, "unexpected error");
        });
    });
  });


});
