// developerApp.js
// ------------------------------------------------------------------
//
// Tests for operations on Developer apps.
//
// Copyright 2017-2019 Google LLC
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
          .then( result => {
            assert.exists(result.name);
            assert.exists(result.credentials);
            assert.isAtLeast(result.credentials.length, 1);
          })
          .catch( error => {
            var util = require('util');
            console.log(util.format(error));
            assert.fail('should not be reached');
          });
      });

      it('should fail to create a developer app with existing name', () => {
        const options = {
                developerEmail,
                name : entityName,
                apiProduct : apiProducts[0]
              };

        return edgeOrg.developerapps.create(options)
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.equal(error, "Error: bad status: 409");
            assert.exists(error.result);
            assert.equal(error.result.message, `App with name ${entityName} already exists`);
          });
      });

      it('should fail to create a developer app w/non-existing product', () => {
        const fakeName = faker.random.alphaNumeric(22);
        const options = {
                developerEmail,
                name : entityName + '-B',
                apiProduct : fakeName
              };
        return edgeOrg.developerapps.create(options)
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.equal(error, "Error: bad status: 400");
            assert.exists(error.result);
            assert.isTrue(error.result.message.startsWith(`API Product [${fakeName}] does not exist`));
          } );

      });

      it('should fail to create a developer app - no name', () => {
        const options = {
                developerEmail,
                apiProduct : faker.random.alphaNumeric(22)
              };

        return edgeOrg.developerapps.create(options)
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.equal(error, 'Error: missing required input: appName');
          } );
      });

      it('should fail to create a developer app - no developer', () => {
        const options = {
                name : entityName + '-C',
                apiProduct : faker.random.alphaNumeric(22)
              };

        return edgeOrg.developerapps.create(options)
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.equal(error, 'Error: missing required input: email');
          } );
      });

      it('should fail to create a developer app - no product', () => {
        const options = {
                developerEmail,
                name : entityName + '-D'
              };

        return edgeOrg.developerapps.create(options)
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.equal(error, 'Error: missing required input: apiProduct');
          } );
      });

    });


    describe('get', function() {

      it('should get a list of developerapps', () =>
         edgeOrg.developerapps
         .get({developerEmail})
         .then ( result => {
           assert.notExists(result.error);
           assert.exists(result.length);
           assert.isAtLeast(result.length, 1);
         })
         .catch(reason => assert.fail('should not be reached'))
        );

      it('should fail to get apps when supplying no identifier', () =>
         edgeOrg.developerapps
         .get({nothing:'useful'})
         .then ( () => assert.fail('should not be reached') )
         .catch( error => {
           //const util = require('util');
           //console.log('reason: ' + util.format(reason));
           assert.equal(error, "Error: missing developer email or id");
         })
        );

      it('should fail to get a non-existent developerapp', () => {
        const nonExistentApp = faker.random.alphaNumeric(22);
        return edgeOrg.developerapps.get({developerEmail, name:nonExistentApp})
          .then( () => assert.fail('should not be reached'))
          .catch( reason => {
            assert.isNotNull(reason.error, "the expected error did not occur");
            assert.exists(reason.result);
            assert.exists(reason.result.message);
            assert.equal(reason.result.message, `App named ${nonExistentApp} does not exist under ${developerEmail}`);
          });
      });

      it('should fail to get apps under a non-existent developer', () => {
        const nonExistentDev = faker.random.alphaNumeric(22);
        return edgeOrg.developerapps.get({developerEmail:nonExistentDev})
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.isNotNull(error, "the expected error did not occur");
            assert.exists(error.result);
            assert.exists(error.result.message);
            assert.equal(error.result.message,`DeveloperId ${nonExistentDev} does not exist in organization ${edgeOrg.conn.orgname}`);
          });
      });

    });



    describe('attributes', function() {
      var originalAttrCount = 0;
      it('should get the custom attributes on an existing developerapp', () => {
        //edgeOrg.conn.verbosity = 1;
        return edgeOrg.developerapps.get({ developerEmail, name : entityName })
          .then ( result => {
            assert.exists(result.attributes);
            assert.isTrue(Array.isArray(result.attributes));
            originalAttrCount = result.attributes.length;
            if (result.attributes.length > 0) {
              //console.log('[0]: ' +JSON.stringify(result.attributes[0]));
            }
          })
          .catch(reason => {
            const util = require ('util');
            console.log(util.format(reason));
            assert.fail('should not be reached');
          });
      });

      it('should update the custom attributes on an existing developerapp', () => {
        const attributes = {
                updatedBy : 'apigee-edge-js-test',
                updateDate: new Date().toISOString()
              };
        return edgeOrg.developerapps.update({ developerEmail, name : entityName, attributes })
          .then ( result => {
            assert.exists(result.attributes);
            //console.log('attrs: ' + JSON.stringify(result.attributes));
            assert.equal(result.attributes.length, 2 + originalAttrCount);
            assert.isTrue(result.attributes.find( x => x.name == 'updatedBy').value == 'apigee-edge-js-test');
            assert(result.attributes.find( x => x.name == 'updateDate'));
          });
        //.catch(reason => assert.fail('should not be reached'));
      });

      it('should read the custom attributes on an existing developerapp', () => {
        return edgeOrg.developerapps.get({ developerEmail, name : entityName })
          .then ( result => {
            assert.exists(result.attributes);
            assert.equal(result.attributes.length, 2 + originalAttrCount);
            assert.isTrue(result.attributes.find( x => x.name == 'updatedBy').value == 'apigee-edge-js-test');
            assert(result.attributes.find( x => x.name == 'updateDate'));
          });
        // .catch(reason => assert.fail('should not be reached'));
      });

      it('should replace the custom attributes on an existing developerapp', () => {
        const attributes = {};
        return edgeOrg.developerapps.update({ developerEmail, name : entityName, replace:true, attributes })
          .then ( result => {
            assert.exists(result.attributes);
            assert.equal(result.attributes.length, 0);
          })
          .catch(reason => assert.fail('should not be reached'));
      });


    });


    describe('delete', function() {

      it('should delete a developerapp', () =>
         edgeOrg.developerapps
         .del({developerEmail, name : entityName})
         .catch( reason => {
            console.log(reason.error);
            assert.fail('should not be reached');
         })
        );

      it('should fail to delete a developerapp because no email', () =>
         edgeOrg.developerapps
         .del({name : entityName})
         .then( () => assert.fail('should not be reached'))
         .catch( error => {
           assert.equal(error, "Error: missing developer email or id");
         }));

      it('should fail to delete a developerapp because no name', () =>
         edgeOrg.developerapps
         .del({developerEmail})
         .then( () => assert.fail('should not be reached'))
         .catch( error => {
           assert.equal(error, "Error: missing developer app name");
         }));

      it('should fail to delete a non-existent developerapp', () => {
        const fakeName = faker.random.alphaNumeric(22);
        return edgeOrg.developerapps
          .del({developerEmail, name : fakeName})
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.equal(error,"Error: bad status: 404");
            assert.exists(error.result);
            assert.equal(error.result.code,"developer.service.AppDoesNotExist");
            assert.equal(error.result.message,`App named ${fakeName} does not exist under ${developerEmail}`);
          });
      });

      it('should fail to delete an app under a non-existent developer', () => {
        const fakeName = faker.random.alphaNumeric(22);
        const fakeEmail = faker.random.alphaNumeric(22);
        return edgeOrg.developerapps.del({developerEmail:fakeEmail, name : fakeName})
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.equal(error,"Error: bad status: 404");
            assert.exists(error.result);
            assert.equal(error.result.code,"developer.service.DeveloperIdDoesNotExist");
            assert.equal(error.result.message,`DeveloperId ${fakeEmail} does not exist in organization ${edgeOrg.conn.orgname}`);
          });
      });

    });

  });


});
