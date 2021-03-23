// developer.js
// ------------------------------------------------------------------
//
// Tests for Developer operations.
//
// Copyright 2017-2021 Google LLC
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
// last saved: <2021-March-23 08:33:00>

/* global describe, faker, it */

const common = require('./common');
const util = require('util');

describe('Developer', function() {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  common.connectApigee(org => {
    const devs = org.developers;
    const firstName = faker.name.firstName(); // Rowan
    const lastName = faker.name.lastName(); // Nikolaus
    var options = {
          developerEmail : lastName + '.' + firstName + "@apigee-js-test.org",
          lastName : lastName,
          firstName : firstName,
          userName : firstName + lastName,
          attributes: { uuid: faker.random.uuid() }
        };

    describe('create', function() {

      it('should create a developer', () => devs.create(options));

      it('should fail to create a developer', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.developerEmail;
        devs.create(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
    });

    describe('get', function() {

      it('should get a list of developers', () =>
         devs.get({})
         .then ( result => {
           assert.notExists(result.error);
           assert.exists(result.length);
           assert.isAtLeast(result.length, 1);
         })
        );

      it('should get a few specific developers', () =>
        devs.get({})
          .then ( developers => {
            assert.notExists(developers.error);
            assert.exists(developers.length);
            assert.isAtLeast(developers.length, 1);
            let L = developers.length;
            if (L>6) {
              developers = developers.slice(0, 6);
              L = developers.length;
            }
            const reducer = (p, developerEmail) =>
              p.then( a =>
                      devs.get({developerEmail})
                      .then( result => {
                        assert.isFalse( !!result.error, "unexpected error");
                        assert.equal(result.email, developerEmail, 'email');
                      })
                      .catch( e => {
                        console.log(util.format(e));
                        assert.fail('should not be reached');
                      }));

            return developers
              .reduce(reducer, Promise.resolve([]));
          }));


      it('should fail to get a non-existent developer', () => {
        const developerEmail = faker.random.alphaNumeric(22);
        return devs.get({developerEmail})
          .then((res) => {
            assert.fail('should not be reached');
          })
          .catch(error => {
            assert.equal(error.result.code,"developer.service.DeveloperIdDoesNotExist");
            assert.equal(error.result.message, `DeveloperId ${developerEmail} does not exist in organization ${org.conn.orgname}`);

          });
      });

    });


    describe('delete', function() {

      it('should delete a developer', () =>
         devs.del({developerEmail:options.developerEmail})
             .catch( e => {
               console.log('error deleting: ' + util.format(e));
               throw e;
             }));


      it('should fail to delete a developer because no email was specified', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.developerEmail;
        devs.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete a non-existent developer', function(done) {
        let badOptions = Object.assign({}, options);
        badOptions.developerEmail = faker.random.alphaNumeric(22) + "@apigee-js-test.org";
        devs.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
