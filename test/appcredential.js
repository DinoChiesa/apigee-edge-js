// appcredential.js
// ------------------------------------------------------------------
//
// Tests for operations on App Credentials
//
// Copyright 2019-2022 Google LLC
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
  common.connectApigee(function(org){

    const entityName = "apigee-edge-js-test-" + faker.lorem.word() + faker.random.number(),
          firstName = faker.name.firstName(),
          lastName = faker.name.lastName(),
          developerEmail = `${firstName}.${lastName}@apigee-edge-js-test.org`.toLowerCase(),
          testCredential = faker.lorem.word() + '-' + faker.lorem.word() + '-' + faker.random.number(),
          createOptions = {
            developerEmail,
            lastName,
            firstName,
            userName : firstName + lastName
          };
    var apiProducts = [];

    before( () =>
            org.developers.create(createOptions)
            //.then( result => console.log(result) )
            .then( () => org.products.get() )
            .then( result => {
              if (config.apigeex) {
                result = result.apiProduct.map(p => p.name);
              }
              apiProducts = result;
            } )
            .then ( () => {
              const appCreateOptions = {
                      developerEmail,
                      name : entityName,
                      apiProduct : apiProducts[0]
                    };
              return org.developerapps.create(appCreateOptions);
            })
            .catch(e => console.log(e))
          );

    after( () => org.developers.del({developerEmail}) );

    describe('add', function() {
      it('should add a generated credential with expiry', () => {
        assert.isOk(apiProducts);
        assert.isTrue(apiProducts.length>0);
        const options = {
                developerEmail,
                appName : entityName,
                expiry: '60m',
                apiProducts : [apiProducts[0]]
              };
        return org.appcredentials.add(options)
          .then( result => {
            //console.log(JSON.stringify(result));
          })
          .catch( reason => {
            console.log(reason);
            assert.fail('should not be reached');
          });
      });

      it('should add a generated credential with no expiry', () => {
        const options = {
                developerEmail,
                appName : entityName,
                apiProducts : [apiProducts[0]]
              };
        return org.appcredentials.add(options)
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
                consumerKey : testCredential
              };
        return org.appcredentials.add(options)
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
        return org.appcredentials.add(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            //console.log(reason.error);
            assert.equal(error, 'Error: bad status: 404');
          });
      });

    });


    describe('get', function() {

      it('should get details for an existing credential', () => {
        const options = {
                developerEmail,
                appName: entityName,
                consumerKey : testCredential
              };
        return org.appcredentials.get(options)
          .then( result => {
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.consumerKey, testCredential);
            assert.isNotNull(result.apiProducts);
            assert.equal(result.apiProducts[0].apiproduct, apiProducts[0]); // from test setup
            assert.isNotNull(result.attributes);
            assert.isNotNull(result.expiresAt);
          });
      });

      it('should fail to get details for a non-existing credential', () => {
        const options = {
                developerEmail,
                appName: entityName,
                consumerKey : faker.lorem.word() + faker.random.number() // DNE
              };
        return org.appcredentials.get(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            assert.equal(error, 'Error: bad status: 404');
          });
      });

    });


    describe('find', function() {

      it('should find a previously added credential', () => {
        const options = {
                consumerKey : testCredential
              };
        return org.appcredentials.find(options)
          .then( result => {
            assert.equal(result.key, testCredential);
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
        return org.appcredentials.find(options)
          .then( result => {
            assert.equal(typeof result, 'undefined');
          })
          .catch( reason => {
            assert.fail('should not be reached');
          });
      });

      it('should fail to find when no key specified', () => {
        const options = { something: 'nothing' };
        return org.appcredentials.find(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            assert.equal(error, 'Error: missing key');
          });
      });
    });


    describe('products', function() {

      // it('should list products on an existing credential?', () => {
      //   const options = {
      //           developerEmail,
      //           consumerKey : testCredential
      //         };
      //   return org.appcredentials.listProducts(options)
      //     .then( result => {
      //       assert.equal(result.key, testCredential);
      //     });
      //     // .catch( reason => {
      //     //   console.log(reason.error);
      //     //   assert.fail('should not be reached');
      //     // });
      // });

      it('should add a product to an existing credential', () => {
        const options = {
                developerEmail,
                appName: entityName,
                consumerKey : testCredential,
                product : apiProducts[1]
              };
        return org.appcredentials.addProduct(options)
          .then( result => {
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.consumerKey, testCredential);
            assert.equal(result.apiProducts.length, 2);
            assert.equal(result.apiProducts[0].apiproduct, apiProducts[0]); // from test setup
            assert.equal(result.apiProducts[1].apiproduct, apiProducts[1]);
          });
          // .catch( reason => {
          //   console.log(reason.error);
          //   assert.fail('should not be reached');
          // });
      });

      it('should fail to add a product when credential does not exist', () => {
        const options = {
                developerEmail,
                appName: entityName,
                consumerKey : 'xxx-' + faker.lorem.word() + '-' + faker.random.number(), // DNE
                product : apiProducts[1]
              };
        return org.appcredentials.addProduct(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( error => {
            assert.equal(error, 'Error: bad status: 404');
          });
      });

      it('should remove a product from a credential', () => {
        const options = {
                developerEmail,
                appName: entityName,
                consumerKey : testCredential,
                product : apiProducts[1]
              };
        return org.appcredentials.removeProduct(options)
          .then( result => {
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.consumerKey, testCredential);
            assert.equal(result.apiProducts.length, 1);
            assert.equal(result.apiProducts[0].apiproduct, apiProducts[0]); // from test setup
          })
          .catch( error => {
            let util = require('util');
            console.log(util.format(error));
            assert.fail('should not be reached');
          });
      });

      it('should fail to remove a product that is not currently on a credential', () => {
        const options = {
                developerEmail,
                appName: entityName,
                consumerKey : testCredential,
                product : apiProducts[2]
              };
        return org.appcredentials.removeProduct(options)
          .then( result => {
            console.log(JSON.stringify(result, null, 2));
            assert.fail('should not be reached');
          })
          .catch( e => {
            //let util = require('util');
            //console.log(util.format(e));
            if (config.apigeex) {
              assert.equal(e.result.error.code, 400);
              assert.equal(e.result.error.message, 'APIProduct is not associated with consumer key');
            }
            else {
              assert.equal(e, 'Error: bad status: 500');
              assert.equal(e.result.message, 'APIProduct is not associated with consumer key');
            }
          });
      });

    });


    describe('update', function() {

      it('should update an existing credential', () => {
        const attr1 = faker.lorem.word() + '-' + faker.lorem.word(),
              attr2 = faker.lorem.word() + '-' + faker.lorem.word(),
              options = {
                developerEmail,
                appName : entityName,
                consumerKey : testCredential,
                attributes: { attr1, attr2 }
              };
        return org.appcredentials.update(options)
          .then( result => {
            //console.log(JSON.stringify(result));
            assert.isNotNull(result.attributes);
            assert.equal(result.attributes.length, 2);
            assert.equal(result.attributes[0].value, attr1);
            assert.equal(result.attributes[1].value, attr2);
          })
          .catch( error => {
            var util = require('util');
            console.log(util.format(error));
            assert.fail('should not be reached');
          });
      });

      it('should fail to update a non-existing credential', () => {
        const attr1 = faker.lorem.word() + '-' + faker.lorem.word(),
              attr2 = faker.lorem.word() + '-' + faker.lorem.word(),
              fakeCredential = faker.lorem.word() + '-' + faker.lorem.word() + '-' + faker.random.number(), // DNE
              options = {
                developerEmail,
                appName : entityName,
                consumerKey : fakeCredential,
                attributes: { attr1, attr2 }
              };
        return org.appcredentials.update(options)
          .then( result => {
            console.log(JSON.stringify(result, null, 2));
            assert.fail('should not be reached');
          })
          .catch( e => {
            // let util = require('util');
            // console.log(util.format(e));
            if (config.apigeex) {
              assert.equal(e.result.error.code, 404);
              assert.equal(e.result.error.message, 'Invalid consumer key for Given App');
            }
            else {
              assert.equal(e, 'Error: bad status: 404');
              assert.equal(e.result.message, 'Invalid consumer key for Given App');
            }
          });
      });
    });

    describe('del', function() {

      it('should delete a previously added credential', () => {
        const options = {
                developerEmail,
                appName : entityName,
                consumerKey : testCredential
              };
        return org.appcredentials.del(options)
          .then( result => {
            //console.log(JSON.stringify(result));
            assert.equal(result.consumerKey, testCredential);
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
        return org.appcredentials.del(options)
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
        return org.appcredentials.del(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( e => {
            if (config.apigeex) {
              assert.equal(e.result.error.code, 404);
              assert.equal(e.result.error.message, 'Invalid consumer key for Given App');
            }
            else {
              assert.equal(e, 'Error: bad status: 404');
              assert.equal(e.result.code, "keymanagement.service.InvalidClientIdForGivenApp");
            }
          });
      });

      it('should fail to delete a credential on non-existing devapp', () => {
        const options = {
                developerEmail,
                appName : faker.lorem.word(),
                consumerKey : faker.lorem.word() + faker.random.number()
              };
        return org.appcredentials.del(options)
          .then( result => {
            assert.fail('should not be reached');
          })
          .catch( e => {
            if (config.apigeex) {
              assert.equal(e.result.error.code, 404);
              assert.equal(e.result.error.message, `App named ${options.appName} does not exist under ${developerEmail}`);
            }
            else {
            assert.equal(e, 'Error: bad status: 404');
              assert.equal(e.result.code, "developer.service.AppDoesNotExist");
            }
          });
      });


    });

  });

});
