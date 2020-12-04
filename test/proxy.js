// proxy.js
// ------------------------------------------------------------------
//
// Tests for API Proxy operations.
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
// last saved: <2020-December-04 09:10:18>
/* jshint esversion: 9 */
/* global describe, faker, it, path, before */

const selectRandomValue = (a) => {
        var L1 = a.length, n = Math.floor(Math.random() * L1);
        return a[n];
      };

const util = require('util');

describe('Proxy', function() {
  const common = require('./common'),
        fs = require('fs'),
        resourceDir = "./test/resources/proxybundles",
        dateVal = new Date().valueOf(),
        namePrefix = 'apigee-edge-js-test-' + dateVal,
        oneOfOurs = (proxyname) =>
            (proxyname.startsWith(namePrefix +'-fromzip-') ||
             proxyname.startsWith(namePrefix +'-fromdir-'));

  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  common.connectEdge(function(edgeOrg){
    let environments = [];
    before(() =>
      edgeOrg.environments.get()
           .then( result => environments = result.filter(e => e != 'portal') ));

    describe('import-from-zip', function() {
      this.timeout(65000);
      var zipFileList;

      before(function(done){
        var actualPath = path.resolve(resourceDir);
        fs.readdir(actualPath, function(e, items) {
          assert.isNull(e, "error getting zips: " + JSON.stringify(e));
          let re1 = new RegExp('^apiproxy-.+\.zip$');
          zipFileList = items
            .filter(item => item.match(re1) )
            .map(item => path.resolve( path.join(resourceDir, item)) );
          done();
        });
      });

      it('should import proxy zips into an org', () => {
        var numDone = 0;
        let fn = (p, zip) =>
          p.then( () => edgeOrg.proxies.importFromZip({name: namePrefix + '-fromzip-' + faker.random.alphaNumeric(12), zipArchive:zip}) );
        return zipFileList
          .reduce(fn, Promise.resolve());
      });

      it('should import proxy zips via the simple method', () => {
        let fn = (p, zip) =>
          p.then( () => edgeOrg.proxies.import({name: namePrefix + '-fromzip-' + faker.random.alphaNumeric(12), source:zip}));

        return zipFileList.reduce(fn, Promise.resolve());
      });

    });


    describe('import-from-dir', function() {
      var apiproxyBundleDirList;
      this.timeout(65000);

      before(function(done){
        var actualPath = path.resolve(resourceDir);
        fs.readdir(actualPath, function(e, items) {
          assert.isNull(e, "error getting dirs: " + JSON.stringify(e));
          var re2 = new RegExp('^(?!.*\.zip$)apiproxy-.+$');
          apiproxyBundleDirList = items
            .filter(item => item.match(re2) )
            .map(item => path.resolve( path.join(resourceDir, item)) );

          done();
        });
      });

      it('should import exploded proxy dirs into an org', () => {
        this.timeout(65000);
        let fn = (p, dir) =>
          p.then( () =>
                  edgeOrg.proxies.importFromDir({name:namePrefix + '-fromdir-' + faker.random.alphaNumeric(12), source:dir}));

        return apiproxyBundleDirList.reduce(fn, Promise.resolve());
      });

      it('should import exploded proxy dirs via the simple method', () => {
        let fn = (p, dir) =>
          p.then( () =>
                  edgeOrg.proxies.import({name:namePrefix + '-fromdir-' + faker.random.alphaNumeric(12), source:dir}));

        return apiproxyBundleDirList.reduce(fn, Promise.resolve());
      });


    });

    describe('get', function() {
      let proxyList;
      before(done => {
        edgeOrg.proxies.get({}, function(e, result){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(result.length, 1, "length of proxy list");
          proxyList = result;
          done();
        });
      });

      it('should list all proxies for an org', function(done){
        edgeOrg.proxies.get({}, function(e, result){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(result.length, 1, "length of proxy list");
          done();
        });
      });

      it('should get a few proxies', function(done){
        assert.isAbove(proxyList && proxyList.length, 0);
        let fn = (item, ix, list) =>
          edgeOrg.proxies.get({name:item}) /* = proxyList[ix] */
          .then( (result) => assert.equal(result.name, item));
        common.selectNRandom(proxyList, 6, fn, done);
      });

      it('should export a few proxies', function(done){
        assert.isAbove(proxyList && proxyList.length, 0);
        let fn = (item, ix, list) =>
          edgeOrg.proxies.export({name:item}) /* proxyList[ix] */
          .then( (result) => assert.isTrue(result.filename.startsWith('apiproxy-'), "file name") );

        common.selectNRandom(proxyList, 4, fn, done);
      });

      it('should fail to get a non-existent proxy', function(done){
        var fakeName = 'proxy-' + faker.random.alphaNumeric(23);
        edgeOrg.proxies.get({name:fakeName}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should get the revisions for a few proxies', function(done) {
        assert.isAbove(proxyList && proxyList.length, 0);
        function fn(item, ix, list) {
          return edgeOrg.proxies.getRevisions({name:item})
            .then( result => {
              assert.isTrue(Array.isArray(result), "revisions");
              assert.isAbove(result.length, 0, "revisions");
            });
        }
        common.selectNRandom(proxyList, 7, fn, done);
      });

      it('should get the policies for revisions of a few proxies', function(done) {
        assert.isAbove(proxyList && proxyList.length, 0);
        function fn(item) {
          return edgeOrg.proxies.getRevisions({name:item})
            .then( (revisions) => {
              let revision = revisions[Math.floor(Math.random() * revisions.length)];
              return edgeOrg.proxies.getPoliciesForRevision({name:item, revision})
                .then( (policies) => assert.isTrue(Array.isArray(policies), "revisions") );
            });
        }
        common.selectNRandom(proxyList, 7, fn, done);
      });

      it('should get the proxy endpoints for revisions of a few proxies', function(done) {
        assert.isAbove(proxyList && proxyList.length, 0);
        function fn(item) {
          return edgeOrg.proxies.getRevisions({name:item})
            .then( (revisions) => {
              let revision = revisions[Math.floor(Math.random() * revisions.length)];
              return edgeOrg.proxies.getProxyEndpoints({name:item, revision})
                .then( (policies) => assert.isTrue(Array.isArray(policies), "revisions") );
            });
        }
        common.selectNRandom(proxyList, 7, fn, done);
      });
      });

    describe('getDeployments', () => {
      let proxyList;
      before(done => {
        edgeOrg.proxies.get({}, function(e, result){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(result.length, 1, "length of proxy list");
          proxyList = result;
          done();
        });
      });

      it('should get the deployments for a few proxies', function(done) {
        assert.isAbove(proxyList && proxyList.length, 0);
        let fn = (item, ix, list) =>
          edgeOrg.proxies.getDeployments({name:item})
        // .then( (result) => {
        //   console.log(JSON.stringify(result));
        //   return result;
        // })
          .then( ($) => {
            assert.isTrue(Array.isArray($.environment), "environments");
            assert.equal(item, $.name, "proxy name");
          });
        common.selectNRandom(proxyList, 8, fn, done);
      });

      it('should get the deployments for a few proxies in various environments', done => {
        assert.isAbove(proxyList && proxyList.length, 0);

        let fn = (name, ix, list) => {
              const reducer = (p, env) =>
            p.then( a => edgeOrg.proxies.getDeployments({name, env})
                    .then( $ => {
                      if ($.environment) {
                        assert.isFalse(Array.isArray($.environment), "environment");
                        assert.isTrue(Array.isArray($.revision), "revision");
                      }
                      else {
                        assert.equal($.code, 'distribution.ApplicationNotDeployed');
                        assert.isOk($.message);
                      }
                    })
                    .catch( e => {
                      console.log(util.format(e));
                      assert.fail('should not be reached');
                      done();
                    } ));

              return environments.reduce(reducer, Promise.resolve([]));
            };
        common.selectNRandom(proxyList, 8, fn, done);
      });

      it('should get the deployments for specific revisions of a few proxies', function(done) {
        assert.isAbove(proxyList && proxyList.length, 0);
        let fn = (item) => {
              return edgeOrg.proxies.getRevisions({name:item})
            .then( revisions => {
              let revision = revisions[Math.floor(Math.random() * revisions.length)];
              return edgeOrg.proxies.getDeployments({name:item, revision})
              // .then( (result) => {
              //   console.log(JSON.stringify(result));
              //   return result;
              // })
                .then( $ => {
                  assert.isTrue(Array.isArray($.environment), "deployments");
                  assert.equal(item, $.aPIProxy, "proxy name");
                  assert.equal(revision, $.name, "revision");
                });
            });
            };
        common.selectNRandom(proxyList, 7, fn, done);
      });

    });

    describe('deploy', function() {
      this.timeout(45000);

      it('should deploy one test proxy previously imported into this org', () => {
        let p = edgeOrg.proxies.get({})
          .then( proxies => {
            proxies = proxies.filter(oneOfOurs);
            if (proxies.length<1) { return Promise.resolve({}); }
            let selectedProxy = selectRandomValue(proxies); // none are currently deployed
            let selectedEnv = selectRandomValue(environments);
            return edgeOrg.proxies.deploy({name:selectedProxy, environment:selectedEnv});
          });
        return assert.isFulfilled(p, "failed to deploy");
      });

      it('should fail to deploy a non-existent proxy', () => {
        let fakeProxyName = 'a' + faker.random.alphaNumeric(18);
        let selectedEnv = selectRandomValue(environments);
        edgeOrg.proxies.deploy({name:fakeProxyName, environment: selectedEnv})
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.exists(error);
            assert.exists(error.stack);
            assert.equal(error.message, 'bad status: 404');
          });
        return undefined;
      });

      it('should fail to deploy a proxy to a non-existent environment', () => {
        edgeOrg.proxies.get({})
          .then( proxies => {
            proxies = proxies.filter(oneOfOurs);
            if (proxies.length<1) { return Promise.resolve({}); }
            let fakeEnvironment = 'a' + faker.random.alphaNumeric(8);
            let selectedProxy = selectRandomValue(proxies); // none are currently deployed
            return edgeOrg.proxies.deploy({name:selectedProxy, environment: fakeEnvironment});
          })
          .then( () => assert.fail('should not be reached'))
          .catch( error => {
            assert.exists(error);
            assert.exists(error.stack);
            assert.equal(error.message, 'bad status: 404');
          });
        return undefined;
      });

    });

    describe('undeploy', function() {
      let theChosenProxy = null, theDeployedEnvironment = null, aNonDeployedProxy = null;
      this.timeout(45000);

      before(done => {
        edgeOrg.proxies.get({})
          .then( proxies => {
            proxies = proxies.filter(oneOfOurs);

            if (proxies.length<1) { return done(); }

            const reducer = (p, name) =>
              p.then( a => edgeOrg.proxies.getDeployments({name})
                      .then( $ => {
                        assert.isTrue(Array.isArray($.environment), "environments");
                        if ($.environment.length > 0) {
                          // this is one that was previously deployed
                          theChosenProxy = name;
                          theDeployedEnvironment = $.environment[0].name;
                        }
                        else {
                          aNonDeployedProxy = name;
                        }
                      })
                      .catch( e => {
                        console.log(util.format(e));
                        assert.fail('should not be reached');
                        done();
                      } ));

            return proxies
              .reduce(reducer, Promise.resolve([]))
              .then(done);
          });
      });

      it('should fail to undeploy a proxy from a non-existent environment', () => {
        let fakeEnvironment = 'a' + faker.random.alphaNumeric(8);
        edgeOrg.proxies.undeploy({name:theChosenProxy, environment: fakeEnvironment})
          .then( wut => {
            //console.log('wut: ' + util.format(wut));
            assert.isTrue(!wut || Object.keys(wut).length == 0);
          })
          .catch( error => {
            //console.log('error: ' + util.format(error));
            assert.equal(error.message, 'bad status: 404');
          });
        return undefined;
      });

      it('should fail to undeploy a proxy from an env to which it is not deployed', function(done) {
        const selector = (src) => src[ ~~(Math.random() * src.length) ];
        let selectedEnvironment = selector( environments.filter( x => x != theDeployedEnvironment));
        edgeOrg.proxies.undeploy({name:theChosenProxy, environment: selectedEnvironment})
          .then( r => assert.isTrue(false, 'undeployment succeeded unexpectedly'))
          .catch( reason => assert.isNotNull(reason) )
          .finally(done);
      });

      it('should undeploy the one test proxy previously deployed', function(done) {
        edgeOrg.proxies.undeploy({name:theChosenProxy, environment: theDeployedEnvironment})
          .then( r => assert.isNotNull(r, 'undeployment response is empty') )
          .catch( e => assert.isNotNull(e) )
          .finally(() => setTimeout(done, 1400));
      });

      it('should fail to undeploy a test proxy that is not currently deployed', function(done) {
        edgeOrg.proxies.undeploy({name:aNonDeployedProxy, environment: theDeployedEnvironment})
          .then( r => assert.isTrue(false, 'undeployment unexpectedly succeeded') )
          .catch( e => assert.isNotNull(e) )
          .finally(done);
      });

      it('should fail to undeploy a test proxy that is already undeployed', function(done) {
        edgeOrg.proxies.undeploy({name:theChosenProxy, environment: theDeployedEnvironment})
          .then( r => assert.isTrue(false, 'undeployment unexpectedly succeeded') )
          .catch( e => assert.isNotNull(e) )
          .finally( () => setTimeout(done, 1400));
      });

    });


    describe('delete', function() {
      this.timeout(45000);

      it('should delete test proxies previously imported into this org', done => {

        edgeOrg.proxies.get({}, function(e, proxies){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          proxies = proxies.filter(oneOfOurs);
          if (proxies.length<1) { return done(); }
          const reducer = (p, name) =>
            p.then( a => edgeOrg.proxies.del({name})
                    .then(() => null)
                    .catch( e => {
                      console.log(util.format(e));
                      assert.fail('should not be reached');
                    }));
          return proxies
              .reduce(reducer, Promise.resolve([]))
              .then(done);
        });
      });

      it('should fail to delete non-existent proxies', done => {
        this.timeout(25000);
        let shouldNotBeReached = () => assert.fail('should not be reached') ;
        let shouldHaveReason = reason => assert.isNotNull( reason );

        const reducer = (p, fakeName) =>
          p.then( a => edgeOrg.proxies.del({name:fakeName})
                  .then( shouldNotBeReached )
                  .catch( shouldHaveReason ));

        Array.from({length: 3}, (x, i) => 'a' + faker.random.alphaNumeric(22))
          .reduce(reducer, Promise.resolve([]))
          .then(done);
      });

      it('should fail to delete when not spec ifying a name', function(done) {
        edgeOrg.proxies.del({})
          .then( (r) => assert.isTrue(false))  // should always throw
          .catch( (e) => assert.isNotNull(e, "expected error did not occur") )
          .finally( done );
      });


    });


  });


});
