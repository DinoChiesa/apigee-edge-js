// environment.js
// ------------------------------------------------------------------
//
// Tests for environment operations.
//
// Copyright 2018-2023 Google LLC.
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

/* global process, path, describe, faker, it, before, after, assert, require */

const common = require("./common"),
  util = require("util");

describe("Environment", function () {
  const resourceDir = "./test/resources",
    dateVal = new Date().valueOf(),
    contrivedNamePrefix = "apigee-edge-js-test-" + dateVal;

  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  common.connectApigee(function (org) {
    let environments = [];

    before((done) => {
      org.environments.get(function (e, result) {
        assert.isNull(e, "error listing: " + JSON.stringify(e));
        environments = result.filter((item) => item != "portal");
        done();
      });
    });

    describe("get", function () {
      it("should get the list of environments", (done) => {
        org.environments.get({}, function (e, result) {
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isAtLeast(result.length, 1, "zero results");
          done();
        });
      });

      it("should get details for each env", (done) => {
        let numDoneEnv = 0;
        environments.forEach((env) => {
          org.environments.get({ environment: env }, (e, result) => {
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.equal(result.name, env);
            numDoneEnv++;
            if (numDoneEnv == environments.length) {
              done();
            }
          });
        });
      });

      it("should fail to get details from a non-existent env", (done) => {
        org.environments.get(
          { environment: faker.random.alphaNumeric(22) },
          (e, result) => {
            assert.isNotNull(e, "the expected error did not occur");
            done();
          }
        );
      });
    });

    describe("get vhosts", function () {
      it("should get the vhosts for each environment", () => {
        let fn = (p, env) =>
          p.then((count) =>
            org.environments
              .getVhosts({ environment: env })
              .then((result) => {
                assert.isAtLeast(result.length, 1, "zero results");
              })
              .then(() => count + 1)
          );
        return environments.reduce(fn, Promise.resolve(0));
      });

      it("should fail to get vhosts from a non-existent env", function (done) {
        org.environments.getVhosts(
          { environment: faker.random.alphaNumeric(22) },
          function (e, result) {
            assert.isNotNull(e, "the expected error did not occur");
            done();
          }
        );
      });

      it("should inquire each vhost in each environment", () => {
        let fn2 = (env) => (p, vhost) =>
          p.then((count) =>
            org.environments.getVhost({ env, vhost }).then(() => count + 1)
          );

        let fn1 = (p, env) =>
          p.then((count) =>
            org.environments
              .getVhosts({ environment: env })
              .then((vhosts) => {
                assert.isAtLeast(vhosts.length, 1, "zero results");
                return vhosts.reduce(fn2(env), Promise.resolve(0));
              })
              .then(() => count + 1)
          );

        return environments.reduce(fn1, Promise.resolve(0));
      });

      it("should fail to inquire a non-existent vhost in each environment", (done) => {
        let numDone = 0;
        const tick = () => {
          if (++numDone == environments.length) {
            done();
          }
        };

        environments.forEach((env) => {
          let fakeName = faker.random.alphaNumeric(22);
          org.environments.getVhost({ env, vhost: fakeName }, (e, vhosts) => {
            assert.isNotNull(e, "the expected error did not occur");
            tick();
          });
        });
      });
    });

    describe("create/delete vhosts", function () {
      let selectedEnvironment;
      const keyAlias = "alias-" + faker.random.alphaNumeric(8);
      const keyStoreName1 =
        contrivedNamePrefix + "-" + faker.random.alphaNumeric(10);
      const keyStoreName2 =
        contrivedNamePrefix + "-" + faker.random.alphaNumeric(10);

      // const resolveHome = function (filepath) {
      //   if (filepath[0] === "~") {
      //     return path.join(process.env.HOME, filepath.slice(1));
      //   }
      //   return filepath;
      // };

      // Creation of vhosts works only with a Cert that has been signed by a commercial CA.

      const certFile1 = path.resolve(
        path.join(resourceDir, "apigee-edge-js-20231212.cert")
      );
      const certFile2 = path.resolve(
        path.join(resourceDir, "apigee-edge-js-wildcard-expired.cert")
      );

      //const certFile = resolveHome( '~/dev/dinochiesa.net/keys/fullchain.pem');
      //console.log('\n\n** certfile: ' + certFile + '\n');

      before(() => {
        // select one environment
        do {
          const ix = Math.floor(Math.random() * environments.length);
          selectedEnvironment = environments[ix];
        } while (selectedEnvironment == "portal");
        //console.log(`selectedEnv: ${selectedEnvironment}`);
        const options = {
          environment: selectedEnvironment,
          name: keyStoreName1
        };
        return org.keystores.create(options).then((_r) => {
          options.certificateFile = certFile1;
          //options.keyFile = certFile.replace(new RegExp('fullchain\\.'), 'privkey.');
          options.keyFile = certFile1.replace(new RegExp("\\.cert"), ".key");
          options.alias = keyAlias;
          return org.keystores.importCert(options).catch((e) => {
            console.log("in before all, error: " + util.format(e));
            throw e;
          });
        });

        // TODO: create keystore with expired cert
      });

      after(() =>
        org.keystores
          .del({
            environment: selectedEnvironment,
            name: keyStoreName1
          })
          .catch((e) => {
            console.log("in after all, error: " + util.format(e));
            throw e;
          })
      );

      it("should create a vhost w/ explicit port", () => {
        const port = 443;
        //const hostalias = faker.lorem.word() + '-' + faker.random.number() + '.apigee-edge-js.net';
        // must be www.dinochiesa.net or dinochiesa.net ?
        const hostalias = "dinochiesa.net";
        const options = {
          env: selectedEnvironment,
          vhost: contrivedNamePrefix + "-" + faker.random.alphaNumeric(8),
          port,
          aliases: [hostalias],
          keyStore: keyStoreName1,
          keyAlias
        };
        return org.environments.createVhost(options).catch((e) => {
          console.log("w/ explicit port, error: " + util.format(e.result));
          throw e;
        });
      });

      it("should create a vhost w/ no port", () => {
        //const hostalias = faker.lorem.word() + '-' + faker.random.number() + '.apigee-edge-js.net';
        const hostalias = "apigee-js-test.dinochiesa.net";
        const options = {
          env: selectedEnvironment,
          vhost: contrivedNamePrefix + "-" + faker.random.alphaNumeric(8),
          aliases: [hostalias],
          keyStore: keyStoreName1,
          keyAlias
        };
        return org.environments.createVhost(options).catch((e) => {
          console.log("w/ no port, error: " + util.format(e.result));
          throw e;
        });
      });

      it("should fail to create a vhost with an expired cert", () => {
        //const hostalias = faker.lorem.word() + '-' + faker.random.number() + '.apigee-edge-js.net';
        const hostalias = "apigee-js-test.dinochiesa.net";
        const options = {
          env: selectedEnvironment,
          vhost: contrivedNamePrefix + "-" + faker.random.alphaNumeric(8),
          aliases: [hostalias],
          keyStore: keyStoreName2,
          keyAlias
        };
        return org.environments.createVhost(options).catch((e) => {
          console.log("w/ no port, error: " + util.format(e.result));
          throw e;
        });
      });

      it("should fail to create a vhost with invalid port", async () => {
        const minPort = 4000,
          maxPort = 8000;
        const port = Math.floor(Math.random() * maxPort - minPort) + minPort;
        const vhostName =
          "apigee-edge-js-test-" +
          faker.lorem.word() +
          "-" +
          faker.random.number();
        const hostalias =
          faker.lorem.word() +
          "-" +
          faker.random.number() +
          ".apigee-edge-js.net";
        const options = {
          env: selectedEnvironment,
          vhost: vhostName,
          port,
          aliases: [hostalias],
          keyStore: keyStoreName1,
          keyAlias
        };
        try {
          await org.environments.createVhost(options);
        } catch (e) {
          assert.isNotNull(e, "expected an error while creating");
          return;
        }
        assert.isOk(false, "createVhost must throw");
      });

      it("should delete previously created vhosts", () => {
        let env = selectedEnvironment;
        let fn = (p, vhost) =>
          p.then((count) =>
            org.environments.deleteVhost({ vhost, env }).then(() => count + 1)
          );
        return org.environments.getVhosts({ env }).then((vhosts) =>
          vhosts
            .filter((item) => item.match(new RegExp("^apigee-edge-js-test-.*")))
            .reduce(fn, Promise.resolve(0))
            .then((numDeleted) => {
              if (numDeleted < 2) {
                assert.fail(`deleted ${numDeleted} vhosts... not enough!`);
              }
            })
        );
      });
    });
  });
});
