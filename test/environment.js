// environment.js
// ------------------------------------------------------------------
//
// Tests for environment operations.
//
// Copyright 2018-2020 Google LLC.
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

/* global process, path, describe, faker, it, before, after */

const common = require('./common'),
      util = require('util'),
      fs = require('fs');

describe('Environment', function() {
  const resourceDir = "./test/resources",
        dateVal = new Date().valueOf(),
        contrivedNamePrefix = 'apigee-edge-js-test-' + dateVal;

  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  common.connectEdge(function(edgeOrg){
    let environments = [];

    before(done => {
       edgeOrg.environments.get(function(e, result) {
         assert.isNull(e, "error listing: " + JSON.stringify(e));
         environments = result;
         done();
       });
    });

    describe('get', function() {

      it('should get the list of environments', done => {
        edgeOrg.environments.get({}, function(e, result){
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isAtLeast(result.length, 1, "zero results");
          done();
        });
      });

      it('should get details for each env', done => {
       let numDoneEnv = 0;
        environments.forEach(env => {
          edgeOrg.environments.get({environment:env}, (e, result) => {
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.equal(result.name, env );
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it('should fail to get details from a non-existent env', done => {
        edgeOrg.environments.get({environment:faker.random.alphaNumeric(22)}, (e, result) => {
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });




    describe('get vhosts', function() {

      it('should get the vhosts for each environment', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };
        environments.forEach(function(env) {
          edgeOrg.environments.getVhosts({environment:env}, (e, result) => {
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.isAtLeast(result.length, 1, "zero results");
            tick();
          });
        });
      });

      it('should fail to get vhosts from a non-existent env', function(done) {
        edgeOrg.environments.getVhosts({environment:faker.random.alphaNumeric(22)}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should inquire each vhost in each environment', done => {
        let numDone = 0;
        const outerTick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          edgeOrg.environments.getVhosts({env}, (e, vhosts) => {
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.isAtLeast(vhosts.length, 1, "zero results");
            let numDoneVhosts = 0;
            const innerTick = () => { if (++numDoneVhosts == vhosts.length) { outerTick(); } };
            vhosts.forEach( vhost => {
              edgeOrg.environments.getVhost({env,vhost}, (e, result) => {
                assert.isNull(e, "error getting: " + JSON.stringify(e));
                innerTick();
              });
            });
          });
        });
      });

      it('should fail to inquire a non-existent vhost in each environment', done => {
        let numDone = 0;
        const tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(env => {
          let fakeName = faker.random.alphaNumeric(22);
          edgeOrg.environments.getVhost({env, vhost:fakeName}, (e, vhosts) => {
            assert.isNotNull(e, "the expected error did not occur");
            tick();
          });
        });
      });

    });


    describe('create/delete vhosts', function() {
      let selectedEnvironment;
      const keyAlias = 'alias-' + faker.random.alphaNumeric(8);
      const keyStoreName = contrivedNamePrefix + '-' + faker.random.alphaNumeric(10);

      const resolveHome = function(filepath) {
              if (filepath[0] === '~') {
                return path.join(process.env.HOME, filepath.slice(1));
              }
              return filepath;
            };

      // Creation of vhosts works only with a Cert that has been signed by a commercial CA.

      //const certFile = path.resolve( path.join(resourceDir, 'apigee-edge-js-wildcard.cert'));
      const certFile = resolveHome( '~/dev/dinochiesa.net/keys/fullchain.pem');
      //console.log('\n\n** certfile: ' + certFile + '\n');

      before(done => {
        // select one environment
        do {
          let ix = Math.floor(Math.random() * environments.length);
          selectedEnvironment = environments[ix];
        } while (selectedEnvironment == 'portal');
        //console.log(`selectedEnv: ${selectedEnvironment}`);
        let options = {
              environment : selectedEnvironment,
              name : keyStoreName
            };
        edgeOrg.keystores.create(options, (e, result) => {
          assert.isNull(e, "error creating keystore: " + util.format(e));
          options.certificateFile = certFile;
          options.keyFile = certFile.replace(new RegExp('fullchain\\.'), 'privkey.');
          options.alias = keyAlias;
          edgeOrg.keystores.importCert(options, (e, result) => {
            assert.isNull(e, "error importing cert and key: " + util.format(e));
            done();
          });
        });
      });

      after( done => {
        let options = {
              environment : selectedEnvironment,
              name : keyStoreName
            };
        edgeOrg.keystores.del(options, (e, result) => {
          assert.isNull(e, "error deleting: " + util.format(e));
          done();
        });
      });

      it('should create a vhost w/ explicit port', done => {
        const port = 443;
        // must end in www.dinochiesa.net ?
        //const hostalias = faker.lorem.word() + '-' + faker.random.number() + '.apigee-edge-js.net';
        // must be www.dinochiesa.net or dinochiesa.net ?
        const hostalias = 'dinochiesa.net';
        const options = {
                env: selectedEnvironment,
                vhost: contrivedNamePrefix + '-' + faker.random.alphaNumeric(8),
                port,
                aliases : [ hostalias ],
                keyStore : keyStoreName,
                keyAlias
              };
        edgeOrg.environments.createVhost(options, (e, result) => {
          assert.isNull(e, "error creating: " + JSON.stringify(e));
          done();
        });
      });

      it('should create a vhost w/ no port', done => {
        //const hostalias = faker.lorem.word() + '-' + faker.random.number() + '.apigee-edge-js.net';
        const hostalias = 'www.dinochiesa.net';

        const options = {
                env: selectedEnvironment,
                vhost: contrivedNamePrefix + '-' + faker.random.alphaNumeric(8),
                aliases : [ hostalias ],
                keyStore : keyStoreName,
                keyAlias
              };
        edgeOrg.environments.createVhost(options, (e, result) => {
          assert.isNull(e, "error creating: " + JSON.stringify(e));
          done();
        });
      });

      it('should fail to create a vhost with invalid port', done => {
        const minPort = 4000, maxPort = 8000;
        const port = Math.floor(Math.random() * maxPort - minPort) + minPort;
        const vhostName = 'apigee-edge-js-test-' + faker.lorem.word() + '-' + faker.random.number();
        const hostalias = faker.lorem.word() + '-' + faker.random.number() + '.apigee-edge-js.net';
        const options = {
                env: selectedEnvironment,
                vhost: vhostName,
                port,
                aliases : [ hostalias ],
                keyStore : keyStoreName,
                keyAlias
              };
        edgeOrg.environments.createVhost(options)
          .then(r => assert.fail("expected an error while creating"))
          .catch(e => {
            assert.isNotNull(e, "expected an error while creating");
            done();
          });
      });


      it('should delete previously created vhosts', () => {
        let env = selectedEnvironment;
        let fn = (p, vhost) =>
          p.then( (count) =>
                  edgeOrg.environments
                  .deleteVhost({vhost, env})
                  .then( () => count+1 )
                );
        return edgeOrg.environments.getVhosts({env})
          .then( vhosts =>
                 vhosts
                 .filter(item => item.match(new RegExp('^apigee-edge-js-test-.*')) )
                 .reduce(fn, Promise.resolve(0))
                 .then( numDeleted => {
                   if (numDeleted < 2) {
                     assert.fail(`deleted ${numDeleted} vhosts... not enough!`);
                   }
                 }));
      });


    });



  });

});
