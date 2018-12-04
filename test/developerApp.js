// developerApp.js
// ------------------------------------------------------------------
//
// Tests for operations on Developer apps.
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

/* global describe, faker, it, before, after */

var common = require('./common');

describe('DeveloperApp', function() {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);
  common.connectEdge(function(edgeOrg){

    const entityName = "apigee-edge-js-test-" + faker.lorem.word() + faker.random.number(),
          firstName = faker.name.firstName(),
          lastName = faker.name.lastName(),
          developerEmail = `${firstName}.${lastName}@apigee-edge-js-test.org`,
          createOptions = {
            developerEmail,
            lastName,
            firstName,
            userName : firstName + lastName
          };
    var apiProducts = [];

    before( () =>
            edgeOrg.developers.create(createOptions)
            .then ( () => edgeOrg.products.get() )
            .then ( (result) => { apiProducts = result;} )
          );

    after( () => edgeOrg.developers.del({developerEmail}) );

    describe('create', function() {
      it('should create a developer app', () => {
        const options = {
                developerEmail,
                name : entityName,
                apiProduct : apiProducts[0]
              };

        return edgeOrg.developerapps.create(options)
          .then( (result) => {
            assert.exists(result.name);
            assert.exists(result.credentials);
            assert.isAtLeast(result.credentials.length, 1);
          });
      });

      it('should fail to create a developer app with existing name', () => {
        const options = {
                developerEmail,
                name : entityName,
                apiProduct : apiProducts[0]
              };

        return edgeOrg.developerapps.create(options)
          .then( (result) => {
            assert.exists(result.error);
            assert.equal(result.error, "bad status");
            assert.equal(result.message, `App with name ${entityName} already exists`);
          } );

      });

      it('should fail to create a developer app w/non-existing product', () => {
        const fakeName = faker.random.alphaNumeric(22);
        const options = {
                developerEmail,
                name : entityName + '-B',
                apiProduct : fakeName
              };
        return edgeOrg.developerapps.create(options)
          .then( (result) => {
            assert.exists(result.error);
            assert.equal(result.error, "bad status");
            assert.isTrue(result.message.startsWith(`API Product [${fakeName}] does not exist`));
          } );

      });


      it('should fail to create a developer app - no name', () => {
        const options = {
                developerEmail,
                apiProduct : faker.random.alphaNumeric(22)
              };

        return edgeOrg.developerapps.create(options)
          .then( (result) => {
            assert.exists(result.error);
            assert.equal(result.error, "missing required inputs, one of {developer, appName, apiProduct}");
          } );
      });

    });


    describe('get', function() {

      it('should get a list of developerapps', () =>
         edgeOrg.developerapps.get({developerEmail})
         .then ( (result) => {
           assert.notExists(result.error);
           assert.exists(result.length);
           assert.isAtLeast(result.length, 1);
         })
        );

      it('should fail to get a non-existent developerapp', () => {
        const nonExistentApp = faker.random.alphaNumeric(22);
        return edgeOrg.developerapps.get({developerEmail, name:nonExistentApp})
          .then ( (result) => {
            assert.isNotNull(result.error, "the expected error did not occur");
            assert.exists(result.message);
            assert.equal(result.message, `App named ${nonExistentApp} does not exist under ${developerEmail}`);
          });
      });

      it('should fail to get apps under a non-existent developer', () => {
        const nonExistentDev = faker.random.alphaNumeric(22);
        return edgeOrg.developerapps.get({developerEmail:nonExistentDev})
          .then ( (result) => {
            assert.isNotNull(result.error, "the expected error did not occur");
            assert.exists(result.message);
            assert.equal(result.message,`DeveloperId ${nonExistentDev} does not exist in organization ${edgeOrg.conn.orgname}`);
          });
      });

    });


    describe('delete', function() {

      it('should delete a developerapp', () =>
         edgeOrg.developerapps.del({developerEmail, name : entityName}) );

      it('should fail to delete a developerapp because no email', () =>
         edgeOrg.developerapps.del({name : entityName})
         .then( (result) => assert.exists(result.error)));

      it('should fail to delete a non-existent developerapp', () => {
        const fakeName = faker.random.alphaNumeric(22);
        return edgeOrg.developerapps.del({developerEmail, name : fakeName})
         .then( (result) => {
           assert.exists(result.error);
           assert.equal(result.error,"bad status");
           assert.equal(result.code,"developer.service.AppDoesNotExist");
           assert.equal(result.message,`App named ${fakeName} does not exist under ${developerEmail}`);
         });
      });

      it('should fail to delete an app under a non-existent developer', () => {
        const fakeName = faker.random.alphaNumeric(22);
        const fakeEmail = faker.random.alphaNumeric(22);
        return edgeOrg.developerapps.del({developerEmail:fakeEmail, name : fakeName})
         .then( (result) => {
           assert.exists(result.error);
           assert.equal(result.error,"bad status");
           assert.equal(result.code,"developer.service.DeveloperIdDoesNotExist");
           assert.equal(result.message,`DeveloperId ${fakeEmail} does not exist in organization ${edgeOrg.conn.orgname}`);
         });
      });

    });

  });


});
