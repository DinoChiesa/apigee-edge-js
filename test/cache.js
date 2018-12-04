// cache.js
// ------------------------------------------------------------------
//
// Tests for cache operations.
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

describe('Cache', function() {
  this.timeout(common.testTimeout);
  common.connectEdge(function(edgeOrg){
    const num = faker.random.number(),
          word = faker.lorem.word(),
          cacheName = `apigee-edge-js-test-${word}-${num}`;
      var environments = [];

      before(function(done) {
       edgeOrg.environments.get(function(e, result) {
         assert.isNull(e, "error listing: " + JSON.stringify(e));
         environments = result;
         done();
       });
      });

    describe('create', function() {

      it('should create a cache in each env', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.caches.create({cacheName, environment:env}, function(e, result){
            assert.isNull(e, "error creating: " + JSON.stringify(e));
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it('should fail to create a cache with no name', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.caches.create({environment:env}, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it('should fail to create a cache with an empty name', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.caches.create({cacheName:'', environment:env}, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it('should fail to create a cache with no env', function(done) {
        edgeOrg.caches.create({cacheName}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to create a cache with an invalid env name', function(done) {
        edgeOrg.kvms.create({cacheName, environment:faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

    describe('get', function() {

      it('should get caches from each env', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.caches.get({environment:env}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.isAtLeast(result.length, 1, "zero results");
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it('should fail to get caches from a non-existent env', function(done) {
        edgeOrg.caches.get({environment:faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to get non-existent cache from an env', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.caches.get({name:faker.random.alphaNumeric(22), environment:env}, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

    });

    describe('delete', function() {

      it('should delete a cache from each env', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.caches.del({cacheName, environment:env}, function(e, result){
            assert.isNull(e, "error deleting: " + JSON.stringify(e));
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it('should fail to delete a cache because neither name nor env was specified', function(done) {
        edgeOrg.caches.del({}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete a cache because no env was specified', function(done) {
        edgeOrg.caches.del({cacheName: faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete a non-existent cache from each env', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.caches.del({cacheName: faker.random.alphaNumeric(22), environment:env}, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

    });

  });


});
