// spec.js
// ------------------------------------------------------------------
//
// Tests for spec operations.
//
// Copyright 2019 Google LLC.
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

describe('Spec', function() {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);
  common.connectEdge(function(edgeOrg){
    const num = faker.random.number(),
          word = faker.lorem.word(),
          specName = `apigee-edge-js-test-${word}-${num}`;

    before(function(done) {
      let numDoneDeleted = 0;
      edgeOrg.specs.list(function(e, result) {
        assert.isNull(e, "error listing: " + JSON.stringify(e));
        result = result.filter( x => x.startsWith('apigee-edge-js-test-'));
        if (result.length > 1) {
          result.forEach( name => {
            edgeOrg.specs.del({name}, function(e, result){
              assert.isNull(e, "error deleting: " + JSON.stringify(e));
              numDoneDeleted++;
              if (numDoneDeleted == result.length) {
                done();
              }
            });
          });
        }
        else {
          done();
        }
      });
    });

    describe('create', function() {

      it('should create a spec', function(done) {
        edgeOrg.specs.create({name:specName, content: "foo"}, function(e, result){
          assert.isNull(e, "error creating: " + JSON.stringify(e));
          done();
        });
      });

      it('should fail to create a spec with no name', function(done) {
        edgeOrg.specs.create({notname:"anything"}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to create a spec with an empty name', function(done) {
        edgeOrg.specs.create({name:''}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to create a spec with no content', function(done) {
        edgeOrg.specs.create({name:specName + ".2"}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

    describe('get', function() {

      it('should get spec home', function(done) {
        edgeOrg.specs.getHome(function(e, result){
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isNotNull(result.content);
          assert.isAtLeast(result.content.length, 1, "zero results");
          done();
        });
      });

      it('should list specs', function(done) {
        edgeOrg.specs.list(function(e, result){
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isAtLeast(result.length, 1, "zero results");
          done();
        });
      });

      it('should get a spec by name', function(done) {
        edgeOrg.specs.getDoc({name:specName}, function(e, result){
          assert.isNull(e, "unexpected error");
          done();
        });
      });

      it('should fail to get a non-existent spec by name', function(done) {
        edgeOrg.specs.getDoc({name:faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

    describe('delete', function() {

      it('should delete a spec', function(done) {
        edgeOrg.specs.del({name:specName}, function(e, result){
          assert.isNull(e, "error deleting: " + JSON.stringify(e));
          done();
        });
      });

      it('should fail to delete a spec with no name', function(done) {
        edgeOrg.specs.del({}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete a non-existent spec', function(done) {
        edgeOrg.specs.del({name: faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
