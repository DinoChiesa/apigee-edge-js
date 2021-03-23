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
  const resourceDir = "./test/resources/specs",
        path = require('path'),
        util = require('util'),
        fs = require('fs');

  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);
  common.connectApigee(function(org){
    const num = faker.random.number(),
          word = faker.lorem.word(),
          specName1 = `apigee-edge-js-test-${word}-${num}-1`,
          specContent1 = `content-goes-here-${word}-${num}`,
          specName2 = `apigee-edge-js-test-${word}-${num}-2`;
    let specfiles, specContent2;

    function next(done){
      fs.readdir(path.resolve(resourceDir), function(e, items) {
        assert.isNull(e, "error getting specs: " + util.format(e));
        specfiles = items
          .map(item => { return {item, fq:path.resolve( path.join(resourceDir, item)) };})
          .filter(item => fs.statSync(item.fq).isFile());
        done();
      });
    }

    before(function(done) {
      let numDoneDeleted = 0;
      org.specs.list(function(e, result) {
        assert.isNull(e, "error listing: " + util.format(e));
        result = result.filter( x => x.startsWith('apigee-edge-js-test-'));
        if (result.length > 1) {
          result.forEach( name => {
            org.specs.del({name}, function(e, result){
              assert.isNull(e, "error deleting: " + util.format(e));
              numDoneDeleted++;
              if (numDoneDeleted == result.length) {
                next(done);
              }
            });
          });
        }
        else {
          next(done);
        }
      });
    });

    describe('create', function() {

      it('should create a spec from a string', function(done) {
        org.specs.create({name:specName1, content: specContent1}, function(e, result){
          assert.isNull(e, "error creating: " + util.format(e));
          done();
        });
      });

      it('should create a spec from a file', function(done) {
        org.specs.create({name:specName2, filename: specfiles[0].fq}, function(e, result){
          assert.isNull(e, "error creating: " + util.format(e));
          done();
        });
      });

      it('should fail to create a spec with no name', function(done) {
        org.specs.create({notname:"anything"}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to create a spec with an empty name', function(done) {
        org.specs.create({name:''}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to create a spec with no content', function(done) {
        org.specs.create({name:specName1 + ".foo"}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

    describe('get', function() {

      it('should get spec home', function(done) {
        org.specs.getHome(function(e, result){
          assert.isNull(e, "error getting: " + util.format(e));
          //console.log(JSON.stringify(result));
          assert.isNotNull(result.contents);
          assert.isAtLeast(result.contents.length, 1, "zero results");
          done();
        });
      });

      it('should list specs', function(done) {
        org.specs.list(function(e, result){
          assert.isNull(e, "error getting: " + util.format(e));
          assert.isAtLeast(result.length, 1, "zero results");
          done();
        });
      });

      it('should get content for a spec by name', function(done) {
        org.specs.get({name:specName1}, function(e, result){
          assert.isNull(e, "unexpected error");
          assert.equal(result, specContent1);
          done();
        });
      });
      it('should get content for a spec by name', function(done) {
        org.specs.get({name:specName2}, function(e, result){
          assert.isNull(e, "unexpected error");
          assert.equal(result, fs.readFileSync(specfiles[0].fq, 'utf8'));
          done();
        });
      });

    });

    describe('getMeta', function() {
      it('should get metadata for a spec by name', function(done) {
        org.specs.getMeta({name:specName1}, function(e, result){
          assert.isNull(e, "unexpected error");
          done();
        });
      });

      it('should fail to get metadata for a non-existent spec by name', function(done) {
        org.specs.getMeta({name:faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
    });


    describe('update', function() {

      it('should update a spec with string content', function(done) {
        org.specs.update({name:specName1, content: "updated"}, function(e, result){
          assert.isNull(e, "error updating: " + util.format(e));
          done();
        });
      });

      it('should update a spec with a file', function(done) {
        org.specs.update({name:specName1, filename: specfiles[0].fq}, function(e, result){
          assert.isNull(e, "error updating: " + util.format(e));
          done();
        });
      });

      it('should fail to update a spec with no name', function(done) {
        org.specs.update({notname:"anything"}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to update a spec with an empty name', function(done) {
        org.specs.update({name:''}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to update a spec with no content', function(done) {
        org.specs.update({name:specName1 + ".foo"}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });


    describe('delete', function() {

      it('should delete a spec', function(done) {
        org.specs.del({name:specName1}, function(e, result){
          assert.isNull(e, "error deleting: " + util.format(e));
          done();
        });
      });

      it('should delete another spec', function(done) {
        org.specs.del({name:specName2}, function(e, result){
          assert.isNull(e, "error deleting: " + util.format(e));
          done();
        });
      });

      it('should fail to delete a spec with no name', function(done) {
        org.specs.del({}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete a non-existent spec', function(done) {
        org.specs.del({name: faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
