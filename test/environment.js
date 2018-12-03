// environment.js
// ------------------------------------------------------------------
//
// Tests for environment operations.
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

describe('Environment', function() {
  this.timeout(common.testTimeout);
  common.connectEdge(function(edgeOrg){
      var environments = [];

      before(function(done) {
       edgeOrg.environments.get(function(e, result) {
         assert.isNull(e, "error listing: " + JSON.stringify(e));
         environments = result;
         done();
       });
      });

    describe('get', function() {

      it('should get the list of environments', function(done) {
        edgeOrg.environments.get({}, function(e, result){
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isAtLeast(result.length, 1, "zero results");
          done();
        });
      });

      it('should get details for each env', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.environments.get({environment:env}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.equal(result.name, env );
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it('should fail to get details from a non-existent env', function(done) {
        edgeOrg.environments.get({environment:faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });


    describe('getVhosts', function() {

      it('should get the vhosts for each environment', function(done) {
        var numDoneEnv = 0;
        environments.forEach(function(env) {
          edgeOrg.environments.getVhosts({environment:env}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.isAtLeast(result.length, 1, "zero results");
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it('should fail to get vhosts from a non-existent env', function(done) {
        edgeOrg.environments.getVhosts({environment:faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });



  });


});
