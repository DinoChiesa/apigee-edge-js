// reference.js
// ------------------------------------------------------------------
//
// Tests for Reference operations.
//
// Copyright 2017-2020 Google LLC
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
// last saved: <2022-December-20 17:24:49>

/* global describe, faker, it, before, after */

const common = require('./common'),
      util = require('util');

describe('Reference', function() {
  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  common.connectApigee(function(org) {
    const refs = org.references,
          num = faker.random.number(),
          word = faker.lorem.word(),
          refnames = [0, 1, 2].map( n => `apigee-edge-js-test-REF-${word}-${num}-${n}`),
          ksnames = [0, 1, 2].map( n =>
                                `apigee-edge-js-test-KEYSTORE-${word}-${num}-${n}`);
    let envlist = [];

    before(function(done) {
      org.environments.get((e, result) => {
        assert.isNull(e, "error listing: " + util.format(e));
        envlist = result;
        let numDone = 0;
        envlist.forEach(env => {
          let options = { environment : env };
          ksnames.slice(0, 2).forEach( (ksname, ix) => {
            options.name = ksname;
            org.keystores.create(options, (e, result) => {
              assert.isNull(e, "error creating: " + util.format(e));
                numDone++;
                if (numDone == envlist.length) {
                  done();
                }
            });
          });
        });
      });
    });

    after( (done) => {
      let numDone = 0;
      envlist.forEach(env => {
        let options = { environment : env };
        ksnames.slice(0, 2).forEach( (ksname, ix) => {
          options.name = ksname;
          //console.log('deleting keystore:%s from env:%s', ksname, env);
          org.keystores.del(options, (e, result) => {
            assert.isNull(e, "error deleting keystore:" +ksname + ' from env:' +env + ': ' + util.format(e));
            //console.log('deleted keystore:%s from env:%s', ksname, env);
            if (ix == 1) { // delete only 2 of the 3
              numDone++;
              if (numDone == envlist.length) {
                done();
              }
            }
          });
        });
      });
    });


    describe('create', function() {
      it('should create a reference', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : refnames[0],
                  refers : ksnames[0],
                  environment : e
                };
          refs.create(options, function(e, result){
            assert.isNull(e, "error creating: " + util.format(e));
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should fail to create a reference, neither refers nor env', function(done) {
        let badOptions = { name : `apigee-edge-js-test-BAD-${word}-${num}` };
        refs.create(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to create a reference, no refers', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : `apigee-edge-js-test-BAD-${word}-${num}`,
                  environment : e
                };
          refs.create(options, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should fail to create a reference, no env', function(done) {
        const options = {
                name : `apigee-edge-js-test-BAD-${word}-${num}`,
                refers : ksnames[0]
              };
        refs.create(options, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to create a reference (keystore DNE)', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : refnames[0],
                  refers : ksnames[2], // does not exist
                  environment : e
                };
          refs.create(options, function(e, result){
            assert.isNotNull(e, "expected an error in create()");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

    });


    describe('get', function() {

      it('should get a list of references', (done) => {
        let numDone = 0;
        envlist.forEach( environment => {
          refs.get({environment})
            .then( result => {
              numDone++;
              if (numDone == envlist.length) {
                done();
              }
            })
            .catch( e => assert.fail('unexpected error'));
        });
      });

      it('should fail to get a list of references (no env)', () =>
         refs.get({})
         .then( result => assert.fail('unexpected success'))
         .catch( e => true )
        );

      it('should get a specific reference', (done) => {
        let numDone = 0;
        envlist.forEach( e => {
          const options = { name : refnames[0], environment : e };
          refs.get(options)
            .then(result => {
              assert.isNotNull(result.name, "name is missing");
              numDone++;
              if (numDone == envlist.length) {
                done();
              }
            });
        });
      });

      it('should fail to get a specific non-existing reference', function(done) {
        let numDone = 0;

        envlist.forEach( e => {
          const options = {
                  name : `apigee-edge-js-test-REF-NOTEXIST-${word}-${num}`,
                  environment : e
                };
          refs.get(options)
            .then(result => {
              assert.fail("should not be reached");
            })
            .catch(e => {
              if (config.apigeex) {
                assert.equal(e.result.error.code,404);
              }
              else {
                assert.equal(e.result.code,"messaging.config.beans.ResourceReferenceDoesNotExist");
              }
              numDone++;
              if (numDone == envlist.length) {
                done();
              }
            });
        });
      });
    });

    describe('update', function() {
      it('should update a reference', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : refnames[0],
                  environment : e,
                  refers: ksnames[1]
                };
          refs.update(options, function(e, result){
            assert.isNull(e, "error updating: " + util.format(e));
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should fail to update a reference (no env)', function(done) {
        const options = {
                name : refnames[0],
                refers: ksnames[1]
              };
        refs.update(options, function(e, result){
          assert.isNotNull(e, "expected error");
          done();
        });
      });

      it('should fail to update a reference (no refers)', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : refnames[0],
                  environment : e
                };
          refs.update(options, function(e, result) {
            assert.isNotNull(e, "expected error did not occur");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should fail to update a reference (keystore DNE)', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : refnames[0],
                  environment : e,
                  refers: ksnames[2] // DNE
                };
          refs.update(options)
            .then(e => assert.fail('should not be reached'))
            .catch(e => {
              //let util = require('util');
              assert.isNotNull(e, "expected error in update()");
              if (config.apigeex) {
                //console.log(e.result);
                assert.equal(e.result.error.code, 400);
              }
              else {
                assert.equal(e.result.code, "messaging.config.beans.InvalidKeyStoreReference");
              }
              numDone++;
              if (numDone == envlist.length) {
                done();
              }
            })
            .catch(e => done());
        });
      });

      it('should fail to update a reference (no name)', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  environment : e,
                  refers: ksnames[1]
                };
          refs.update(options, function(e, result) {
            assert.isNotNull(e, "expected error did not occur");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should fail to update a non-existing reference', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : `apigee-edge-js-test-NOTEXIST-${word}-${num}`,
                  environment : e,
                  refers: ksnames[1]
                };
          refs.update(options, function(e, result){
            assert.isNotNull(e, "expected error in update()");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

    });

    describe('createOrUpdate', function() {

      it('should createOrUpdate an existing reference', (done) => {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : refnames[0],
                  environment : e,
                  refers: ksnames[0] // back to the original value
                };
          refs.createOrUpdate(options, function(e, result){
            assert.isNull(e, "error in createOrUpdate: " + util.format(e));
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should createOrUpdate a non-existing reference', (done) => {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : refnames[1],
                  environment : e,
                  refers: ksnames[1]
                };
          refs.createOrUpdate(options, function(e, result){
            assert.isNull(e, "error in createOrUpdate: " + util.format(e));
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should fail to createOrUpdate a reference (keystore DNE)', (done) => {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name : refnames[1],
                  environment : e,
                  refers: ksnames[2] // DNE
                };
          refs.createOrUpdate(options, function(e, result){
            assert.isNotNull(e, "expected error in createOrUpdate");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

    });


    describe('delete', function(done) {

      it('should fail to delete a reference because no env', (done) => {
        const options = { name: refnames[0] };
        refs.del(options, function(e, result) {
          assert.isNotNull(e, "while deleting " + util.format(e));
          done();
        });
      });

      it('should delete a few references in each environment', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          // delete 2 refs in each environment
          [0, 1].forEach( refnum => {
            const options = {
                    name : refnames[refnum],
                    environment : e
                  };
            refs.del(options, function(e, result) {
              assert.isNull(e, "while deleting " + util.format(e));
              if (refnum == 1) {
                numDone++;
                if (numDone == envlist.length) {
                  done();
                }
              }
            });
          });
        });
      });

      it('should fail to delete a reference because no name', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  environment : e
                };
          refs.del(options, function(e, result) {
            assert.isNotNull(e, "expected an while deleting");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should fail to delete a reference because DNE', function(done) {
        let numDone = 0;
        envlist.forEach( e => {
          const options = {
                  name:refnames[2],
                  environment : e
                };
          refs.del(options, function(e, result) {
            assert.isNotNull(e, "expected an while deleting");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

    });

  });


});
