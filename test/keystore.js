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
// last saved: <2019-October-04 13:08:47>

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

  common.connectEdge(function(edgeOrg){

    describe('create', function() {
      var envlist = [];
      before(function(done){
        edgeOrg.environments.get(function(e, result) {
          assert.isNull(e, "error listing: " + util.format(e));
          envlist = result;
          done();
        });
      });

      it('should create a keystore in each environment', function(done) {
        var numDoneEnv = 0;
        envlist.forEach(function(env){
          var options = {
                environment : env,
                name : contrivedNamePrefix + '-ks1'
              };
          edgeOrg.keystores.create(options, function(e, result){
            assert.isNull(e, "error creating: " + util.format(e));
            numDoneEnv++;
            if (numDoneEnv == envlist.length) {
              done();
            }
          });
        });
      });
    });


    describe('get', function() {
      var combinations = [];
      before(function(done){
        edgeOrg.environments.get(function(e, result) {
          assert.isNull(e, "error listing: " + util.format(e));
          var envlist = result;
          var numDone = 0;
          envlist.forEach(function(env){
            edgeOrg.keystores.get({environment:env}, function(e, result) {
              numDone++;
              combinations.push([env, result]);
              if (numDone == envlist.length) {
                done();
              }
            });
          });
        });
      });

      it('should list all keystores for each environment', function(done){
        var numDoneEnv = 0;
        var envlist = combinations.map( x => x[0] );
        envlist.forEach(function(env){
          var options = {
                environment : env
              };
          edgeOrg.keystores.get(options, function(e, result){
            assert.isNull(e, "error listing: " + util.format(e));
            numDoneEnv++;
            if (numDoneEnv == envlist.length) {
              done();
            }
          });
        });
      });

      it('should get details of each keystore', function(done){
        var numDone = 0;
        combinations.forEach(function(combo){
          var env = combo[0], keystores = combo[1];
          var options = {
                environment : env
              };
          var numKeystoresDone = 0;
          keystores.forEach(function(keystore) {
            options.keystore = keystore;
            edgeOrg.keystores.get(options, function(e, result){
              assert.isNull(e, "error querying: " + util.format(e));
              numKeystoresDone++;
              if (numKeystoresDone == keystores.length) {
                numDone++;
                if (numDone == combinations.length) {
                  done();
                }
              }
            });
          });
        });
      });

      it('should fail to get a non-existent keystore', function(done){
        var numDone = 0;
        var envlist = combinations.map( x => x[0] );
        envlist.forEach(function(env){
          var options = {
                environment : env,
                name : 'keystore-' + faker.random.alphaNumeric(23)
              };
          edgeOrg.keystores.get(options, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            numDone++;
            if (numDone == envlist.length) {
              done();
            }
          });
        });
      });

    });


    describe('import cert', function() {
      var certFileList;
      var envlist = [];
      before(function(done){
        var actualPath = path.resolve(resourceDir);
        fs.readdir(actualPath, function(e, items) {
          assert.isNull(e, "error getting cert and key: " + util.format(e));
          var re1 = new RegExp('^.+\.cert$');
          certFileList = items
            .filter(item => item.match(re1) )
            .map(item => path.resolve( path.join(resourceDir, item)) );
          edgeOrg.environments.get(function(e, result) {
            assert.isNull(e, "error listing: " + util.format(e));
            envlist = result;
            done();
          });
        });
      });

      it('should import key and cert into a keystore', function(done){
        this.timeout(65000);
        var numDone = 0;
        let tick = () => { if (++numDone == envlist.length) { done(); } };
        //edgeOrg.conn.verbosity = 1;
        envlist.forEach(function(env){
          var options = {
                environment : env,
                name : contrivedNamePrefix + '-' + faker.random.alphaNumeric(14)
              };
          edgeOrg.keystores.create(options, function(e, result){
            assert.isNull(e, "error creating keystore: " + util.format(e));
            options.certificateFile = certFileList[0];
            options.keyFile = certFileList[0].replace(new RegExp('\\.cert$'), '.key');
            options.alias = 'alias-' + faker.random.alphaNumeric(8);
            edgeOrg.keystores.importCert(options, function(e, result){
              assert.isNull(e, "error importing cert and key: " + util.format(e));
              tick();
            });
          });

        });

      });
    });


    describe('get aliases', function() {
      var combinations = [];
      before(function(done){
        edgeOrg.environments.get(function(e, result) {
          assert.isNull(e, "error listing: " + util.format(e));
          var envlist = result;
          var numDone = 0;
          envlist.forEach(function(env){
            edgeOrg.keystores.get({environment:env}, function(e, result) {
              numDone++;
              combinations.push([env, result]);
              if (numDone == envlist.length) {
                done();
              }
            });
          });
        });
      });

      it('should get aliases for each keystore in each env', function(done) {
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

        combinations.forEach(function(combo){
          var env = combo[0], keystores = combo[1];
          var numDoneKeystores = 0;
          keystores.forEach(function(keystore){
            var options = { environment : env, keystore: keystore };
            edgeOrg.keystores.getAlias(options, function(e, result) {
              assert.isNull(e, "error: " + util.format(e));
              assert.isNotNull(result, "error");
              var numDoneAliases = 0;
              var aliases = result;
              if (aliases.length === 0) {
                numDoneKeystores++;
                checkNext(env, keystore, aliases.length, numDoneKeystores, keystores.length);
              }
              else {
                aliases.forEach(function(alias) {
                  options.alias = alias;
                  edgeOrg.keystores.getAlias(options, function(e, result) {
                    assert.isNull(e, "error: " + util.format(e));
                    assert.isNotNull(result, "error");
                    numDoneAliases++;
                    if (numDoneAliases == aliases.length) {
                      numDoneKeystores++;
                      checkNext(env, keystore, aliases.length, numDoneKeystores, keystores.length);
                    }
                  });
                });
              }
            });
          });
        });
      });

    });



    describe('delete', function() {
      var combinations = [];
      before(function(done){
        edgeOrg.environments.get(function(e, result) {
          assert.isNull(e, "error listing: " + util.format(e));
          var envlist = result;
          var numDone = 0;
          envlist.forEach(function(env){
            edgeOrg.keystores.get({environment:env}, function(e, result) {
              numDone++;
              combinations.push([env, result.filter((name) => name.startsWith(contrivedNameBasePrefix)) ]);
              if (numDone == envlist.length) {
                done();
              }
            });
          });
        });
      });

      it('should delete the temporary keystores', function(done){
        var numDone = 0;
        combinations.forEach(function(combo){
          var env = combo[0], keystores = combo[1];
          var options = {
                environment : env
              };
          var numDoneKeystores = 0;
          keystores.forEach(function(keystore){
            options.keystore = keystore;
            //console.log('  delete: %s/%s', env, keystore);
            edgeOrg.keystores.del(options, function(e, result){
              assert.isNull(e, "error deleting: " + util.format(e));
              numDoneKeystores++;
              if (numDoneKeystores == keystores.length) {
                numDone++;
                if (numDone == combinations.length) {
                  done();
                }
              }
            });
          });
        });
      });

    });

  });

});
