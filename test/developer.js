// developer.js
// ------------------------------------------------------------------
//
// Tests for Developer operations.
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
// created: Sat Apr 29 09:17:48 2017
// last saved: <2018-December-03 16:36:30>

/* global describe, faker, it */

var common = require('./common');

describe('Developer', function() {
  this.timeout(common.testTimeout);
  common.connectEdge(function(edgeOrg){

    var firstName = faker.name.firstName(); // Rowan
    var lastName = faker.name.lastName(); // Nikolaus
    var options = {
          developerEmail : lastName + '.' + firstName + "@apigee-edge-js-test.org",
          lastName : lastName,
          firstName : firstName,
          userName : firstName + lastName,
          attributes: { uuid: faker.random.uuid() }
        };

    describe('create', function() {
      it('should create a developer', function(done) {
        edgeOrg.developers.create(options, function(e, result){
          assert.isNull(e, "error creating: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });

      it('should fail to create a developer', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.developerEmail;
        edgeOrg.developers.create(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
    });

    describe('get', function() {

      it('should get a list of developers', () =>
         edgeOrg.developers.get({})
         .then ( (result) => {
           assert.notExists(result.error);
           assert.exists(result.length);
           assert.isAtLeast(result.length, 1);
         })
      );

      it('should fail to get a non-existent developer', () => {
        const developerEmail = faker.random.alphaNumeric(22);
        return edgeOrg.developers.get({developerEmail})
         .then ( (result) => {
           assert.isNotNull(result.error, "the expected error did not occur");
           assert.exists(result.message);
           assert.equal(result.message,`DeveloperId ${developerEmail} does not exist in organization ${edgeOrg.conn.orgname}`);
         });
      });

    });


    describe('delete', function() {
      it('should delete a developer', function(done) {
        edgeOrg.developers.del({developerEmail:options.developerEmail}, function(e, result){
          assert.isNull(e, "error deleting: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });

      it('should fail to delete a developer because no email was specified', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.developerEmail;
        edgeOrg.developers.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete a non-existent developer', function(done) {
        let badOptions = Object.assign({}, options);
        badOptions.developerEmail = faker.random.alphaNumeric(22) + "@apigee-edge-js-test.org";
        edgeOrg.developers.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
