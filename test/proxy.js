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
// last saved: <2018-December-05 17:22:24>

/* global describe, faker, it, path, before */

//var path = require('path');

describe('Proxy', function() {
  const common = require('./common'),
        fs = require('fs'),
        resourceDir = "./test/resources",
        dateVal = new Date().valueOf(),
        contrivedNamePrefix = 'apigee-edge-js-test-' + dateVal;

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

      it('should import proxy zips into an org', function(done){
        this.timeout(65000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-fromzip-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.importFromZip({name:contrivedName, zipArchive:zip}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) {
              done();
            }
          });
        });
      });

      it('should import proxy zips via the simple method', function(done){
        this.timeout(65000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-fromzip-simple-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.import({name:contrivedName, source:zip}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) {
              done();
            }
          });
        });
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
            if (proxy.startsWith(contrivedNamePrefix +'-fromzip-')) {
              edgeOrg.proxies.del({name:proxy}, function(e, proxies){
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

      it('should import exploded proxy dirs into an org', function(done){
        this.timeout(65000);
        var numDone = 0;
        apiproxyBundleDirList.forEach(function(dir){
          //console.log('dir: %s', dir);
          var contrivedName = contrivedNamePrefix + '-fromdir-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.importFromDir({name:contrivedName, source:dir}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing dir: " + JSON.stringify(e));
            numDone++;
            if (numDone >= apiproxyBundleDirList.length) { done(); }
          });
        });
      });

      it('should import exploded proxy dirs via the simple method', function(done){
        var numDone = 0;
        apiproxyBundleDirList.forEach(function(dir){
          //console.log('dir: %s', dir);
          var contrivedName = contrivedNamePrefix + '-fromdir-simple-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.import({name:contrivedName, source:dir}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing dir: " + JSON.stringify(e));
            numDone++;
            if (numDone == apiproxyBundleDirList.length) { done(); }
          });
        });
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
            if (proxy.startsWith(contrivedNamePrefix + '-fromdir-')) {
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


    function selectNRandom(list, N, promiseFn, done) {
      function reducer(promise, num) {
        let ix = Math.floor(Math.random() * list.length);
        return promise.then( () => promiseFn(list[ix], ix, list))
          .then( () => (1+num >= N) ? done(): {});
      }
      Array.from(Array(N).keys()).reduce(reducer, Promise.resolve());
    }

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
        selectNRandom(proxyList, 6, fn, done);
      });

      it('should export a few proxies', function(done){
        assert.isTrue(proxyList && proxyList.length>0);
        let fn = (item, ix, list) =>
          edgeOrg.proxies.export({name:item}) /* proxyList[ix] */
            .then( (result) => assert.isTrue(result.filename.startsWith('apiproxy-'), "file name") );

        selectNRandom(proxyList, 4, fn, done);
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
        selectNRandom(proxyList, 7, fn, done);
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
        selectNRandom(proxyList, 7, fn, done);
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
        selectNRandom(proxyList, 7, fn, done);
      });

    });



  });


});
