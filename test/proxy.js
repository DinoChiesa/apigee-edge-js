// proxy.js
// ------------------------------------------------------------------
//
// Tests for API Proxy operations.
//
// Copyright 2017 Google LLC
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
// last saved: <2018-December-05 18:08:24>

/* global describe, faker, it, path, before */

//var path = require('path');

describe('Proxy', function() {
  const common = require('./common'),
        fs = require('fs'),
        resourceDir = "./test/resources",
        dateVal = new Date().valueOf(),
        namePrefix = 'apigee-edge-js-test-' + dateVal;

  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  common.connectEdge(function(edgeOrg){

    describe('import-from-zip', function() {
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
        this.timeout(65000);
        var numDone = 0;
        let fn = (p, zip) =>
          p.then( () => edgeOrg.proxies.importFromZip({name: namePrefix + '-fromzip-' + faker.random.alphaNumeric(12), zipArchive:zip}) );
        return zipFileList
          .reduce(fn, Promise.resolve());
      });

      it('should import proxy zips via the simple method', () => {
        this.timeout(65000);
        let fn = (p, zip) =>
          p.then( () => edgeOrg.proxies.import({name: namePrefix + '-fromzip-' + faker.random.alphaNumeric(12), source:zip}));

        return zipFileList.reduce(fn, Promise.resolve());
      });

      it('should delete test proxies previously imported into this org', function(done){
        this.timeout(25000);
        var numDone = 0, L = 0;
        var tick = function() { if (++numDone >= L) { done(); } };
        edgeOrg.proxies.get({}, function(e, proxies){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(proxies.length, 1, "length of proxy list");
          L = proxies.length;
          proxies.forEach(function(proxy) {
            if (proxy.startsWith(namePrefix +'-fromzip-')) {
              edgeOrg.proxies.del({name:proxy}, function(e, proxies){
                if (e) { console.log('error %s', JSON.stringify(proxies, null, 2)); }
                assert.isNull(e, "error deleting proxy: " + JSON.stringify(e));
                tick();
              });
            }
            else {
              tick();
            }
          });
        });
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

      it('should delete test proxies previously imported into this org', function(done){
        this.timeout(25000);
        var numDone = 0, L = 0;
        var tick = function() { if (++numDone >= L) { done(); } };
        edgeOrg.proxies.get({}, function(e, proxies){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(proxies.length, 1, "length of proxy list");
          L = proxies.length;
          proxies.forEach(function(proxy) {
            if (proxy.startsWith(namePrefix + '-fromdir-')) {
              edgeOrg.proxies.del({name:proxy}, function(e, proxies){
                if (e) { console.log('error %s', JSON.stringify(proxies, null, 2)); }
                assert.isNull(e, "error deleting proxy: " + JSON.stringify(e));
                tick();
              });
            }
            else {
              tick();
            }
          });
        });
      });

    });

    describe('get', function() {
      var proxyList;
      before(function(done){
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
        assert.isTrue(proxyList && proxyList.length>0);
        let fn = (item, ix, list) =>
          edgeOrg.proxies.get({name:item}) /* = proxyList[ix] */
          .then( (result) => assert.equal(result.name, item));
        common.selectNRandom(proxyList, 6, fn, done);
      });

      it('should export a few proxies', function(done){
        assert.isTrue(proxyList && proxyList.length>0);
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
        assert.isTrue(proxyList && proxyList.length>0);
        function fn(item, ix, list){
          return edgeOrg.proxies.getRevisions({name:item})
            .then( (result) => {
              assert.isTrue(Array.isArray(result), "revisions");
              assert.isAbove(result.length, 0, "revisions");
            });
        }
        common.selectNRandom(proxyList, 7, fn, done);
      });

      it('should get the policies for revisions of a few proxies', function(done) {
        assert.isTrue(proxyList && proxyList.length>0);
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
        assert.isTrue(proxyList && proxyList.length>0);
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

      it('should get the deployments for a few proxies', function(done) {
        assert.isTrue(proxyList && proxyList.length>0);
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

      it('should get the deployments for specific revisions of a few proxies', function(done) {
        assert.isTrue(proxyList && proxyList.length>0);
        function fn(item) {
          return edgeOrg.proxies.getRevisions({name:item})
            .then( (revisions) => {
              let revision = revisions[Math.floor(Math.random() * revisions.length)];
              return edgeOrg.proxies.getDeployments({name:item, revision})
                // .then( (result) => {
                //   console.log(JSON.stringify(result));
                //   return result;
                // })
                .then( ($) => {
                  assert.isTrue(Array.isArray($.environment), "deployments");
                  assert.equal(item, $.aPIProxy, "proxy name");
                  assert.equal(revision, $.name, "revision");
                });
            });
        }
        common.selectNRandom(proxyList, 7, fn, done);
      });

    });



  });


});
