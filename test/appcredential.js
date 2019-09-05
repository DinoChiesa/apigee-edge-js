// appcredential.js
// ------------------------------------------------------------------
//
// Tests for operations on App Credentials
//
// Copyright 2019 Google LLC
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

describe('AppCredential', function() {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);
  common.connectEdge(function(edgeOrg){

    const entityName = "apigee-edge-js-test-" + faker.lorem.word() + faker.random.number(),
          firstName = faker.name.firstName(),
          lastName = faker.name.lastName(),
          developerEmail = `${firstName}.${lastName}@apigee-edge-js-test.org`,
          credentialToAdd = faker.lorem.word() + faker.random.number(),
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
            .then ( result => { apiProducts = result; } )
            .then ( () => {
              const appCreateOptions = {
                      developerEmail,
                      name : entityName,
                      apiProduct : apiProducts[0]
                    };
              return edgeOrg.developerapps.create(appCreateOptions);
            })
          );

    after( () => edgeOrg.developers.del({developerEmail}) );

    describe('add', function() {
      it('should add a generated credential with expiry', () => {
        const options = {
                developerEmail,
                appName : entityName,
                expiry: '60m',
                apiProducts : [apiProducts[0]]
              };
        return edgeOrg.appcredentials.add(options)
          .then( result => {
            //console.log(JSON.stringify(result));
          })
          .catch( reason => {
            console.log(reason.error);
            assert.fail('should not be reached');
          });
      });

      it('should add a generated credential with no expiry', () => {
        const options = {
                developerEmail,
                appName : entityName,
                apiProducts : [apiProducts[0]]
              };
        return edgeOrg.appcredentials.add(options)
          .then( result => {
            //console.log(JSON.stringify(result));
          })
          .catch( reason => {
            console.log(reason.error);
            assert.fail('should not be reached');
          });
      });

      it('should add a provided credential', () => {
        const options = {
                developerEmail,
                appName : entityName,
                apiProducts : [apiProducts[0]],
                consumerKey : credentialToAdd
              };
        return edgeOrg.appcredentials.add(options)
          .then( result => {
            //console.log(JSON.stringify(result));
          })
          .catch( reason => {
            console.log(reason.error);
            assert.fail('should not be reached');
          });
      });

      it('should fail to add - no app name', () => {
        const options = {
                developerEmail,
                //appName : entityName,
                apiProducts : [apiProducts[0]],
                consumerKey : faker.lorem.word() + faker.random.number()
              };
        return edgeOrg.appcredentials.add(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            //console.log(reason.error);
            assert.equal(error, 'Error: bad status: 404');
          });
      });

    });


    describe('find', function() {

      it('should find a previously added credential', () => {
        const options = {
                consumerKey : credentialToAdd
              };
        return edgeOrg.appcredentials.find(options)
          .then( result => {
            assert.equal(result.key, credentialToAdd);
          });
          // .catch( reason => {
          //   console.log(reason.error);
          //   assert.fail('should not be reached');
          // });
      });

      it('should not find a non-existent credential', () => {
        const options = {
                consumerKey : faker.lorem.word() + faker.random.number()
              };
        return edgeOrg.appcredentials.find(options)
          .then( result => {
            assert.equal(typeof result, 'undefined');
          })
          .catch( reason => {
            assert.fail('should not be reached');
          });
      });

      it('should fail to find when no key specified', () => {
        const options = { something: 'nothing' };
        return edgeOrg.appcredentials.find(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            assert.equal(error, 'Error: missing key');
          });
      });

    });


    describe('del', function() {

      it('should delete a previously added credential', () => {
        const options = {
                developerEmail,
                appName : entityName,
                consumerKey : credentialToAdd
              };
        return edgeOrg.appcredentials.del(options)
          .then( result => {
            //console.log(JSON.stringify(result));
          })
          .catch( error => {
            var util = require('util');
            console.log(util.format(error));
            assert.fail('should not be reached');
          });
      });

      it('should fail to delete when not specifying a credential', () => {
        const options = {
                developerEmail,
                appName : entityName
                //consumerKey : faker.lorem.word() + faker.random.number()
              };
        return edgeOrg.appcredentials.del(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            assert.equal(error, 'Error: missing appName or key');
          });
      });

      it('should fail to delete a non-existent credential', () => {
        const options = {
                developerEmail,
                appName : entityName,
                consumerKey : faker.lorem.word() + faker.random.number()
              };
        return edgeOrg.appcredentials.del(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            assert.equal(error, 'Error: bad status: 404');
            assert.equal(error.result.code, "keymanagement.service.InvalidClientIdForGivenApp");
          });
      });

      it('should fail to delete a credential on non-existing devapp', () => {
        const options = {
                developerEmail,
                appName : faker.lorem.word(),
                consumerKey : faker.lorem.word() + faker.random.number()
              };
        return edgeOrg.appcredentials.del(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            assert.equal(error, 'Error: bad status: 404');
            assert.equal(error.result.code, "developer.service.AppDoesNotExist");
          });
      });


    });

  });

});
