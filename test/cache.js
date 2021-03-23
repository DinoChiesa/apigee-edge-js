// cache.js
// ------------------------------------------------------------------
//
// Tests for cache operations.
//
// Copyright 2018-2020 Google LLC.
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

describe('Cache', function() {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);
  common.connectApigee(function(org){
    const num = faker.random.number(),
          word = faker.lorem.word(),
          cacheName = `apigee-edge-js-test-${word}-${num}`;
      var environments = [];

      before(done => {
       org.environments.get(function(e, result) {
         assert.isNull(e, "error listing: " + JSON.stringify(e));
         environments = result;
         done();
       });
      });

    describe('create', function() {

      it('should create a cache in each env', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.create({cacheName, environment:env}, (e, result) => {
            assert.isNull(e, "error creating: " + JSON.stringify(e));
            tick();
          });
        });
      });

      it('should fail to create a cache with no name', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.create({environment:env}, (e, result) => {
            assert.isNotNull(e, "the expected error did not occur");
            tick();
          });
        });
      });

      it('should fail to create a cache with an empty name', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.create({cacheName:'', environment:env}, (e, result) => {
            assert.isNotNull(e, "the expected error did not occur");
            tick();
          });
        });
      });

      it('should fail to create a cache with no env', done => {
        org.caches.create({cacheName}, (e, result) => {
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to create a cache with an invalid env name', done => {
        org.kvms.create({cacheName, environment:faker.random.alphaNumeric(22)}, (e, result) => {
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

    describe('get', function() {

      it('should get caches from each env', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.get({environment:env}, (e, result) => {
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.isAtLeast(result.length, 1, "zero results");
            tick();
          });
        });
      });

      it('should fail to get caches from a non-existent env', done => {
        org.caches.get({environment:faker.random.alphaNumeric(22)}, (e, result) => {
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to get non-existent cache from an env', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.get({name:faker.random.alphaNumeric(22), environment:env}, (e, result) => {
            assert.isNotNull(e, "the expected error did not occur");
            tick();
          });
        });
      });

    });

    describe('clear', function() {

      it('should clear a cache from each env', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.clear({cacheName, environment:env}, (e, result) => {
            assert.isNull(e, "error clearing: " + JSON.stringify(e));
            //assert.isAtLeast(result.length, 1, "zero results");
            tick();
          });
        });
      });

      it('should fail to clear a non-existent cache from each env', done => {
        const bogusCacheName = 'bogus-' +
          faker.lorem.word() + '-' + faker.random.number();
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.clear({bogusCacheName, environment:env}, (e, result) => {
            assert.isNotNull(e, "the expected error did not occur");
            tick();
          });
        });
      });


    });

    describe('delete', function() {

      it('should delete a cache from each env', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.del({cacheName, environment:env}, (e, result) => {
            assert.isNull(e, "error deleting: " + JSON.stringify(e));
            tick();
          });
        });
      });

      it('should fail to delete a cache because neither name nor env was specified', done => {
        org.caches.del({}, (e, result) => {
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete a cache because no env was specified', done => {
        org.caches.del({cacheName: faker.random.alphaNumeric(22)}, (e, result) => {
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete a non-existent cache from each env', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          org.caches.del({cacheName: faker.random.alphaNumeric(22), environment:env}, (e, result) => {
            assert.isNotNull(e, "the expected error did not occur");
            tick();
          });
        });
      });

    });

  });


});
