// keystore.js
// ------------------------------------------------------------------
//
// Tests for API Proxy operations.
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
// last saved: <2021-March-22 18:55:22>

/* global path, faker, describe, it, before, after */

const common = require('./common'),
      util = require('util'),
      fs = require('fs');

describe('Keystore', function() {
  const resourceDir = "./test/resources",
        dateVal = new Date().valueOf(),
        contrivedNameBasePrefix = 'apigee-edge-js-test-',
        contrivedNamePrefix = contrivedNameBasePrefix + dateVal;

  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  common.connectApigee(org => {

    let envlist = [];
      before(done => {
        org.environments.get((e, result) => {
          assert.isNull(e, "error listing: " + util.format(e));
          envlist = result.filter(item => item != "portal");
          done();
        });
      });

    describe('create', () => {

      it('should create a keystore in each environment', done => {
        var numDoneEnv = 0;
        envlist.forEach(function(env){
          const options = {
                environment : env,
                name : contrivedNamePrefix + '-ks1'
              };
          org.keystores.create(options, (e, result) => {
            assert.isNull(e, "error creating: " + util.format(e));
            numDoneEnv++;
            if (numDoneEnv == envlist.length) {
              done();
            }
          });
        });
      });

      it('should fail create a keystore in each environment (duplicate)', done => {
        var numDoneEnv = 0;
        envlist.forEach(env => {
          const options = {
                environment : env,
                name : contrivedNamePrefix + '-ks1'
              };
          org.keystores.create(options, (e, result) => {
            assert.isNotNull(e, "error creating: " + util.format(e));
            numDoneEnv++;
            if (numDoneEnv == envlist.length) {
              done();
            }
          });
        });
      });

    });


    describe('get', () => {
      let combinations = {};
      before(done => {
        let numDone = 0;
        envlist.forEach(env => {
          org.keystores.get({environment:env}, (e, result) => {
            numDone++;
            combinations[env] = result;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should list all keystores for each environment', done => {
        let numDoneEnv = 0;
        envlist.forEach(environment => {
          org.keystores.get({ environment }, (e, result) => {
            assert.isNull(e, "error listing: " + util.format(e));
            assert.isTrue(result.length > 0);
            numDoneEnv++;
            if (numDoneEnv == envlist.length) {
              done();
            }
          });
        });
      });

      it('should get details of each keystore', done => {
        let numDone = 0;
        //console.log('combos: ' + JSON.stringify(combinations, null, 2));
        let keys = Object.keys(combinations);
        keys.forEach(environment => {
          const options = { environment },
                keystores = combinations[environment];
          let numKeystoresDone = 0;
          keystores.forEach(keystore => {
            options.keystore = keystore;
            org.keystores.get(options, (e, result) => {
              assert.isNull(e, "error querying: " + util.format(e));
              numKeystoresDone++;
              if (numKeystoresDone == keystores.length) {
                numDone++;
                if (numDone == keys.length) {
                  done();
                }
              }
            });
          });
        });
      });

      it('should fail to get a non-existent keystore', function(done){
        var numDone = 0;
        envlist.forEach(function(env){
          const options = {
                environment : env,
                name : 'keystore-' + faker.random.alphaNumeric(23)
              };
          org.keystores.get(options, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

    });


    describe('import cert', () => {
      var certFileList;
      var envlist = [];
      before(done => {
        var actualPath = path.resolve(resourceDir);
        fs.readdir(actualPath, (e, items) => {
          assert.isNull(e, "error getting cert and key: " + util.format(e));
          var re1 = new RegExp('^.+\.cert$');
          certFileList = items
            .filter(item => item.match(re1) )
            .map(item => path.resolve( path.join(resourceDir, item)) );
          org.environments.get((e, result) => {
            assert.isNull(e, "error listing: " + util.format(e));
            envlist = result;
            done();
          });
        });
      });

      it('should import key and cert into a keystore', done => {
        this.timeout(65000);
        var numDone = 0;
        let tick = () => { if (++numDone == envlist.length) { done(); } };
        //org.conn.verbosity = 1;
        envlist.forEach(environment => {
          var options = {
                environment,
                name : contrivedNamePrefix + '-' + faker.random.alphaNumeric(14)
              };
          org.keystores.create(options, (e, result) => {
            assert.isNull(e, "error creating keystore: " + util.format(e));
            options.certificateFile = certFileList[0];
            options.keyFile = certFileList[0].replace(new RegExp('\\.cert$'), '.key');
            options.alias = 'alias-' + faker.random.alphaNumeric(8);
            org.keystores.importCert(options, (e, result) => {
              assert.isNull(e, "error importing cert and key: " + util.format(e));
              tick();
            });
          });
        });
      });

      it('should fail to import key + cert (no name)', done => {
        this.timeout(65000);
        var numDone = 0;
        const tick = () => { if (++numDone == envlist.length) { done(); } };
        //org.conn.verbosity = 1;
        envlist.forEach(environment =>{
          var options = {
                environment,
                name : contrivedNamePrefix + '-' + faker.random.alphaNumeric(14)
              };
          org.keystores.create(options, (e, result) => {
            assert.isNull(e, "error creating keystore: " + util.format(e));
            options.certificateFile = certFileList[0];
            options.keyFile = certFileList[0].replace(new RegExp('\\.cert$'), '.key');
            options.alias = 'alias-' + faker.random.alphaNumeric(8);
            delete options.name;
            org.keystores.importCert(options)
              .then(r => assert.fail('should not be reached'))
              .catch(e => {
                assert.isNotNull(e, "expected an error");
                tick();
              });
          });
        });
      });

      it('should fail to import key + cert (no cert)', done => {
        this.timeout(65000);
        var numDone = 0;
        const tick = () => { if (++numDone == envlist.length) { done(); } };
        //org.conn.verbosity = 1;
        envlist.forEach(environment => {
          var options = {
                environment,
                name : contrivedNamePrefix + '-' + faker.random.alphaNumeric(14)
              };
          org.keystores.create(options, (e, result) => {
            assert.isNull(e, "error creating keystore: " + util.format(e));
            //options.certificateFile = certFileList[0];
            options.keyFile = certFileList[0].replace(new RegExp('\\.cert$'), '.key');
            options.alias = 'alias-' + faker.random.alphaNumeric(8);
            org.keystores.importCert(options)
              .then(r => assert.fail('should not be reached'))
              .catch(e => {
                assert.isNotNull(e, "expected an error");
                tick();
              });
          });
        });
      });


    });


    describe('get aliases', () => {
      var combinations = [];
      before(done => {
        var numDone = 0;
        envlist.forEach(environment => {
          org.keystores.get({environment}, (e, result) => {
            numDone++;
            combinations.push([environment, result]);
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should get aliases for each keystore in each env', done => {
        this.timeout(65000);
        var numDoneCombo = 0;

        function checkNext(env, keystore, L1, numDoneKeystores, L2) {
          //console.log('    env %s keystore %s, %d aliases. (%d/%d)', env, keystore, L1, numDoneKeystores, L2);
          if (numDoneKeystores == L2) {
            numDoneCombo++;
            //console.log('  done combos: %d/%d', numDoneCombo, combinations.length);
            if (numDoneCombo == combinations.length) {
              done();
            }
          }
        }

        combinations.forEach( combo => {
          const environment = combo[0], keystores = combo[1];
          var numDoneKeystores = 0;
          keystores.forEach(keystore => {
            var options = { environment, keystore };
            org.keystores.getAlias(options, (e, result) => {
              assert.isNull(e, "error: " + util.format(e));
              assert.isNotNull(result, "error");
              var numDoneAliases = 0;
              var aliases = result;
              if (aliases.length === 0) {
                numDoneKeystores++;
                checkNext(environment, keystore, aliases.length, numDoneKeystores, keystores.length);
              }
              else {
                aliases.forEach(alias => {
                  options.alias = alias;
                  org.keystores.getAlias(options, (e, result) => {
                    assert.isNull(e, "error: " + util.format(e));
                    assert.isNotNull(result, "error");
                    numDoneAliases++;
                    if (numDoneAliases == aliases.length) {
                      numDoneKeystores++;
                      checkNext(environment, keystore, aliases.length, numDoneKeystores, keystores.length);
                    }
                  });
                });
              }
            });
          });
        });
      });

    });


    describe('delete', () => {
      let combinations = {};
      before( done => {
        let numDone = 0;
        envlist.forEach(environment => {
          org.keystores.get({environment}, (e, result) => {
            numDone++;
            if ( ! e) {
              combinations[environment] = result.filter(name => name.startsWith(contrivedNameBasePrefix));
            }
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

      it('should delete the temporary keystores', done => {
        let numDone = 0;

        //console.log('deleting: ' + JSON.stringify(combinations, null, 2));
        let keys = Object.keys(combinations);
        keys.forEach(environment => {
          const options = { environment },
                keystores = combinations[environment];
          let numDoneKeystores = 0;
          keystores.forEach(keystore => {
            options.keystore = keystore;
            //console.log('  delete: %s/%s', env, keystore);
            org.keystores.del(options, (e, result) => {
              assert.isNull(e, "error deleting: " + util.format(e));
              numDoneKeystores++;
              if (numDoneKeystores == keystores.length) {
                numDone++;
                if (numDone == keys.length) {
                  done();
                }
              }
            });
          });
        });
      });

      it('should fail to delete non-existent keystores', done => {
        let numDone = 0;
        envlist.forEach(env => {
          const options = {
                environment : env,
                name : 'non-existent-keystore-' + faker.random.alphaNumeric(23)
              };
          org.keystores.del(options)
            .then(r => assert.fail('expected an error'))
            .catch(e => {
              assert.isNotNull(e, "the expected error did not occur");
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
